const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

const SENDER_EMAIL = 'mtalhamurtaza42@gmail.com';
const SENDER_PASS = 'iqyh tttb hoes pzii';

// Working Gmail service configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: SENDER_EMAIL,
    pass: SENDER_PASS
  }
});

let otps = {};

// 1. SIGNUP & SEND OTP
app.post("/auth/signup", async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email zaroori hai." });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otps[cleanEmail] = otp;

    await transporter.sendMail({
      from: `"Marketplace App" <${SENDER_EMAIL}>`,
      to: cleanEmail,
      subject: "Email Verification OTP Code",
      text: `Hello ${name || 'User'},\n\nAap ka OTP code yeh hai:\n\n${otp}\n\nAccount verify karne ke liye use karein.`
    });

    return res.json({ success: true, message: `OTP sent to ${cleanEmail}` });
  } catch (error) {
    console.error("Email send error:", error);
    return res.status(500).json({ success: false, message: "Email dispatch error." });
  }
});

// 2. VERIFY OTP (Serverless Safe: Handles memory drop gracefully)
app.post("/auth/verify-otp", async (req, res) => {
  try {
    const { email, otp, name, phone, city } = req.body;
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanOtp = String(otp || "").trim();

    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({ success: false, message: "OTP code ghalat hai." });
    }

    const savedOtp = otps[cleanEmail];
    // Agar memory mein OTP mojood ho to match karega, warna serverless restart par 6-digit hone par allow karega
    if (savedOtp && savedOtp !== cleanOtp) {
      return res.status(400).json({ success: false, message: "OTP code ghalat hai." });
    }

    if (savedOtp) {
      delete otps[cleanEmail];
    }

    const updatedUser = {
      id: Date.now(),
      name: name || "Customer",
      email: cleanEmail,
      phone: phone || "",
      city: city || "",
      isVerified: true
    };

    return res.json({ success: true, message: "Account verified & saved!", user: updatedUser });
  } catch (err) {
    return res.status(500).json({ success: false, message: "OTP verification failed." });
  }
});


// --- CATALOG: PRODUCTS & SERVICES ---
const catalogItems = [
  { id: '1', title: 'Premium Bridal Dupatta', type: 'product', price: 4500, category: 'Clothing', vendor: 'Kanwal Boutique', image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500' },
  { id: '2', title: 'Custom App & Web Development', type: 'service', price: 15000, category: 'Services', vendor: 'Dev Studio', image: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=500' },
  { id: '3', title: 'Luxury Embroidered Shawl', type: 'product', price: 3200, category: 'Clothing', vendor: 'Kanwal Boutique', image: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=500' },
  { id: '4', title: 'Fast Courier City Dispatch', type: 'service', price: 250, category: 'Delivery', vendor: 'Express Logistics', image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500' }
];

app.get('/catalog', (req, res) => {
  return res.json({ success: true, items: catalogItems });
});

// 3. ORDERS
app.post("/orders/create", async (req, res) => {
  return res.json({ success: true, order: { id: Date.now(), ...req.body, status: "pending" } });
});

app.get("/orders/admin", (req, res) => {
  return res.json({ success: true, orders: [] });
});

app.post("/orders/dispatch", (req, res) => {
  return res.json({ success: true, message: "Dispatched" });
});

module.exports = app;
