import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { complianceApi } from '../api';

const emptyConsent = { patient_id: '', patient_name: '', consent_type: 'procedure', title: '', form_text: '', status: 'draft', signed_by: '', relationship: '', witness_name: '', doctor_name: '', valid_until: '', notes: '' };
const emptyIncident = { incident_type: 'clinical', severity: 'medium', status: 'open', incident_date: '', department: '', location: '', patient_id: '', patient_name: '', reported_by: '', description: '', immediate_action: '', root_cause: '', corrective_action: '', preventive_action: '' };
const emptySop = { title: '', department: '', category: 'general', version: '1.0', status: 'draft', effective_date: '', review_date: '', owner_name: '', approved_by: '', document_text: '', training_required: false };
const emptyChecklist = { standard: 'NABH', title: '', department: '', category: '', status: 'pending', priority: 'medium', due_date: '', evidence_url: '', evidence_notes: '', owner_name: '', corrective_action: '' };
const emptyBackup = { backup_type: 'database', backup_date: '', restore_test_date: '', status: 'pending', storage_location: '', verified_by: '', restore_duration_minutes: '', records_checked: '', issue_found: '', action_taken: '', next_test_due: '', notes: '' };

function fmt(v) { if (!v) return '-'; try { return new Date(v).toLocaleDateString(); } catch { return v; } }
function Badge({ value }) { return <span className={`statusBadge ${value || 'pending'}`}>{String(value || 'pending').replaceAll('_', ' ')}</span>; }
function Field({ label, children }) { return <label><span>{label}</span>{children}</label>; }

