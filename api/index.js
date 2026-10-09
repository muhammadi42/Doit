const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = path.join(__dirname, 'database.json');

// Helper functions for persistent JSON database
const readDB = () => {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = { users: [], orders: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
};

const writeDB = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

const SENDER_EMAIL = 'Mtalhamurtaza42@gmail.com'; 
const SENDER_PASS = 'mjcqzgjlofrwwjtk';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: SENDER_EMAIL, pass: SENDER_PASS }
});

global.pendingOtps = global.pendingOtps || {};

// 1. SIGNUP & EMAIL OTP
app.post('/auth/signup', async (req, res) => {
  const { name, email, phone, password, role, city } = req.body;
  if (!name || !email || !phone || !city || !role) {
    return res.status(400).json({ success: false, message: 'All fields required.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  pendingOtps[email] = { otp, userData: { name, email, phone, password, role, city } };

  try {
    await transporter.sendMail({
      from: `"Marketplace App" <${SENDER_EMAIL}>`,
      to: email,
      subject: 'Email Verification OTP Code',
      text: `Hello ${name},\n\nAap ka OTP code yeh hai:\n\n${otp}\n\nAccount verify karne ke liye use karein.`
    });
    res.json({ success: true, message: `OTP sent to ${email}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Email dispatch error.' });
  }
});

// 2. VERIFY OTP & SAVE USER PERMANENTLY
app.post('/auth/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const record = pendingOtps[email];

  if (!record || record.otp !== otp) {
    return res.status(400).json({ success: false, message: 'Invalid OTP.' });
  }

  const db = readDB();
  const newUser = { id: Date.now(), ...record.userData, isVerified: true };
  
  // Save or update user
  const userIdx = db.users.findIndex(u => u.email === email);
  if (userIdx > -1) {
    db.users[userIdx] = newUser;
  } else {
    db.users.push(newUser);
  }
  writeDB(db);
  delete pendingOtps[email];

  res.json({ success: true, message: 'Account verified & saved!', user: newUser });
});

// 3. CREATE ORDER & SAVE PERMANENTLY
app.post('/orders/create', async (req, res) => {
  const { serviceTitle, vendorName, customerName, customerPhone, customerEmail, city } = req.body;
  const orderId = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
  const createdAt = new Date().toISOString();

  const newOrder = {
    id: orderId,
    serviceTitle,
    city,
    vendorName,
    customerName,
    customerPhone,
    customerEmail,
    status: 'Pending Admin Dispatch',
    commissionFee: 250,
    createdAt
  };

  const db = readDB();
  db.orders.unshift(newOrder);
  writeDB(db);

  try {
    await transporter.sendMail({
      from: `"Marketplace App" <${SENDER_EMAIL}>`,
      to: customerEmail,
      subject: `Order Confirmed: ${orderId}`,
      text: `Assalam-o-Alaikum ${customerName},\n\nAap ka order "${serviceTitle}" record ho chuka hai.`
    });
  } catch (e) {}

  res.json({ success: true, orderId });
});

// 4. GET ALL ORDERS FOR ADMIN
app.get('/orders/admin', (req, res) => {
  const db = readDB();
  res.json({ success: true, orders: db.orders });
});

// 5. DISPATCH ORDER & COLLECT CHARGES ACTION
app.post('/orders/dispatch', (req, res) => {
  const { orderId } = req.body;
  const db = readDB();
  const order = db.orders.find(o => o.id === orderId);
  if (order) {
    order.status = 'Dispatched (Fee Collected)';
    writeDB(db);
    return res.json({ success: true, message: 'Lead dispatched and commission recorded.' });
  }
  res.status(404).json({ success: false, message: 'Order not found.' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Backend with File Database running on http://localhost:${PORT}`);
});
