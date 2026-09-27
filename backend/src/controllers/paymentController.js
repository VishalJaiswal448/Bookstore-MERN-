import mongoose from 'mongoose';
import Book from '../models/Book.js';
import Order from '../models/Order.js';
import { verifyRazorpaySignature, verifyWebhookSignature } from '../utils/security.js';

const RAZORPAY_BASE = 'https://api.razorpay.com/v1';

function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function shippingCost(subtotal) {
  return subtotal >= 499 || subtotal === 0 ? 0 : 60;
}

function cleanShipping(input = {}) {
  const data = {
    name: String(input.name || "")
      .trim()
      .slice(0, 80),

    phone: String(input.phone || "")
      .trim()
      .slice(0, 20),

    address: String(input.address || "")
      .trim()
      .slice(0, 300),

    city: String(input.city || "")
      .trim()
      .slice(0, 80),

    pincode: String(input.pincode || "")
      .trim()
      .slice(0, 10),
  };

  if (
    !data.name ||
    !data.phone ||
    !data.address ||
    !data.city ||
    !/^\d{6}$/.test(data.pincode)
  ) {
    throw new Error(
      "Please enter valid delivery details and a 6-digit pincode."
    );
  }

  if (
    !/^[6-9]\d{9}$/.test(
      data.phone.replace(/\D/g, "")
    )
  ) {
    throw new Error(
      "Please enter a valid 10-digit Indian mobile number."
    );
  }

  data.phone = data.phone.replace(/\D/g, "");

  return data;
}

async function razorpayRequest(path, options = {}) {
  if (!razorpayConfigured()) {
    throw new Error(
      "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend .env."
    );
  }

  const credentials = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString("base64");

  const response = await fetch(
    `${RAZORPAY_BASE}${path}`,
    {
      ...options,
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    }
  );

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        "Razorpay authentication failed. Check that RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET belong to the same Razorpay Test/Live mode."
      );
    }

    throw new Error(
      data?.error?.description ||
        "Razorpay request failed."
    );
  }

  return data;
}

function normalizeItems(rawItems) {
  if (
    !Array.isArray(rawItems) ||
    rawItems.length === 0 ||
    rawItems.length > 40
  ) {
    throw new Error(
      "Your cart is empty or too large."
    );
  }

  const quantities = new Map();

  for (const item of rawItems) {
    if (
      !mongoose.isValidObjectId(item?.book)
    ) {
      throw new Error(
        "Invalid book in cart."
      );
    }

    const quantity = Number(
      item.quantity
    );

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 20
    ) {
      throw new Error(
        "Each quantity must be between 1 and 20."
      );
    }

    quantities.set(
      String(item.book),
      (quantities.get(String(item.book)) || 0) +
        quantity
    );
  }

  return [...quantities.entries()].map(
    ([book, quantity]) => ({
      book,
      quantity,
    })
  );
}

async function buildOrderData(
  userId,
  rawItems,
  rawShipping
) {
  const requested = normalizeItems(
    rawItems
  );

  const ids = requested.map(
    (x) => x.book
  );

  const books = await Book.find({
    _id: { $in: ids },
  }).lean();

  const byId = new Map(
    books.map((book) => [
      String(book._id),
      book,
    ])
  );

  const normalized = [];
  let subtotal = 0;

  for (const line of requested) {
    const book = byId.get(line.book);

    if (!book) {
      throw new Error(
        "A book in your cart no longer exists."
      );
    }

    if (book.stock < line.quantity) {
      throw new Error(
        `${book.title} has only ${book.stock} copies left.`
      );
    }

    normalized.push({
      book: book._id,
      title: book.title,
      price: book.price,
      quantity: line.quantity,
      cover: book.cover,
      seller: book.seller,
    });

    subtotal +=
      book.price * line.quantity;
  }

  const shipping = cleanShipping(
    rawShipping
  );

  const delivery = shippingCost(
    subtotal
  );

  const total = subtotal + delivery;

  return {
    customer: userId,
    items: normalized,
    subtotal,
    delivery,
    total,
    shipping,
  };
}

async function restoreStock(changes) {
  for (const change of changes) {
    await Book.updateOne(
      { _id: change.id },
      {
        $inc: {
          stock: change.quantity,
          sold: -change.quantity,
        },
      }
    );
  }
}

async function fulfillOrder(
  order,
  paymentId
) {
  if (order.paymentStatus === "paid") {
    return order;
  }

  const claimed =
    await Order.findOneAndUpdate(
      {
        _id: order._id,
        paymentStatus: "created",
      },
      {
        $set: {
          paymentStatus: "processing",
        },
      },
      {
        new: true,
      }
    );

  if (!claimed) {
    const latest = await Order.findById(
      order._id
    );

    if (
      latest?.paymentStatus === "paid"
    ) {
      return latest;
    }

    throw new Error(
      "This payment is already being confirmed. Refresh your orders shortly."
    );
  }

  const changes = [];

  try {
    for (const item of claimed.items) {
      const changed =
        await Book.findOneAndUpdate(
          {
            _id: item.book,
            stock: {
              $gte: item.quantity,
            },
          },
          {
            $inc: {
              stock: -item.quantity,
              sold: item.quantity,
            },
          },
          {
            new: true,
          }
        );

      if (!changed) {
        throw new Error(
          `${item.title} is no longer available in the requested quantity.`
        );
      }

      changes.push({
        id: item.book,
        quantity: item.quantity,
      });
    }

    claimed.paymentStatus = "paid";
    claimed.status = "Placed";
    claimed.razorpayPaymentId =
      paymentId;
    claimed.paidAt = new Date();

    await claimed.save();

    return claimed;
  } catch (err) {
    if (changes.length) {
      await restoreStock(changes);
    }

    await Order.updateOne(
      {
        _id: claimed._id,
        paymentStatus: "processing",
      },
      {
        $set: {
          paymentStatus: "failed",
          status: "Cancelled",
        },
      }
    );

    throw err;
  }
}

