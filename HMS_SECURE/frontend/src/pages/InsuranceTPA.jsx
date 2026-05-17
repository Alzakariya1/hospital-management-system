import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { insuranceApi } from '../api/insuranceApi';

const emptyClaim = {
  patient_id: '',
  billing_id: '',
  invoice_number: '',
  insurance_provider: '',
  tpa_name: '',
  policy_number: '',
  claim_number: '',
  claim_type: 'cashless',
  claim_amount: '',
  approved_amount: '',
  paid_amount: '',
  status: 'draft',
  priority: 'normal',
  admission_date: '',
  discharge_date: '',
  rejection_reason: '',
  notes: '',
};

const statuses = ['draft', 'submitted', 'under_review', 'approved', 'partially_approved', 'rejected', 'settled', 'cancelled'];

export default function InsuranceTPA({ patients = [], bills = [], permissions = {} }) {
  const [claims, setClaims] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(emptyClaim);
  const [editingId, setEditingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const canManage = permissions.insuranceManage || permissions.configurationManage || permissions.billingCreate;

  async function load() {
    const [{ data: claimRows }, { data: sum }] = await Promise.all([
      insuranceApi.list({ status: statusFilter }),
      insuranceApi.summary(),
    ]);
    setClaims(claimRows || []);
    setSummary(sum || null);
  }

  useEffect(() => {
    load().catch((err) => toast.error(err.response?.data?.message || 'Insurance claims load failed'));
  }, [statusFilter]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function selectBill(id) {
    const bill = bills.find((b) => String(b.id) === String(id));
    updateField('billing_id', id);
    if (bill) {
      setForm((prev) => ({
        ...prev,
        billing_id: id,
        patient_id: bill.patient_id || prev.patient_id,
        invoice_number: bill.invoice_number || prev.invoice_number,
        claim_amount: bill.total_amount || bill.amount || prev.claim_amount,
      }));
    }
  }

  async function saveClaim(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await insuranceApi.update(editingId, form);
        toast.success('Insurance claim updated');
      } else {
        await insuranceApi.create(form);
        toast.success('Insurance claim created');
      }
      setForm(emptyClaim);
      setEditingId(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Claim save failed');
    }
  }

  function editClaim(row) {
    setEditingId(row.id);
    setForm({ ...emptyClaim, ...row });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function changeStatus(row, status) {
    try {
      await insuranceApi.updateStatus(row.id, { status, approved_amount: row.approved_amount || 0, paid_amount: row.paid_amount || 0 });
      toast.success('Claim status updated');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status update failed');
    }
  }

  const filteredClaims = useMemo(() => {
    const q = search.toLowerCase();
    return claims.filter((c) =>
      [c.claim_number, c.patient_name, c.patient_id, c.insurance_provider, c.tpa_name, c.policy_number, c.invoice_number]
        .some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [claims, search]);

  return (
    <div className="pageStack">
      <section className="heroCard compactHero">
        <div>
          <p className="eyebrow">Insurance / TPA</p>
          <h2>Claims Control Center</h2>
          <p>Track cashless/reimbursement claims, approvals, settlement, and outstanding insurance amounts.</p>
        </div>
        <span className="statusPill success">Enterprise workflow</span>
      </section>

      <div className="statsGrid four">
        <div className="statCard"><span>Total Claims</span><strong>{summary?.claims || 0}</strong></div>
        <div className="statCard"><span>Claimed</span><strong>₹{Number(summary?.totalClaimed || 0).toLocaleString()}</strong></div>
        <div className="statCard"><span>Approved</span><strong>₹{Number(summary?.totalApproved || 0).toLocaleString()}</strong></div>
        <div className="statCard"><span>Outstanding</span><strong>₹{Number(summary?.outstanding || 0).toLocaleString()}</strong></div>
      </div>

      <section className="card">
        <div className="sectionHead">
          <div>
            <h2>{editingId ? 'Edit Claim' : 'Create Insurance Claim'}</h2>
            <p className="muted">Create claim manually or link it with an existing patient bill.</p>
          </div>
          {editingId && <button className="secondaryBtn" onClick={() => { setEditingId(null); setForm(emptyClaim); }}>New Claim</button>}
        </div>
        <form className="gridForm" onSubmit={saveClaim}>
          <select value={form.patient_id} onChange={(e) => updateField('patient_id', e.target.value)} required>
            <option value="">Select patient</option>
            {patients.map((p) => <option key={p.id || p.patient_id} value={p.patient_id || p.id}>{p.full_name} ({p.patient_id || p.id})</option>)}
          </select>
          <select value={form.billing_id || ''} onChange={(e) => selectBill(e.target.value)}>
            <option value="">Link bill/invoice optional</option>
            {bills.map((b) => <option key={b.id} value={b.id}>{b.invoice_number || `Bill ${b.id}`} - ₹{b.total_amount || b.amount || 0}</option>)}
          </select>
          <input placeholder="Invoice number" value={form.invoice_number || ''} onChange={(e) => updateField('invoice_number', e.target.value)} />
          <input placeholder="Insurance provider" value={form.insurance_provider || ''} onChange={(e) => updateField('insurance_provider', e.target.value)} required />
          <input placeholder="TPA name" value={form.tpa_name || ''} onChange={(e) => updateField('tpa_name', e.target.value)} />
          <input placeholder="Policy number" value={form.policy_number || ''} onChange={(e) => updateField('policy_number', e.target.value)} />
          <input placeholder="Claim number optional" value={form.claim_number || ''} onChange={(e) => updateField('claim_number', e.target.value)} />
          <select value={form.claim_type} onChange={(e) => updateField('claim_type', e.target.value)}>
            <option value="cashless">Cashless</option>
            <option value="reimbursement">Reimbursement</option>
            <option value="corporate">Corporate</option>
          </select>
          <input type="number" placeholder="Claim amount" value={form.claim_amount || ''} onChange={(e) => updateField('claim_amount', e.target.value)} required />
          <input type="number" placeholder="Approved amount" value={form.approved_amount || ''} onChange={(e) => updateField('approved_amount', e.target.value)} />
          <input type="number" placeholder="Paid amount" value={form.paid_amount || ''} onChange={(e) => updateField('paid_amount', e.target.value)} />
          <select value={form.status} onChange={(e) => updateField('status', e.target.value)}>{statuses.map((s) => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}</select>
          <select value={form.priority} onChange={(e) => updateField('priority', e.target.value)}><option value="normal">Normal</option><option value="urgent">Urgent</option><option value="critical">Critical</option></select>
          <input type="date" value={form.admission_date || ''} onChange={(e) => updateField('admission_date', e.target.value)} />
          <input type="date" value={form.discharge_date || ''} onChange={(e) => updateField('discharge_date', e.target.value)} />
          <textarea placeholder="Notes / rejection reason" value={form.notes || ''} onChange={(e) => updateField('notes', e.target.value)} />
          <button className="primaryBtn" disabled={!canManage}>{editingId ? 'Update Claim' : 'Create Claim'}</button>
        </form>
      </section>

      <section className="card">
        <div className="sectionHead">
          <div><h2>Claim Register</h2><p className="muted">Monitor TPA status and settlement progress.</p></div>
          <div className="toolbar"><input placeholder="Search claims..." value={search} onChange={(e) => setSearch(e.target.value)} /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All status</option>{statuses.map((s) => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}</select></div>
        </div>
        <div className="tableWrap">
          <table>
            <thead><tr><th>Claim</th><th>Patient</th><th>Provider/TPA</th><th>Claimed</th><th>Approved</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filteredClaims.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.claim_number}</strong><br /><span className="muted">{c.invoice_number || 'No invoice linked'}</span></td>
                  <td>{c.patient_name || c.patient_id}</td>
                  <td>{c.insurance_provider}<br /><span className="muted">{c.tpa_name || 'TPA not set'}</span></td>
                  <td>₹{Number(c.claim_amount || 0).toLocaleString()}</td>
                  <td>₹{Number(c.approved_amount || 0).toLocaleString()}</td>
                  <td><span className={`statusPill ${['approved','settled'].includes(c.status) ? 'success' : c.status === 'rejected' ? 'danger' : 'warning'}`}>{String(c.status || '').replaceAll('_', ' ')}</span></td>
                  <td className="rowActions"><button onClick={() => editClaim(c)}>Edit</button><select value={c.status} onChange={(e) => changeStatus(c, e.target.value)} disabled={!canManage}>{statuses.map((s) => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}</select></td>
                </tr>
              ))}
              {!filteredClaims.length && <tr><td colSpan="7" className="muted">No insurance claims found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
