import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Book from '../models/Book.js';
import Category from '../models/Category.js';

await connectDB();

const adminEmail = String(process.env.ADMIN_EMAIL || 'admin@happy.local').trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || 'happy12345';
const sellerEmail = String(process.env.SELLER_EMAIL || 'seller@happy.local').trim().toLowerCase();
const sellerPassword = process.env.SELLER_PASSWORD || 'happy12345';

const adminHash = await bcrypt.hash(adminPassword, 12);
const sellerHash = await bcrypt.hash(sellerPassword, 12);

const admin = await User.findOneAndUpdate(
  { email: adminEmail },
  { $set: { name: 'Admin', email: adminEmail, password: adminHash, role: 'admin', isActive: true } },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);
const seller = await User.findOneAndUpdate(
  { email: sellerEmail },
  { $set: { name: 'Readers Hub', email: sellerEmail, password: sellerHash, role: 'seller', isActive: true } },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

const categoryNames = ['Fiction', 'Programming', 'Finance', 'Self Help', 'Biography', 'Comics'];
for (const name of categoryNames) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  await Category.findOneAndUpdate({ slug }, { $set: { name, slug, isActive: true, createdBy: admin._id } }, { upsert: true, new: true, setDefaultsOnInsert: true });
}

if (await Book.countDocuments() === 0) {
  await Book.insertMany([
    { title: 'Atomic Habits', author: 'James Clear', category: 'Self Help', price: 399, mrp: 599, stock: 24, cover: 'https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg', rating: 4.8, sold: 120, seller: seller._id },
    { title: 'The Psychology of Money', author: 'Morgan Housel', category: 'Finance', price: 349, mrp: 499, stock: 16, cover: 'https://covers.openlibrary.org/b/isbn/9780857197689-L.jpg', rating: 4.7, sold: 86, seller: seller._id },
    { title: 'Ikigai', author: 'Héctor García', category: 'Self Help', price: 299, mrp: 450, stock: 30, cover: 'https://covers.openlibrary.org/b/isbn/9780143452742-L.jpg', rating: 4.4, sold: 72, seller: seller._id },
    { title: 'The Alchemist', author: 'Paulo Coelho', category: 'Fiction', price: 249, mrp: 399, stock: 20, cover: 'https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg', rating: 4.6, sold: 150, seller: seller._id },
    { title: 'Clean Code', author: 'Robert C. Martin', category: 'Programming', price: 699, mrp: 999, stock: 8, cover: 'https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg', rating: 4.7, sold: 41, seller: seller._id },
    { title: 'Rich Dad Poor Dad', author: 'Robert T. Kiyosaki', category: 'Finance', price: 329, mrp: 499, stock: 14, cover: 'https://covers.openlibrary.org/b/isbn/9781612681139-L.jpg', rating: 4.5, sold: 98, seller: seller._id }
  ]);
}

console.log('Seed/repair complete.');
console.log(`Admin: ${adminEmail} / ${adminPassword}`);
console.log(`Seller: ${sellerEmail} / ${sellerPassword}`);
process.exit(0);
