import React from "react";
import { DataTable } from "../components";

const BILL_STATUSES = ["pending", "partial", "paid", "cancelled", "refunded"];

export default function Billing({ bill, setBill, addBill, bills, permissions = {}, patients = [] }) {
  const patientOptions = patients || [];
  return (
    <section className="modulePage billingPage">
      {permissions.billingCreate && (
        <form className="card form polishedForm" onSubmit={addBill}>
          <div className="sectionTitleRow">
            <div>
              <h2>Add Bill / Invoice</h2>
              <p className="muted">Create a patient invoice with amount, paid amount and payment status.</p>
            </div>
          </div>
          <div className="formGrid labeledGrid">
            <label><span>Patient *</span>{patientOptions.length ? <select required value={bill.patient_id || ""} onChange={(e) => setBill({ ...bill, patient_id: e.target.value })}><option value="">Select patient</option>{patientOptions.map((p) => <option key={p.id || p.patient_id} value={p.patient_id || p.id}>{p.full_name} · {p.patient_id || p.id}</option>)}</select> : <input required placeholder="patient id" value={bill.patient_id || ""} onChange={(e) => setBill({ ...bill, patient_id: e.target.value })} />}</label>
            <label><span>Total Amount *</span><input required type="number" min="0" placeholder="amount" value={bill.amount || bill.total_amount || ""} onChange={(e) => setBill({ ...bill, amount: e.target.value, total_amount: e.target.value })} /></label>
            <label><span>Paid Amount</span><input type="number" min="0" placeholder="paid amount" value={bill.paid_amount || ""} onChange={(e) => setBill({ ...bill, paid_amount: e.target.value })} /></label>
            <label><span>Status</span><select value={bill.status || bill.payment_status || "pending"} onChange={(e) => setBill({ ...bill, status: e.target.value, payment_status: e.target.value })}>{BILL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
            <label><span>Payment Mode</span><select value={bill.payment_mode || "cash"} onChange={(e) => setBill({ ...bill, payment_mode: e.target.value })}><option value="cash">Cash</option><option value="card">Card</option><option value="upi">UPI</option><option value="bank">Bank Transfer</option><option value="insurance">Insurance</option></select></label>
            <label><span>Notes</span><input placeholder="optional notes" value={bill.notes || ""} onChange={(e) => setBill({ ...bill, notes: e.target.value })} /></label>
          </div>
          <button>Save Invoice</button>
        </form>
      )}
      <div className="card">
        <div className="sectionTitleRow"><h2>Billing Register</h2><span className="muted">{bills?.length || 0} invoices</span></div>
        <DataTable rows={bills} cols={["invoice_number", "patient_name", "patient_id", "total_amount", "paid_amount", "payment_status", "billing_date"]} />
      </div>
    </section>
  );
}