export async function createRazorpayOrder(
  req,
  res
) {
  try {
    const orderData =
      await buildOrderData(
        req.user._id,
        req.body?.items,
        req.body?.shipping
      );

    const order =
      await Order.create({
        ...orderData,
        status: "Payment Pending",
        paymentStatus: "created",
      });

    try {
      const rp =
        await razorpayRequest(
          "/orders",
          {
            method: "POST",
            body: JSON.stringify({
              amount: Math.round(
                order.total * 100
              ),
              currency: "INR",
              receipt: String(order._id),
              notes: {
                customerId: String(
                  req.user._id
                ),
              },
            }),
          }
        );

      order.razorpayOrderId = rp.id;

      await order.save();

      return res.status(201).json({
        keyId:
          process.env.RAZORPAY_KEY_ID,
        orderId: rp.id,
        amount: rp.amount,
        currency: rp.currency,
        localOrderId: order._id,
        total: order.total,
        subtotal: order.subtotal,
        delivery: order.delivery,
      });
    } catch (err) {
      await Order.deleteOne({
        _id: order._id,
      });

      throw err;
    }
  } catch (err) {
    res.status(400).json({
      message:
        err.message ||
        "Could not start payment.",
    });
  }
}

export async function verifyRazorpayPayment(
  req,
  res
) {
  const {
    razorpay_order_id:
      razorpayOrderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = req.body || {};

  if (
    !razorpayOrderId ||
    !paymentId ||
    !signature
  ) {
    return res.status(400).json({
      message:
        "Incomplete payment verification data.",
    });
  }

  if (
    !verifyRazorpaySignature(
      razorpayOrderId,
      paymentId,
      signature,
      process.env.RAZORPAY_KEY_SECRET || ""
    )
  ) {
    return res.status(400).json({
      message:
        "Payment signature verification failed.",
    });
  }

  try {
    const order =
      await Order.findOne({
        razorpayOrderId,
        customer: req.user._id,
      });

    if (!order) {
      return res.status(404).json({
        message:
          "Payment order not found.",
      });
    }

    const payment =
      await razorpayRequest(
        `/payments/${encodeURIComponent(
          paymentId
        )}`
      );

    if (
      String(payment.order_id) !==
      String(razorpayOrderId)
    ) {
      return res.status(400).json({
        message:
          "Payment order mismatch.",
      });
    }

    if (
      Number(payment.amount) !==
        Math.round(order.total * 100) ||
      payment.currency !== "INR"
    ) {
      return res.status(400).json({
        message:
          "Payment amount mismatch.",
      });
    }

    if (
      payment.status !== "captured"
    ) {
      return res.status(400).json({
        message: `Payment is currently ${payment.status}.`,
      });
    }

    const fulfilled =
      await fulfillOrder(
        order,
        paymentId
      );

    res.json({
      ok: true,
      order: fulfilled,
    });
  } catch (err) {
    res.status(400).json({
      message:
        err.message ||
        "Could not verify payment.",
    });
  }
}

export async function razorpayWebhook(
  req,
  res
) {
  const signature =
    req.headers[
      "x-razorpay-signature"
    ];

  const webhookSecret =
    process.env.RAZORPAY_WEBHOOK_SECRET;

  if (
    !webhookSecret ||
    !signature ||
    !Buffer.isBuffer(req.body) ||
    !verifyWebhookSignature(
      req.body,
      signature,
      webhookSecret
    )
  ) {
    return res.status(400).json({
      message:
        "Invalid webhook signature.",
    });
  }

  let payload;

  try {
    payload = JSON.parse(
      req.body.toString("utf8")
    );
  } catch {
    return res.status(400).json({
      message:
        "Invalid webhook payload.",
    });
  }

  try {
    const event = payload.event;

    if (
      event === "payment.captured" ||
      event === "order.paid"
    ) {
      const entity =
        payload?.payload?.payment?.entity;

      const orderId =
        entity?.order_id ||
        payload?.payload?.order?.entity
          ?.id;

      const paymentId =
        entity?.id || null;

      if (orderId) {
        const order =
          await Order.findOne({
            razorpayOrderId: orderId,
          });

        if (
          order &&
          order.paymentStatus !== "paid"
        ) {
          await fulfillOrder(
            order,
            paymentId
          );
        }
      }
    } else if (
      event === "payment.failed"
    ) {
      const entity =
        payload?.payload?.payment?.entity;

      if (entity?.order_id) {
        await Order.updateOne(
          {
            razorpayOrderId:
              entity.order_id,
            paymentStatus: {
              $in: [
                "created",
                "processing",
              ],
            },
          },
          {
            $set: {
              paymentStatus: "failed",
              status: "Cancelled",
            },
          }
        );
      }
    }

    res.json({
      received: true,
    });
  } catch (err) {
    console.error(
      "Razorpay webhook error:",
      err
    );

    res.status(500).json({
      message:
        "Webhook processing failed.",
    });
  }
}