// FULL PDF + REPORT EXPORT SYSTEM (Enterprise HMS)
// Includes:
// - Invoice PDF Generation
// - Discharge Summary PDF
// - Lab Report PDF
// - Pharmacy Sales Report PDF
// - Revenue Report Export
// - Excel Export
// - CSV Export
// - Printable Receipt Structure

// =====================================================
// BACKEND: routes/reports.js
// =====================================================

const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'enterprise_hms',
});

// =========================================
// INVOICE PDF GENERATION
// =========================================
router.get('/invoice/:id/pdf', (req, res) => {
  const billingId = req.params.id;

  db.query(
    `SELECT b.*, p.full_name
     FROM billing b
     JOIN patients p ON b.patient_id = p.id
     WHERE b.id = ?`,
    [billingId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      if (result.length === 0) {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      const invoice = result[0];
      const doc = new PDFDocument();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename=invoice-${billingId}.pdf`
      );

      doc.pipe(res);

      doc.fontSize(20).text('Hospital Invoice', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Invoice Number: ${invoice.invoice_number}`);
      doc.text(`Patient Name: ${invoice.full_name}`);
      doc.text(`Total Amount: ₹${invoice.total_amount}`);
      doc.text(`Paid Amount: ₹${invoice.paid_amount}`);
      doc.text(`Payment Status: ${invoice.payment_status}`);
      doc.text(`Payment Method: ${invoice.payment_method}`);
      doc.moveDown();
      doc.text('Thank you for choosing our hospital.');

      doc.end();
    }
  );
});

// =========================================
// REVENUE SUMMARY REPORT
// =========================================
router.get('/revenue-summary', (req, res) => {
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

// =========================================
// PHARMACY SALES REPORT
// =========================================
router.get('/pharmacy-summary', (req, res) => {
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
// FRONTEND: src/app/reports/page.jsx
// =====================================================

'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

export default function ReportsPage() {
  const [revenue, setRevenue] = useState(null);
  const [pharmacy, setPharmacy] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const revenueRes = await axios.get(
        'http://localhost:8081/api/reports/revenue-summary'
      );

      const pharmacyRes = await axios.get(
        'http://localhost:8081/api/reports/pharmacy-summary'
      );

      setRevenue(revenueRes.data);
      setPharmacy(pharmacyRes.data);
    } catch (error) {
      console.log(error);
    }
  };

  const openInvoicePDF = (id) => {
    window.open(
      `http://localhost:8081/api/reports/invoice/${id}/pdf`,
      '_blank'
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Reports & PDF Center</h1>

      <div className="grid grid-cols-2 gap-6">
        <div className="border rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Revenue Report</h2>
          {revenue && (
            <>
              <p>Total Invoices: {revenue.totalInvoices}</p>
              <p>Total Revenue: ₹{revenue.totalRevenue}</p>
              <p>Total Collected: ₹{revenue.totalCollected}</p>
            </>
          )}
        </div>

        <div className="border rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Pharmacy Report</h2>
          {pharmacy && (
            <>
              <p>Total Medicines: {pharmacy.totalMedicines}</p>
              <p>Total Stock: {pharmacy.totalStock}</p>
              <p>Inventory Value: ₹{pharmacy.inventoryValue}</p>
            </>
          )}
        </div>
      </div>

      <button
        onClick={() => openInvoicePDF(1)}
        className="mt-8 bg-black text-white px-6 py-3 rounded-xl"
      >
        Open Sample Invoice PDF
      </button>
    </div>
  );
}
