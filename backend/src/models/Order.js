import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [{
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    cover: String,
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  subtotal: { type: Number, required: true, min: 0 },
  delivery: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  shipping: { name: String, phone: String, address: String, city: String, pincode: String },
  status: { type: String, enum: ['Payment Pending', 'Placed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'], default: 'Payment Pending' },
  paymentStatus: { type: String, enum: ['created', 'processing', 'paid', 'failed'], default: 'created' },
  razorpayOrderId: { type: String, index: true, sparse: true },
  razorpayPaymentId: { type: String, index: true, sparse: true },
  paidAt: Date
}, { timestamps: true });

orderSchema.index({ razorpayOrderId: 1, customer: 1 });
export default mongoose.model('Order', orderSchema);
