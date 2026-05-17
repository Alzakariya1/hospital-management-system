import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { legalSecurityApi } from '../api';

const emptyPolicy = { policy_key: '', title: '', version: '1.0', category: 'legal', status: 'draft', owner: '', content: '' };
const emptyRequest = { requester_name: '', requester_email: '', requester_phone: '', request_type: 'access', description: '', status: 'open' };
const emptyIncident = { title: '', severity: 'medium', category: 'security', affected_systems: '', patient_data_involved: false, description: '', containment_actions: '', status: 'open' };

function StatusBadge({ value }) {
  return <span className={`badge ${['approved','resolved','closed','active'].includes(value) ? 'ok' : ['critical','high','open','overdue'].includes(value) ? 'danger' : ''}`}>{value || 'pending'}</span>;
}

export default function LegalSecurityCenter() {
  const [overview, setOverview] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [dataRequests, setDataRequests] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [policyForm, setPolicyForm] = useState(emptyPolicy);
  const [requestForm, setRequestForm] = useState(emptyRequest);
  const [incidentForm, setIncidentForm] = useState(emptyIncident);
  const [auditPack, setAuditPack] = useState(null);

  async function load() {
    try {
      const [o, p, d, i] = await Promise.all([
        legalSecurityApi.overview(),
        legalSecurityApi.policies(),
        legalSecurityApi.dataRequests(),
        legalSecurityApi.incidents(),
      ]);
      setOverview(o.data);
      setPolicies(p.data || []);
      setDataRequests(d.data || []);
      setIncidents(i.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Legal/security data failed to load');
    }
  }

  useEffect(() => { load(); }, []);

  async function bootstrap() {
    try {
      const { data } = await legalSecurityApi.bootstrapPolicies();
      toast.success(data.message || 'Policies ready');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Policy bootstrap failed'); }
  }

  async function savePolicy(e) {
    e.preventDefault();
    try {
      await legalSecurityApi.createPolicy(policyForm);
      setPolicyForm(emptyPolicy);
      toast.success('Policy created');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Policy save failed'); }
  }

  async function approvePolicy(id) {
    try { await legalSecurityApi.approvePolicy(id); toast.success('Policy approved'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Policy approval failed'); }
  }

  async function saveDataRequest(e) {
    e.preventDefault();
    try {
      await legalSecurityApi.createDataRequest(requestForm);
      setRequestForm(emptyRequest);
      toast.success('Data request created');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Data request failed'); }
  }

  async function closeDataRequest(id) {
    try { await legalSecurityApi.updateDataRequest(id, { status: 'resolved', resolution_notes: 'Resolved from readiness center' }); toast.success('Request resolved'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Request update failed'); }
  }

  async function saveIncident(e) {
    e.preventDefault();
    try {
      await legalSecurityApi.createIncident({ ...incidentForm, affected_systems: incidentForm.affected_systems.split(',').map(x => x.trim()).filter(Boolean) });
      setIncidentForm(emptyIncident);
      toast.success('Incident logged');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Incident save failed'); }
  }

  async function closeIncident(id) {
    try { await legalSecurityApi.updateIncident(id, { status: 'closed', corrective_actions: 'Closed from readiness center' }); toast.success('Incident closed'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Incident update failed'); }
  }

  async function exportAuditPack() {
    try {
      const { data } = await legalSecurityApi.auditPack();
      setAuditPack(data);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hms-legal-security-audit-pack-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Audit pack exported');
    } catch (err) { toast.error(err.response?.data?.message || 'Export failed'); }
  }

  return <section className="page-stack">
    <div className="page-title-row">
      <div>
        <h1>Legal & Security Readiness</h1>
        <p className="muted">Prepare the SaaS product for pilots with policies, data request handling, incident response and audit evidence.</p>
      </div>
      <div className="actions"><button onClick={bootstrap}>Load Policy Templates</button><button onClick={exportAuditPack}>Export Audit Pack</button></div>
    </div>

    <div className="stats-grid">
      <div className="stat-card"><span>Policies</span><strong>{overview?.policies ?? 0}</strong><small>legal/security documents</small></div>
      <div className="stat-card"><span>Open Data Requests</span><strong>{overview?.openDataRequests ?? 0}</strong><small>privacy workflow</small></div>
      <div className="stat-card"><span>Open Incidents</span><strong>{overview?.openIncidents ?? 0}</strong><small>security response</small></div>
      <div className="stat-card"><span>Release Gate</span><strong>{overview?.releaseGate ? 'PASS' : 'CHECK'}</strong><small>pilot readiness signal</small></div>
    </div>

    <div className="grid two">
      <form className="card form" onSubmit={savePolicy}>
        <h3>Create Policy</h3>
        <input placeholder="Policy key e.g. privacy-policy" value={policyForm.policy_key} onChange={e => setPolicyForm({ ...policyForm, policy_key: e.target.value })} />
        <input placeholder="Policy title" value={policyForm.title} onChange={e => setPolicyForm({ ...policyForm, title: e.target.value })} required />
        <div className="grid two compact"><input placeholder="Version" value={policyForm.version} onChange={e => setPolicyForm({ ...policyForm, version: e.target.value })} /><select value={policyForm.category} onChange={e => setPolicyForm({ ...policyForm, category: e.target.value })}><option>legal</option><option>security</option><option>data_protection</option><option>operations</option></select></div>
        <textarea placeholder="Policy summary / content" rows="5" value={policyForm.content} onChange={e => setPolicyForm({ ...policyForm, content: e.target.value })} />
        <button>Save Policy</button>
      </form>

      <form className="card form" onSubmit={saveDataRequest}>
        <h3>Data Protection Request</h3>
        <input placeholder="Requester name" value={requestForm.requester_name} onChange={e => setRequestForm({ ...requestForm, requester_name: e.target.value })} required />
        <input placeholder="Requester email" value={requestForm.requester_email} onChange={e => setRequestForm({ ...requestForm, requester_email: e.target.value })} required />
        <div className="grid two compact"><select value={requestForm.request_type} onChange={e => setRequestForm({ ...requestForm, request_type: e.target.value })}><option>access</option><option>correction</option><option>deletion</option><option>export</option><option>consent_withdrawal</option></select><select value={requestForm.status} onChange={e => setRequestForm({ ...requestForm, status: e.target.value })}><option>open</option><option>in_progress</option><option>resolved</option><option>closed</option></select></div>
        <textarea placeholder="Request details" rows="5" value={requestForm.description} onChange={e => setRequestForm({ ...requestForm, description: e.target.value })} />
        <button>Create Request</button>
      </form>
    </div>

    <form className="card form" onSubmit={saveIncident}>
      <h3>Security Incident Register</h3>
      <div className="grid two compact"><input placeholder="Incident title" value={incidentForm.title} onChange={e => setIncidentForm({ ...incidentForm, title: e.target.value })} required /><select value={incidentForm.severity} onChange={e => setIncidentForm({ ...incidentForm, severity: e.target.value })}><option>low</option><option>medium</option><option>high</option><option>critical</option></select></div>
      <div className="grid two compact"><input placeholder="Affected systems comma separated" value={incidentForm.affected_systems} onChange={e => setIncidentForm({ ...incidentForm, affected_systems: e.target.value })} /><select value={incidentForm.status} onChange={e => setIncidentForm({ ...incidentForm, status: e.target.value })}><option>open</option><option>investigating</option><option>contained</option><option>closed</option></select></div>
      <textarea placeholder="Description" rows="3" value={incidentForm.description} onChange={e => setIncidentForm({ ...incidentForm, description: e.target.value })} />
      <textarea placeholder="Containment actions" rows="3" value={incidentForm.containment_actions} onChange={e => setIncidentForm({ ...incidentForm, containment_actions: e.target.value })} />
      <label className="check-row"><input type="checkbox" checked={incidentForm.patient_data_involved} onChange={e => setIncidentForm({ ...incidentForm, patient_data_involved: e.target.checked })} /> Patient data involved</label>
      <button>Log Incident</button>
    </form>

    <div className="card table-card"><h3>Policies</h3><table><thead><tr><th>ID</th><th>Title</th><th>Category</th><th>Version</th><th>Status</th><th>Next Review</th><th>Action</th></tr></thead><tbody>{policies.map(p => <tr key={p.id}><td>{p.id}</td><td>{p.title}</td><td>{p.category}</td><td>{p.version}</td><td><StatusBadge value={p.status} /></td><td>{p.next_review_date ? new Date(p.next_review_date).toLocaleDateString() : '-'}</td><td>{p.status !== 'approved' && <button className="mini" onClick={() => approvePolicy(p.id)}>Approve</button>}</td></tr>)}</tbody></table></div>
    <div className="grid two">
      <div className="card table-card"><h3>Data Requests</h3><table><thead><tr><th>ID</th><th>Requester</th><th>Type</th><th>Status</th><th>Action</th></tr></thead><tbody>{dataRequests.map(r => <tr key={r.id}><td>{r.id}</td><td>{r.requester_name}<br/><small>{r.requester_email}</small></td><td>{r.request_type}</td><td><StatusBadge value={r.status} /></td><td>{!['resolved','closed'].includes(r.status) && <button className="mini" onClick={() => closeDataRequest(r.id)}>Resolve</button>}</td></tr>)}</tbody></table></div>
      <div className="card table-card"><h3>Security Incidents</h3><table><thead><tr><th>ID</th><th>Title</th><th>Severity</th><th>Status</th><th>Action</th></tr></thead><tbody>{incidents.map(i => <tr key={i.id}><td>{i.id}</td><td>{i.title}</td><td><StatusBadge value={i.severity} /></td><td><StatusBadge value={i.status} /></td><td>{i.status !== 'closed' && <button className="mini" onClick={() => closeIncident(i.id)}>Close</button>}</td></tr>)}</tbody></table></div>
    </div>
    {auditPack && <div className="card"><h3>Latest Audit Pack Preview</h3><pre className="code-box">{JSON.stringify({ exported_at: auditPack.exported_at, policies: auditPack.policies?.length, dataRequests: auditPack.dataRequests?.length, incidents: auditPack.incidents?.length }, null, 2)}</pre></div>}
  </section>;
}
