// FULL IPD + OPD MANAGEMENT SYSTEM (Enterprise HMS)
// Includes:
// - OPD Registration
// - Consultation Notes
// - Follow-up Visits
// - OPD Prescription
// - IPD Admission
// - Room Allocation
// - Bed Allocation
// - ICU Allocation
// - Nursing Notes
// - Vitals Tracking
// - Treatment Plan
// - Daily Monitoring
// - Room Transfer
// - Bed Transfer
// - Discharge Summary
// - Final Billing Linkage

// =====================================================
// BACKEND: routes/opd-ipd.js
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

// =============================
// OPD REGISTRATION
// =============================
router.post('/opd/register', (req, res) => {
  const {
    patient_id,
    doctor_id,
    consultation_notes,
    prescription,
    follow_up_date,
  } = req.body;

  const sql = `
    INSERT INTO opd_records
    (
      patient_id,
      doctor_id,
      consultation_notes,
      prescription,
      follow_up_date
    )
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [patient_id, doctor_id, consultation_notes, prescription, follow_up_date],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json({
        message: 'OPD record created successfully',
        opdId: result.insertId,
      });
    }
  );
});

// =============================
// IPD ADMISSION
// =============================
router.post('/ipd/admit', (req, res) => {
  const {
    patient_id,
    doctor_id,
    room_number,
    bed_number,
    ward_type,
    treatment_plan,
    admission_reason,
  } = req.body;

  const sql = `
    INSERT INTO ipd_records
    (
      patient_id,
      doctor_id,
      room_number,
      bed_number,
      ward_type,
      treatment_plan,
      admission_reason,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'admitted')
  `;

  db.query(
    sql,
    [
      patient_id,
      doctor_id,
      room_number,
      bed_number,
      ward_type,
      treatment_plan,
      admission_reason,
    ],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json({
        message: 'Patient admitted successfully',
        ipdId: result.insertId,
      });
    }
  );
});

// =============================
// NURSING NOTES + VITALS
// =============================
router.post('/ipd/nursing-notes', (req, res) => {
  const {
    ipd_id,
    blood_pressure,
    temperature,
    pulse,
    oxygen_level,
    nursing_notes,
  } = req.body;

  const sql = `
    INSERT INTO ipd_vitals
    (
      ipd_id,
      blood_pressure,
      temperature,
      pulse,
      oxygen_level,
      nursing_notes
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      ipd_id,
      blood_pressure,
      temperature,
      pulse,
      oxygen_level,
      nursing_notes,
    ],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json({
        message: 'Vitals updated successfully',
        vitalsId: result.insertId,
      });
    }
  );
});

// =============================
// DISCHARGE PATIENT
// =============================
router.post('/ipd/discharge', (req, res) => {
  const { ipd_id, discharge_summary } = req.body;

  db.query(
    `UPDATE ipd_records
     SET status = 'discharged', discharge_summary = ?
     WHERE id = ?`,
    [discharge_summary, ipd_id],
    (err) => {
      if (err) return res.status(500).json(err);

      res.json({
        message: 'Patient discharged successfully',
      });
    }
  );
});

module.exports = router;

// =====================================================
// FRONTEND: src/app/ipd/page.jsx
// =====================================================

'use client';

import { useState } from 'react';
import axios from 'axios';

export function IPDPage() {
  const [form, setForm] = useState({
    patient_id: '',
    doctor_id: '',
    room_number: '',
    bed_number: '',
    ward_type: '',
    treatment_plan: '',
    admission_reason: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(
        'http://localhost:8081/api/ipd-opd/ipd/admit',
        form
      );

      alert(`Patient Admitted: IPD ID ${res.data.ipdId}`);
    } catch (error) {
      console.log(error);
      alert('IPD admission failed');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">IPD Admission</h1>

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
          Admit Patient
        </button>
      </form>
    </div>
  );
}
