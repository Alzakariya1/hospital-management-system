import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { emrApi, doctorApi } from '../api';

const emptyRecord = {
  patient_id: '',
  doctor_id: '',
  record_type: 'soap',
  title: '',
  status: 'active',
  severity: '',
  onset_date: '',
  chief_complaint: '',
  subjective: '',
  objective: '',
  assessment: '',
  plan: '',
  diagnosis: '',
  notes: '',
  vitals: { bp: '', pulse: '', temperature: '', spo2: '', weight: '' },
};

const typeLabels = {
  soap: 'SOAP Note',
  allergy: 'Allergy',
  condition: 'Condition',
  medication_history: 'Medication History',
  surgical_history: 'Surgical History',
  family_history: 'Family History',
  immunization: 'Immunization',
  clinical_note: 'Clinical Note',
};

function fmtDate(value) {
  if (!value) return '--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export default function EMR() {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [summary, setSummary] = useState(null);
  const [record, setRecord] = useState(emptyRecord);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');

  async function loadBase() {
    const [p, d] = await Promise.all([emrApi.patients(), doctorApi.list()]);
    setPatients(p.data || []);
    setDoctors(d.data || []);
    if (!patientId && p.data?.[0]) setPatientId(String(p.data[0].id));
  }

  async function loadSummary(id = patientId) {
    if (!id) return;
    const { data } = await emrApi.summary(id);
    setSummary(data);
    setRecord((r) => ({ ...r, patient_id: data.patient?.patient_id || String(data.patient?.id || id) }));
  }

  useEffect(() => { loadBase().catch(() => toast.error('Unable to load EMR data')); }, []);
  useEffect(() => { if (patientId) loadSummary(patientId).catch(() => toast.error('Unable to load patient EMR')); }, [patientId]);

  const filteredTimeline = useMemo(() => {
    const rows = summary?.timeline || [];
    if (filter === 'all') return rows;
    return rows.filter((r) => r.type === filter);
  }, [summary, filter]);

  async function saveRecord(e) {
    e.preventDefault();
    if (!record.patient_id) return toast.error('Select a patient first');
    setSaving(true);
    try {
      await emrApi.create(record);
      toast.success('Clinical record saved');
      setRecord((r) => ({ ...emptyRecord, patient_id: r.patient_id }));
      await loadSummary(patientId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Clinical record save failed');
    } finally {
      setSaving(false);
    }
  }

  async function archiveRecord(row) {
    if (!row?.payload?.id) return;
    try {
      await emrApi.update(row.payload.id, { status: 'archived' });
      toast.success('Record archived');
      await loadSummary(patientId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Archive failed');
    }
  }

  return (
    <div className="page-stack emr-page">
      <section className="card hero-card subtle-hero">
        <div>
          <p className="eyebrow">EMR / EHR</p>
          <h2>Clinical Record Center</h2>
          <p className="muted">Manage SOAP notes, allergies, conditions, medication history, vitals, and complete patient timeline.</p>
        </div>
        <div className="toolbar-row">
          <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            <option value="">Select patient</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.patient_id} ({p.patient_id || p.id})</option>)}
          </select>
          <button type="button" onClick={() => loadSummary()}>Refresh EMR</button>
        </div>
      </section>

      {summary && (
        <>
          <section className="profile-shell emr-summary-card">
            <div className="profile-banner">
              <div>
                <p className="eyebrow">Patient Clinical Summary</p>
                <h2>{summary.patient?.full_name}</h2>
                <p>UHID: {summary.patient?.patient_id || summary.patient?.id} • {summary.patient?.gender || '--'} • {summary.patient?.blood_group || '--'}</p>
              </div>
              <span className="status-pill success">{summary.summary?.clinicalRecords || 0} EMR Records</span>
            </div>
            <div className="stats-grid compact">
              <div className="mini-stat"><span>Allergies</span><strong>{summary.summary?.activeAllergies || 0}</strong></div>
              <div className="mini-stat"><span>Conditions</span><strong>{summary.summary?.activeConditions || 0}</strong></div>
              <div className="mini-stat"><span>Medications</span><strong>{summary.summary?.activeMedications || 0}</strong></div>
              <div className="mini-stat"><span>Consultations</span><strong>{summary.summary?.consultations || 0}</strong></div>
              <div className="mini-stat"><span>Labs</span><strong>{summary.summary?.labs || 0}</strong></div>
              <div className="mini-stat"><span>Radiology</span><strong>{summary.summary?.radiology || 0}</strong></div>
            </div>
            <div className="clinical-alert-grid">
              <div className="card soft-card">
                <h3>Active Allergies</h3>
                {(summary.activeAllergies || []).length ? summary.activeAllergies.map((x) => <p key={x.id}><strong>{x.title}</strong><br/><span>{x.notes || x.severity || 'Active'}</span></p>) : <p className="muted">No active allergies recorded.</p>}
              </div>
              <div className="card soft-card">
                <h3>Active Conditions</h3>
                {(summary.activeConditions || []).length ? summary.activeConditions.map((x) => <p key={x.id}><strong>{x.title || x.diagnosis}</strong><br/><span>{x.notes || x.status}</span></p>) : <p className="muted">No active conditions recorded.</p>}
              </div>
              <div className="card soft-card">
                <h3>Current Medications</h3>
                {(summary.activeMedications || []).length ? summary.activeMedications.map((x) => <p key={x.id}><strong>{x.title}</strong><br/><span>{x.plan || x.notes}</span></p>) : <p className="muted">No medication history recorded.</p>}
              </div>
            </div>
          </section>

          <section className="grid two-col">
            <form className="card form-card" onSubmit={saveRecord}>
              <div className="section-title-row">
                <div>
                  <h3>Add Clinical Record</h3>
                  <p className="muted">Create structured SOAP notes or longitudinal clinical history.</p>
                </div>
              </div>
              <div className="form-grid">
                <select value={record.record_type} onChange={(e) => setRecord({ ...record, record_type: e.target.value })}>
                  {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <select value={record.doctor_id} onChange={(e) => setRecord({ ...record, doctor_id: e.target.value })}>
                  <option value="">Doctor / Recorded by</option>
                  {doctors.map((d) => <option key={d.id} value={d.doctor_id || d.id}>{d.full_name}</option>)}
                </select>
                <input placeholder="Title" value={record.title} onChange={(e) => setRecord({ ...record, title: e.target.value })} />
                <select value={record.status} onChange={(e) => setRecord({ ...record, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="resolved">Resolved</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
                <input placeholder="Severity" value={record.severity} onChange={(e) => setRecord({ ...record, severity: e.target.value })} />
                <input type="date" value={record.onset_date} onChange={(e) => setRecord({ ...record, onset_date: e.target.value })} />
                <input placeholder="BP" value={record.vitals.bp} onChange={(e) => setRecord({ ...record, vitals: { ...record.vitals, bp: e.target.value } })} />
                <input placeholder="Pulse" value={record.vitals.pulse} onChange={(e) => setRecord({ ...record, vitals: { ...record.vitals, pulse: e.target.value } })} />
                <input placeholder="Temperature" value={record.vitals.temperature} onChange={(e) => setRecord({ ...record, vitals: { ...record.vitals, temperature: e.target.value } })} />
                <input placeholder="SpO2" value={record.vitals.spo2} onChange={(e) => setRecord({ ...record, vitals: { ...record.vitals, spo2: e.target.value } })} />
              </div>
              <textarea placeholder="Chief complaint" value={record.chief_complaint} onChange={(e) => setRecord({ ...record, chief_complaint: e.target.value })} />
              <textarea placeholder="Subjective" value={record.subjective} onChange={(e) => setRecord({ ...record, subjective: e.target.value })} />
              <textarea placeholder="Objective" value={record.objective} onChange={(e) => setRecord({ ...record, objective: e.target.value })} />
              <textarea placeholder="Assessment / Diagnosis" value={record.assessment} onChange={(e) => setRecord({ ...record, assessment: e.target.value, diagnosis: e.target.value })} />
              <textarea placeholder="Plan / Treatment" value={record.plan} onChange={(e) => setRecord({ ...record, plan: e.target.value })} />
              <textarea placeholder="Notes" value={record.notes} onChange={(e) => setRecord({ ...record, notes: e.target.value })} />
              <button disabled={saving}>{saving ? 'Saving...' : 'Save Clinical Record'}</button>
            </form>

            <section className="card timeline-card">
              <div className="section-title-row">
                <div>
                  <h3>Unified Clinical Timeline</h3>
                  <p className="muted">EMR records merged with appointments, OPD, prescriptions, billing, labs, radiology, and IPD.</p>
                </div>
                <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option value="all">All</option>
                  {Object.keys(typeLabels).map((k) => <option key={k} value={k}>{typeLabels[k]}</option>)}
                  <option value="appointment">Appointments</option>
                  <option value="opd">OPD</option>
                  <option value="prescription">Prescription</option>
                  <option value="lab">Lab</option>
                  <option value="radiology">Radiology</option>
                  <option value="billing">Billing</option>
                </select>
              </div>
              <div className="timeline-list">
                {filteredTimeline.length ? filteredTimeline.map((item, idx) => (
                  <div className="timeline-item" key={`${item.type}-${item.payload?.id || idx}`}>
                    <div className="timeline-dot" />
                    <div>
                      <p><strong>{item.title}</strong> <span className="badge-soft">{item.type}</span></p>
                      <p className="muted">{fmtDate(item.date)} • {item.status || 'recorded'}</p>
                      {item.payload?.notes && <p>{item.payload.notes}</p>}
                      {item.payload?.id && ['soap','allergy','condition','medication_history','surgical_history','family_history','immunization','clinical_note'].includes(item.type) && (
                        <button className="ghost danger" type="button" onClick={() => archiveRecord(item)}>Archive</button>
                      )}
                    </div>
                  </div>
                )) : <p className="muted">No timeline records found.</p>}
              </div>
            </section>
          </section>
        </>
      )}
    </div>
  );
}
