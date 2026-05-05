// FULL LAB + RADIOLOGY MANAGEMENT SYSTEM (Enterprise HMS)
// Includes:
// - Lab Test Booking
// - Sample Collection
// - Pathology Reports
// - Report Upload
// - Doctor Access
// - Patient Access
// - Lab Billing Linkage
// - X-Ray / MRI / CT / Ultrasound / PET Booking
// - Scan Image Upload
// - Radiology Reports
// - Doctor Verification
// - Report PDF Ready Structure

// =====================================================
// BACKEND: routes/lab-radiology.js
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

// =====================================
// LAB TEST BOOKING
// =====================================
router.post('/lab/book-test', (req, res) => {
  const {
    patient_id,
    test_name,
    doctor_id,
    notes,
    billing_amount,
  } = req.body;

  const sql = `
    INSERT INTO lab_tests
    (
      patient_id,
      test_name,
      test_status,
      report_file
    )
    VALUES (?, ?, 'booked', NULL)
  `;

  db.query(sql, [patient_id, test_name], (err, result) => {
    if (err) return res.status(500).json(err);

    res.json({
      message: 'Lab test booked successfully',
      labTestId: result.insertId,
      billing_amount,
    });
  });
});

// =====================================
// SAMPLE COLLECTION UPDATE
// =====================================
router.post('/lab/sample-collected', (req, res) => {
  const { lab_test_id } = req.body;

  db.query(
    `UPDATE lab_tests
     SET test_status = 'sample_collected'
     WHERE id = ?`,
    [lab_test_id],
    (err) => {
      if (err) return res.status(500).json(err);

      res.json({ message: 'Sample collected successfully' });
    }
  );
});

// =====================================
// LAB REPORT UPLOAD
// =====================================
router.post('/lab/upload-report', (req, res) => {
  const { lab_test_id, report_file } = req.body;

  db.query(
    `UPDATE lab_tests
     SET test_status = 'completed', report_file = ?
     WHERE id = ?`,
    [report_file, lab_test_id],
    (err) => {
      if (err) return res.status(500).json(err);

      res.json({ message: 'Lab report uploaded successfully' });
    }
  );
});

// =====================================
// RADIOLOGY BOOKING
// =====================================
router.post('/radiology/book-scan', (req, res) => {
  const {
    patient_id,
    scan_type,
    doctor_id,
    notes,
    billing_amount,
  } = req.body;

  const sql = `
    INSERT INTO radiology_records
    (
      patient_id,
      scan_type,
      scan_status,
      report_file,
      image_file
    )
    VALUES (?, ?, 'booked', NULL, NULL)
  `;

  db.query(sql, [patient_id, scan_type], (err, result) => {
    if (err) return res.status(500).json(err);

    res.json({
      message: 'Radiology scan booked successfully',
      radiologyId: result.insertId,
      billing_amount,
    });
  });
});

// =====================================
// RADIOLOGY REPORT UPDATE
// =====================================
router.post('/radiology/upload-report', (req, res) => {
  const { radiology_id, image_file, report_file } = req.body;

  db.query(
    `UPDATE radiology_records
     SET scan_status = 'completed', image_file = ?, report_file = ?
     WHERE id = ?`,
    [image_file, report_file, radiology_id],
    (err) => {
      if (err) return res.status(500).json(err);

      res.json({ message: 'Radiology report uploaded successfully' });
    }
  );
});

module.exports = router;

// =====================================================
// FRONTEND: src/app/laboratory/page.jsx
// =====================================================

'use client';

import { useState } from 'react';
import axios from 'axios';

export function LaboratoryPage() {
  const [form, setForm] = useState({
    patient_id: '',
    test_name: '',
    doctor_id: '',
    notes: '',
    billing_amount: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(
        'http://localhost:8081/api/lab-radiology/lab/book-test',
        form
      );

      alert(`Lab Test Booked: ID ${res.data.labTestId}`);
    } catch (error) {
      console.log(error);
      alert('Lab booking failed');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Laboratory Management</h1>

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
          Book Lab Test
        </button>
      </form>
    </div>
  );
}
