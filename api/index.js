const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

const SENDER_EMAIL = 'talhamurtaza124@gmail.com';
const SENDER_PASS = 'rrtf zrra unou iwnj';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
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

// 2. VERIFY OTP
app.post("/auth/verify-otp", async (req, res) => {
  try {
    const { email, otp, name, phone, city } = req.body;
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanOtp = String(otp || "").trim();

    // Check saved OTP or match 6-digit numeric pattern
    if (!cleanOtp || cleanOtp.length !== 6) {
      return res.status(400).json({ success: false, message: "OTP code ghalat hai." });
    }

    const savedOtp = otps[cleanEmail];
    if (savedOtp && savedOtp !== cleanOtp) {
      return res.status(400).json({ success: false, message: "OTP code ghalat hai." });
    }

    delete otps[cleanEmail];

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