export default function ComplianceCenter({ permissions }) {
  const [active, setActive] = useState('checklists');
  const [summary, setSummary] = useState({});
  const [consents, setConsents] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [sops, setSops] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [backups, setBackups] = useState([]);
  const [q, setQ] = useState('');
  const [forms, setForms] = useState({ consent: emptyConsent, incident: emptyIncident, sop: emptySop, checklist: emptyChecklist, backup: emptyBackup });

  const canManage = Boolean(permissions?.complianceManage || permissions?.securityManage);
  const rows = useMemo(() => ({ consents, incidents, sops, checklists, backups })[active] || [], [active, consents, incidents, sops, checklists, backups]);

  async function load() {
    const params = q ? { q } : {};
    const [sum, co, inc, sop, chk, bkp] = await Promise.all([
      complianceApi.summary(), complianceApi.consents(params), complianceApi.incidents(params), complianceApi.sops(params), complianceApi.checklists(params), complianceApi.backups(params),
    ]);
    setSummary(sum.data || {}); setConsents(co.data || []); setIncidents(inc.data || []); setSops(sop.data || []); setChecklists(chk.data || []); setBackups(bkp.data || []);
  }

  useEffect(() => { load().catch((e) => toast.error(e.response?.data?.message || 'Compliance load failed')); }, []);

  async function submit(type, apiCall, resetValue, e) {
    e.preventDefault();
    if (!canManage) return toast.error('No permission to manage compliance');
    await apiCall(forms[type]);
    setForms((x) => ({ ...x, [type]: resetValue }));
    await load();
    toast.success('Compliance record saved');
  }

  async function updateStatus(type, id, payload) {
    if (!canManage) return toast.error('No permission to manage compliance');
    const call = { consents: complianceApi.updateConsent, incidents: complianceApi.updateIncident, sops: complianceApi.updateSop, checklists: complianceApi.updateChecklist, backups: complianceApi.updateBackup }[type];
    await call(id, payload); await load(); toast.success('Status updated');
  }

  if (!permissions?.complianceView && !permissions?.auditView && !permissions?.securityManage) {
    return <section className="card"><h2>NABH / Compliance Center</h2><p className="muted">You do not have access to this module.</p></section>;
  }

  return <div className="complianceCenter">
    <div className="sectionHeader">
      <div><p className="eyebrow">NABH Readiness</p><h1>NABH / Compliance Center</h1><p>Consent tracking, incident logs, SOP management, checklist evidence, audit exports and backup restore verification.</p></div>
      <div className="headerActions"><button className="secondaryBtn" onClick={load}>Refresh</button><a className="primaryBtn" href={complianceApi.exportUrl(active)} target="_blank" rel="noreferrer">Export CSV</a></div>
    </div>

    <div className="statsGrid securityStats">
      <div className="statCard"><span>Compliance Score</span><strong>{summary.complianceScore || 0}%</strong><small>{summary.checklistCompliant || 0}/{summary.checklistTotal || 0} checklist compliant</small></div>
      <div className="statCard"><span>Signed Consents</span><strong>{summary.signedConsents || 0}</strong><small>Total consents: {summary.consents || 0}</small></div>
      <div className="statCard"><span>Open Incidents</span><strong>{summary.incidentsOpen || 0}</strong><small>High/Critical: {summary.incidentsHigh || 0}</small></div>
      <div className="statCard"><span>Backup Issues</span><strong>{summary.backupFailed || 0}</strong><small>Failed or partial restore tests</small></div>
    </div>

    <section className="card">
      <div className="tabsBar">
        {['checklists', 'consents', 'incidents', 'sops', 'backups'].map((x) => <button key={x} className={active === x ? 'active' : ''} onClick={() => setActive(x)}>{x.replaceAll('_', ' ')}</button>)}
      </div>
      <form className="filterBar" onSubmit={(e) => { e.preventDefault(); load(); }}><input placeholder="Search compliance records" value={q} onChange={(e) => setQ(e.target.value)} /><button>Search</button>{active === 'checklists' && <button type="button" className="secondaryBtn" onClick={async () => { await complianceApi.seedNabh(); await load(); toast.success('NABH defaults ensured'); }}>Seed NABH Defaults</button>}</form>
    </section>

    {canManage && <div className="grid twoCol complianceForms">
      {active === 'consents' && <section className="card"><h3>Create Consent Form</h3><form className="stackForm" onSubmit={(e) => submit('consent', complianceApi.createConsent, emptyConsent, e)}>
        <Field label="Patient ID"><input value={forms.consent.patient_id} onChange={(e) => setForms({ ...forms, consent: { ...forms.consent, patient_id: e.target.value } })} /></Field><Field label="Patient Name"><input value={forms.consent.patient_name} onChange={(e) => setForms({ ...forms, consent: { ...forms.consent, patient_name: e.target.value } })} /></Field><Field label="Consent Type"><select value={forms.consent.consent_type} onChange={(e) => setForms({ ...forms, consent: { ...forms.consent, consent_type: e.target.value } })}><option>procedure</option><option>surgery</option><option>anaesthesia</option><option>blood_transfusion</option><option>general</option></select></Field><Field label="Title"><input required value={forms.consent.title} onChange={(e) => setForms({ ...forms, consent: { ...forms.consent, title: e.target.value } })} /></Field><Field label="Consent Text"><textarea value={forms.consent.form_text} onChange={(e) => setForms({ ...forms, consent: { ...forms.consent, form_text: e.target.value } })} /></Field><button>Save Consent</button></form></section>}
      {active === 'incidents' && <section className="card"><h3>Report Incident</h3><form className="stackForm" onSubmit={(e) => submit('incident', complianceApi.createIncident, emptyIncident, e)}>
        <Field label="Type"><input value={forms.incident.incident_type} onChange={(e) => setForms({ ...forms, incident: { ...forms.incident, incident_type: e.target.value } })} /></Field><Field label="Severity"><select value={forms.incident.severity} onChange={(e) => setForms({ ...forms, incident: { ...forms.incident, severity: e.target.value } })}><option>low</option><option>medium</option><option>high</option><option>critical</option></select></Field><Field label="Date"><input type="date" value={forms.incident.incident_date} onChange={(e) => setForms({ ...forms, incident: { ...forms.incident, incident_date: e.target.value } })} /></Field><Field label="Department"><input value={forms.incident.department} onChange={(e) => setForms({ ...forms, incident: { ...forms.incident, department: e.target.value } })} /></Field><Field label="Description"><textarea required value={forms.incident.description} onChange={(e) => setForms({ ...forms, incident: { ...forms.incident, description: e.target.value } })} /></Field><button>Save Incident</button></form></section>}
      {active === 'sops' && <section className="card"><h3>Create SOP</h3><form className="stackForm" onSubmit={(e) => submit('sop', complianceApi.createSop, emptySop, e)}>
        <Field label="Title"><input required value={forms.sop.title} onChange={(e) => setForms({ ...forms, sop: { ...forms.sop, title: e.target.value } })} /></Field><Field label="Department"><input value={forms.sop.department} onChange={(e) => setForms({ ...forms, sop: { ...forms.sop, department: e.target.value } })} /></Field><Field label="Version"><input value={forms.sop.version} onChange={(e) => setForms({ ...forms, sop: { ...forms.sop, version: e.target.value } })} /></Field><Field label="Review Date"><input type="date" value={forms.sop.review_date} onChange={(e) => setForms({ ...forms, sop: { ...forms.sop, review_date: e.target.value } })} /></Field><Field label="SOP Text"><textarea value={forms.sop.document_text} onChange={(e) => setForms({ ...forms, sop: { ...forms.sop, document_text: e.target.value } })} /></Field><button>Save SOP</button></form></section>}
      {active === 'checklists' && <section className="card"><h3>Add Checklist Item</h3><form className="stackForm" onSubmit={(e) => submit('checklist', complianceApi.createChecklist, emptyChecklist, e)}>
        <Field label="Standard"><input value={forms.checklist.standard} onChange={(e) => setForms({ ...forms, checklist: { ...forms.checklist, standard: e.target.value } })} /></Field><Field label="Title"><input required value={forms.checklist.title} onChange={(e) => setForms({ ...forms, checklist: { ...forms.checklist, title: e.target.value } })} /></Field><Field label="Department"><input value={forms.checklist.department} onChange={(e) => setForms({ ...forms, checklist: { ...forms.checklist, department: e.target.value } })} /></Field><Field label="Priority"><select value={forms.checklist.priority} onChange={(e) => setForms({ ...forms, checklist: { ...forms.checklist, priority: e.target.value } })}><option>low</option><option>medium</option><option>high</option></select></Field><Field label="Due Date"><input type="date" value={forms.checklist.due_date} onChange={(e) => setForms({ ...forms, checklist: { ...forms.checklist, due_date: e.target.value } })} /></Field><button>Save Checklist</button></form></section>}
      {active === 'backups' && <section className="card"><h3>Backup / Restore Verification</h3><form className="stackForm" onSubmit={(e) => submit('backup', complianceApi.createBackup, emptyBackup, e)}>
        <Field label="Backup Type"><select value={forms.backup.backup_type} onChange={(e) => setForms({ ...forms, backup: { ...forms.backup, backup_type: e.target.value } })}><option>database</option><option>files</option><option>full_system</option></select></Field><Field label="Backup Date"><input type="date" value={forms.backup.backup_date} onChange={(e) => setForms({ ...forms, backup: { ...forms.backup, backup_date: e.target.value } })} /></Field><Field label="Restore Test Date"><input type="date" value={forms.backup.restore_test_date} onChange={(e) => setForms({ ...forms, backup: { ...forms.backup, restore_test_date: e.target.value } })} /></Field><Field label="Status"><select value={forms.backup.status} onChange={(e) => setForms({ ...forms, backup: { ...forms.backup, status: e.target.value } })}><option>pending</option><option>passed</option><option>partial</option><option>failed</option></select></Field><Field label="Verified By"><input value={forms.backup.verified_by} onChange={(e) => setForms({ ...forms, backup: { ...forms.backup, verified_by: e.target.value } })} /></Field><button>Save Verification</button></form></section>}
    </div>}

    <section className="card"><h3>{active.replaceAll('_', ' ')} Records</h3><div className="tableWrap"><table><thead><tr>{active === 'consents' && <><th>No</th><th>Patient</th><th>Type</th><th>Title</th><th>Status</th><th>Signed</th><th>Action</th></>}{active === 'incidents' && <><th>No</th><th>Type</th><th>Severity</th><th>Status</th><th>Department</th><th>Date</th><th>Action</th></>}{active === 'sops' && <><th>No</th><th>Title</th><th>Department</th><th>Version</th><th>Status</th><th>Review</th><th>Action</th></>}{active === 'checklists' && <><th>Code</th><th>Title</th><th>Dept</th><th>Priority</th><th>Status</th><th>Due</th><th>Action</th></>}{active === 'backups' && <><th>No</th><th>Type</th><th>Backup</th><th>Restore</th><th>Status</th><th>Verified By</th><th>Action</th></>}</tr></thead><tbody>{rows.map((r) => <tr key={r.id}>{active === 'consents' && <><td>{r.consent_number}</td><td>{r.patient_name || r.patient_id}</td><td>{r.consent_type}</td><td>{r.title}</td><td><Badge value={r.status} /></td><td>{fmt(r.signed_at)}</td><td>{canManage && r.status !== 'signed' && <button onClick={() => updateStatus('consents', r.id, { status: 'signed', signed_at: new Date() })}>Mark Signed</button>}</td></>}{active === 'incidents' && <><td>{r.incident_number}</td><td>{r.incident_type}</td><td><Badge value={r.severity} /></td><td><Badge value={r.status} /></td><td>{r.department}</td><td>{r.incident_date || '-'}</td><td>{canManage && r.status !== 'closed' && <button onClick={() => updateStatus('incidents', r.id, { status: 'closed' })}>Close</button>}</td></>}{active === 'sops' && <><td>{r.sop_number}</td><td>{r.title}</td><td>{r.department}</td><td>{r.version}</td><td><Badge value={r.status} /></td><td>{r.review_date || '-'}</td><td>{canManage && r.status !== 'approved' && <button onClick={() => updateStatus('sops', r.id, { status: 'approved', approved_by: 'Admin' })}>Approve</button>}</td></>}{active === 'checklists' && <><td>{r.checklist_code}</td><td>{r.title}</td><td>{r.department}</td><td>{r.priority}</td><td><Badge value={r.status} /></td><td>{r.due_date || '-'}</td><td>{canManage && <select value={r.status || 'pending'} onChange={(e) => updateStatus('checklists', r.id, { status: e.target.value })}><option>pending</option><option>compliant</option><option>partial</option><option>non_compliant</option><option>not_applicable</option></select>}</td></>}{active === 'backups' && <><td>{r.verification_number}</td><td>{r.backup_type}</td><td>{r.backup_date || '-'}</td><td>{r.restore_test_date || '-'}</td><td><Badge value={r.status} /></td><td>{r.verified_by || '-'}</td><td>{canManage && <select value={r.status || 'pending'} onChange={(e) => updateStatus('backups', r.id, { status: e.target.value })}><option>pending</option><option>passed</option><option>partial</option><option>failed</option></select>}</td></>}</tr>)}{!rows.length && <tr><td colSpan="7" className="muted">No records found.</td></tr>}</tbody></table></div></section>
  </div>;
}
