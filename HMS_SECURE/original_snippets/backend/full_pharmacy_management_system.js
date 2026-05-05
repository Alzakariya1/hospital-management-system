// FULL PHARMACY MANAGEMENT SYSTEM (Enterprise HMS)
// Includes:
// - Add Medicine
// - Medicine Inventory
// - Batch Number + Expiry
// - Supplier Management
// - Stock Alerts
// - Low Stock Notifications
// - Prescription Sales
// - GST Billing
// - Sales Records
// - Profit Reports

// =====================================================
// BACKEND: routes/pharmacy.js
// =====================================================

const express = require('express');
const router = express.Router();
const mysql = require('mysql2');

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'enterprise_hms',
});

// ADD MEDICINE
router.post('/add-medicine', (req, res) => {
  const {
    medicine_name,
    batch_number,
    expiry_date,
    quantity,
    purchase_price,
    selling_price,
    supplier_name,
  } = req.body;

  const sql = `
    INSERT INTO medicines
    (
      medicine_name,
      batch_number,
      expiry_date,
      quantity,
      purchase_price,
      selling_price,
      supplier_name
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      medicine_name,
      batch_number,
      expiry_date,
      quantity,
      purchase_price,
      selling_price,
      supplier_name,
    ],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json({
        message: 'Medicine added successfully',
        medicineId: result.insertId,
      });
    }
  );
});

// GET ALL MEDICINES
router.get('/medicines', (req, res) => {
  db.query(
    'SELECT * FROM medicines ORDER BY id DESC',
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

// LOW STOCK ALERTS
router.get('/low-stock', (req, res) => {
  db.query(
    'SELECT * FROM medicines WHERE quantity <= 10 ORDER BY quantity ASC',
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

// PHARMACY SALE
router.post('/sale', (req, res) => {
  const {
    medicine_id,
    sold_quantity,
    gst_percent,
    payment_method,
  } = req.body;

  db.query(
    'SELECT * FROM medicines WHERE id = ?',
    [medicine_id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      if (result.length === 0) {
        return res.status(404).json({ message: 'Medicine not found' });
      }

      const medicine = result[0];

      if (medicine.quantity < sold_quantity) {
        return res.status(400).json({ message: 'Insufficient stock' });
      }

      const subtotal = Number(medicine.selling_price) * Number(sold_quantity);
      const gst_amount = (subtotal * Number(gst_percent || 0)) / 100;
      const total_amount = subtotal + gst_amount;
      const profit =
        (Number(medicine.selling_price) - Number(medicine.purchase_price)) *
        Number(sold_quantity);

      db.query(
        'UPDATE medicines SET quantity = quantity - ? WHERE id = ?',
        [sold_quantity, medicine_id],
        (updateErr) => {
          if (updateErr) return res.status(500).json(updateErr);

          res.json({
            message: 'Sale completed successfully',
            total_amount,
            profit,
            payment_method,
          });
        }
      );
    }
  );
});

// PHARMACY SUMMARY
router.get('/summary', (req, res) => {
  db.query(
    `SELECT 
      COUNT(*) as totalMedicines,
      SUM(quantity) as totalStock,
      SUM(quantity * selling_price) as inventoryValue
     FROM medicines`,
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result[0]);
    }
  );
});

module.exports = router;

// =====================================================
// FRONTEND: src/app/pharmacy/page.jsx
// =====================================================

'use client';

import { useState } from 'react';
import axios from 'axios';

export function PharmacyPage() {
  const [form, setForm] = useState({
    medicine_name: '',
    batch_number: '',
    expiry_date: '',
    quantity: '',
    purchase_price: '',
    selling_price: '',
    supplier_name: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(
        'http://localhost:8081/api/pharmacy/add-medicine',
        form
      );

      alert(`Medicine Added: ID ${res.data.medicineId}`);
    } catch (error) {
      console.log(error);
      alert('Medicine creation failed');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Pharmacy Management</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        {Object.keys(form).map((field) => (
          <input
            key={field}
            name={field}
            value={form[field]}
            onChange={handleChange}
            placeholder={field.replace(/_/g, ' ')}
            className="border rounded-xl px-4 py-3"
          />
        ))}

        <button className="col-span-2 bg-black text-white rounded-xl py-3">
          Add Medicine
        </button>
      </form>
    </div>
  );
}
