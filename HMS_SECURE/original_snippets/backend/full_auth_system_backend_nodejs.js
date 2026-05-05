// Full Authentication System
// File: backend/routes/auth.js
// Features:
// - Register
// - Login
// - Forgot Password
// - Reset Password
// - JWT Authentication
// - Role-Based Access
// - Password Hashing
// - Protected Route Middleware

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'enterprise_hms',
});

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || 'supersecretkey',
    { expiresIn: '1d' }
  );
};

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password, role, phone } = req.body;

    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ message: 'All required fields are mandatory' });
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, result) => {
      if (err) return res.status(500).json(err);

      if (result.length > 0) {
        return res.status(409).json({ message: 'Email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const sql = `
        INSERT INTO users (full_name, email, password, role, phone, status)
        VALUES (?, ?, ?, ?, ?, 'active')
      `;

      db.query(
        sql,
        [full_name, email, hashedPassword, role, phone],
        (insertErr, insertResult) => {
          if (insertErr) return res.status(500).json(insertErr);

          res.status(201).json({
            message: 'User registered successfully',
            userId: insertResult.insertId,
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// LOGIN
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, result) => {
      if (err) return res.status(500).json(err);

      if (result.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const user = result[0];
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid password' });
      }

      const token = generateToken(user);

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
        },
      });
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// FORGOT PASSWORD
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    // In production: save token + expiry in DB and send via email
    res.json({
      message: 'Password reset token generated',
      resetToken,
    });
  });
});

// RESET PASSWORD
router.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ message: 'Email and new password are required' });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  db.query(
    'UPDATE users SET password = ? WHERE email = ?',
    [hashedPassword, email],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json({ message: 'Password reset successful' });
    }
  );
});

// VERIFY TOKEN MIDDLEWARE
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized access' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// ROLE-BASED ACCESS MIDDLEWARE
const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    next();
  };
};

// PROTECTED TEST ROUTE
router.get(
  '/admin-only',
  verifyToken,
  allowRoles('super_admin', 'admin'),
  (req, res) => {
    res.json({ message: 'Welcome Admin Panel' });
  }
);

module.exports = router;
