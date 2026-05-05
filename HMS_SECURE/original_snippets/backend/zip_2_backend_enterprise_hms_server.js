// ZIP 2 - Enterprise HMS Backend
// File: backend/server.js
// Node.js + Express.js + MySQL + JWT + RBAC

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const helmet = require('helmet');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(morgan('dev'));

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'enterprise_hms',
  waitForConnections: true,
  connectionLimit: 10,
});

app.get('/', (req, res) => {
  res.json({ message: 'Enterprise HMS Backend Running' });
});

// JWT Middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    req.user = verified;
    next();
  } catch (error) {
    return res.status(400).json({ message: 'Invalid token' });
  }
};

// Role Middleware
const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    next();
  };
};

// Login API
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  const sql = 'SELECT * FROM users WHERE email = ?';

  db.query(sql, [email], async (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET || 'secretkey',
      { expiresIn: '1d' }
    );

    res.json({ token, user });
  });
});

// Patients API
app.get('/api/patients', verifyToken, (req, res) => {
  db.query('SELECT * FROM patients ORDER BY id DESC', (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

app.post('/api/patients', verifyToken, allowRoles('super_admin', 'admin', 'receptionist'), (req, res) => {
  const data = req.body;

  const sql = `
    INSERT INTO patients
    (full_name, phone, email, gender, blood_group)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [data.full_name, data.phone, data.email, data.gender, data.blood_group],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ message: 'Patient created successfully', result });
    }
  );
});

// Doctors API
app.get('/api/doctors', verifyToken, (req, res) => {
  db.query('SELECT * FROM doctors ORDER BY id DESC', (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// Dashboard API
app.get('/api/dashboard/stats', verifyToken, (req, res) => {
  res.json({
    totalPatients: 12540,
    totalDoctors: 245,
    totalAppointments: 486,
    availableBeds: 128,
    dailyRevenue: 485000,
  });
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
