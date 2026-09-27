import mongoose from 'mongoose';
import Order from '../models/Order.js';

export async function myOrders(req, res) {
  const orders = await Order.find({
    customer: req.user._id,
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  res.json(orders);
}

export async function allOrders(req, res) {
  const orders = await Order.find()
    .populate("customer", "name email")
    .sort({ createdAt: -1 })
    .limit(300)
    .lean();

  res.json(orders);
}

export async function updateOrder(req, res) {
  if (
    !mongoose.isValidObjectId(req.params.id)
  ) {
    return res
      .status(404)
      .json({ message: "Order not found" });
  }

  const allowed = [
    "Placed",
    "Packed",
    "Shipped",
    "Delivered",
    "Cancelled",
  ];

  if (!allowed.includes(req.body?.status)) {
    return res.status(400).json({
      message: "Invalid order status.",
    });
  }

  const order = await Order.findById(
    req.params.id
  );

  if (!order) {
    return res
      .status(404)
      .json({ message: "Order not found" });
  }

  if (
    order.paymentStatus !== "paid" &&
    req.body.status !== "Cancelled"
  ) {
    return res.status(400).json({
      message:
        "Only paid orders can move through fulfilment.",
    });
  }

  if (
    order.paymentStatus === "paid" &&
    req.body.status === "Cancelled"
  ) {
    return res.status(400).json({
      message:
        "Paid-order refunds are not automated in BookBazaar. Process the refund in Razorpay before any cancellation workflow.",
    });
  }

  order.status = req.body.status;

  await order.save();

  res.json(order);
}