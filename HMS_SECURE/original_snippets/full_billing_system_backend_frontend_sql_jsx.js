// FULL BILLING SYSTEM (Enterprise HMS)
// Includes:
// - Create Invoice
// - Consultation Billing
// - Room Charges
// - ICU Charges
// - Lab Billing
// - Medicine Charges
// - Discount + GST
// - Partial Payments
// - Payment Status
// - Invoice Fetch API
// - Billing Summary API

// =====================================================
// BACKEND: routes/billing.js
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

// CREATE BILL
router.post('/create', (req, res) => {
  const {
    patient_id,
    consultation_fee,
    room_charges,
    icu_charges,
    lab_charges,
    medicine_charges,
    nursing_charges,
    ambulance_charges,
    discount,
    gst_percent,
    payment_method,
    paid_amount,
  } = req.body;

  const subtotal =
    Number(consultation_fee || 0) +
    Number(room_charges || 0) +
    Number(icu_charges || 0) +
    Number(lab_charges || 0) +
    Number(medicine_charges || 0) +
    Number(nursing_charges || 0) +
    Number(ambulance_charges || 0);

  const gst_amount = (subtotal * Number(gst_percent || 0)) / 100;
  const total_amount = subtotal + gst_amount - Number(discount || 0);

  let payment_status = 'pending';

  if (Number(paid_amount) >= total_amount) {
    payment_status = 'paid';
  } else if (Number(paid_amount) > 0) {
    payment_status = 'partial';
  }

  const invoice_number = `INV-${Date.now()}`;

  const sql = `
    INSERT INTO billing
    (
      invoice_number,
      patient_id,
      total_amount,
      paid_amount,
      payment_status,
      payment_method
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      invoice_number,
      patient_id,
      total_amount,
      paid_amount,
      payment_status,
      payment_method,
    ],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json({
        message: 'Invoice created successfully',
        invoice_number,
        total_amount,
        payment_status,
      });
    }
  );
});

// GET ALL INVOICES
router.get('/all', (req, res) => {
  db.query(
    `SELECT b.*, p.full_name
     FROM billing b
     JOIN patients p ON b.patient_id = p.id
     ORDER BY b.id DESC`,
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

// BILLING SUMMARY
router.get('/summary', (req, res) => {
  db.query(
    `SELECT 
      COUNT(*) as totalInvoices,
      SUM(total_amount) as totalRevenue,
      SUM(paid_amount) as totalCollected
     FROM billing`,
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result[0]);
    }
  );
});

module.exports = router;

// =====================================================
// FRONTEND: src/app/billing/page.jsx
// =====================================================

'use client';

import { useState } from 'react';
import axios from 'axios';

export function BillingPage() {
  const [form, setForm] = useState({
    patient_id: '',
    consultation_fee: '',
    room_charges: '',
    icu_charges: '',
    lab_charges: '',
    medicine_charges: '',
    nursing_charges: '',
    ambulance_charges: '',
    discount: '',
    gst_percent: '18',
    payment_method: 'cash',
    paid_amount: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(
        'http://localhost:8081/api/billing/create',
        form
      );

      alert(`Invoice Created: ${res.data.invoice_number}`);
    } catch (error) {
      console.log(error);
      alert('Billing failed');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create Hospital Invoice</h1>

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
          Generate Invoice
        </button>
      </form>
    </div>
  );
}

// =====================================================
// DATABASE ADDITIONAL NOTE
// Existing billing table from ZIP 3 is used.
// No additional SQL required if billing table already imported.
// =====================================================
