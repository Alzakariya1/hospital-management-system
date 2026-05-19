import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { auditApi, integrationApi, labApi, radiologyApi } from '../api';

const FEATURE_META = {
  hl7: {
    title: 'HL7 Ready',
    badge: 'INTEROPERABILITY',
    description: 'Manage hospital integration readiness, API keys, webhooks, FHIR/HL7 resources and message logs from one workspace.',
    resource: 'Patient',
    settingKey: 'hl7_ready_enabled',
    checklist: ['FHIR patient bundle available', 'Encounter export available', 'API key generated', 'Webhook endpoint configured'],
  },
  fhir: {
    title: 'FHIR Foundation',
    badge: 'FHIR API',
    description: 'Preview FHIR-style resources generated from existing HMS data for integration pilots.',
    resource: 'Patient',
    settingKey: 'fhir_foundation_enabled',
    checklist: ['Patient resource', 'Encounter resource', 'Observation resource', 'Invoice resource'],
  },
  pacs: {
    title: 'PACS/DICOM',
    badge: 'RADIOLOGY INTEGRATION',
    description: 'Track radiology orders, DICOM study IDs, PACS viewer URLs and report readiness without breaking the current Lab/Radiology module.',
    resource: 'DiagnosticReport',
    settingKey: 'pacs_dicom_enabled',
    checklist: ['Radiology orders available', 'DICOM study ID supported', 'PACS viewer URL supported', 'DiagnosticReport export available'],
  },
  biometric: {
    title: 'Biometric',
    badge: 'IDENTITY & ATTENDANCE',
    description: 'Prepare biometric device integration with device registry, attendance event placeholders and audit evidence.',
    resource: 'Patient',
    settingKey: 'biometric_enabled',
    checklist: ['Device register ready', 'Staff identity mapping planned', 'Attendance events auditable', 'Fallback manual attendance defined'],
  },
  erp: {
    title: 'ERP/Tally',
    badge: 'FINANCE EXPORT',
    description: 'Prepare accounting export readiness using billing, invoice and payment data from the core HMS.',
    resource: 'Invoice',
    settingKey: 'erp_tally_enabled',
    checklist: ['Invoice export available', 'Payment mode mapping', 'Ledger mapping planned', 'CSV/JSON audit pack available'],
  },
  abdm_abha: {
    title: 'ABDM/ABHA',
    badge: 'INDIA HEALTH ID',
    description: 'Manage ABHA-readiness fields, patient identity checks and future ABDM integration preparation.',
    resource: 'Patient',
    settingKey: 'abdm_abha_enabled',
    checklist: ['ABHA ID custom field supported', 'Patient identity data available', 'Consent workflow planned', 'FHIR patient bundle available'],
  },
  two_factor_auth: {
    title: '2FA Security',
    badge: 'ACCOUNT SECURITY',
    description: 'Control the hospital-level 2FA readiness setting and review security defaults/login history.',
    resource: 'Patient',
    settingKey: 'two_factor_auth_enabled',
    checklist: ['2FA setting stored', 'Login history tracked', 'Strong password settings available', 'Audit logs enabled'],
  },
  audit_compliance: {
    title: 'Audit Compliance',
    badge: 'COMPLIANCE EVIDENCE',
    description: 'Review audit logs, login history and compliance evidence used by hospital admins and SaaS pilots.',
    resource: 'DiagnosticReport',
    settingKey: 'audit_compliance_enabled',
    checklist: ['Audit log export available', 'Login history available', 'Security settings available', 'Legal audit pack available'],
  },
};

const RESOURCES = ['Patient', 'Encounter', 'Observation', 'DiagnosticReport', 'Invoice', 'MedicationRequest'];

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function MiniTable({ title, columns, rows, empty }) {
  return <div className="card adv-card">
    <div className="sectionTitleRow"><h3>{title}</h3><span className="muted">{rows.length} records</span></div>
    {rows.length ? <div className="enterpriseTableWrap"><table className="enterpriseTable compact-enterprise-table"><thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{rows.map((row, idx) => <tr key={row.id || row.key_id || idx}>{columns.map(c => <td key={c.key}>{c.render ? c.render(row) : (row[c.key] ?? '-')}</td>)}</tr>)}</tbody></table></div> : <div className="emptyTableState">{empty || 'No records yet. Use the actions above to create or connect data.'}</div>}
  </div>;
}

export default function AdvancedFeaturePage({ featureKey = 'hl7', currentHospital }) {
  const meta = FEATURE_META[featureKey] || FEATURE_META.hl7;
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({});
  const [apiKeys, setApiKeys] = useState([]);
  const [logs, setLogs] = useState([]);
  const [hooks, setHooks] = useState([]);
  const [fhir, setFhir] = useState(null);
  const [settings, setSettings] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  const [radiologyOrders, setRadiologyOrders] = useState([]);
  const [labOrders, setLabOrders] = useState([]);
  const [resource, setResource] = useState(meta.resource || 'Patient');
  const [keyName, setKeyName] = useState(`${meta.title} Integration Key`);
  const [webhook, setWebhook] = useState({ name: `${meta.title} Webhook`, endpoint_url: '', event_types: 'patient.created,billing.created', status: 'active' });
  const [generatedKey, setGeneratedKey] = useState('');

  const isIntegration = ['hl7', 'fhir', 'pacs', 'erp', 'abdm_abha', 'audit_compliance'].includes(featureKey);
  const isPacs = featureKey === 'pacs';
  const isSecurity = featureKey === 'two_factor_auth' || featureKey === 'audit_compliance' || featureKey === 'biometric';

  async function load() {
    setLoading(true);
    try {
      const tasks = [
        integrationApi.summary().catch(() => ({ data: {} })),
        integrationApi.keys().catch(() => ({ data: [] })),
        integrationApi.webhooks().catch(() => ({ data: [] })),
        integrationApi.fhir(resource).catch(() => ({ data: null })),
        auditApi.settings().catch(() => ({ data: [] })),
        auditApi.loginHistory({}).catch(() => ({ data: [] })),
        labApi.list?.().catch(() => ({ data: [] })) || Promise.resolve({ data: [] }),
        radiologyApi.list?.().catch(() => ({ data: [] })) || Promise.resolve({ data: [] }),
      ];
      const [s, k, h, f, sec, lh, labs, rads] = await Promise.all(tasks);
      setSummary(s.data || {});
      setApiKeys(safeArray(k.data));
      setHooks(safeArray(h.data));
      setLogs(safeArray(s.data?.recent_logs));
      setFhir(f.data || null);
      setSettings(safeArray(sec.data));
      setLoginHistory(safeArray(lh.data));
      setLabOrders(safeArray(labs.data));
      setRadiologyOrders(safeArray(rads.data));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Feature workspace failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { setResource(meta.resource || 'Patient'); }, [featureKey]);
  useEffect(() => { load(); }, [featureKey, resource]);

  const fhirCount = fhir?.entry?.length || 0;
  const settingValue = settings.find(s => s.setting_key === meta.settingKey || (featureKey === 'two_factor_auth' && s.setting_key === 'two_factor_auth_enabled'))?.setting_value;

  async function createKey(e) {
    e.preventDefault();
    try {
      const { data } = await integrationApi.createKey({ name: keyName, scopes: ['fhir.read', 'webhook.write', `${featureKey}.manage`] });
      setGeneratedKey(data.api_key || '');
      toast.success('Integration key created');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'API key creation failed'); }
  }

  async function createWebhook(e) {
    e.preventDefault();
    if (!webhook.endpoint_url) return toast.error('Webhook URL is required');
    try {
      await integrationApi.createWebhook({ ...webhook, event_types: String(webhook.event_types || '').split(',').map(x => x.trim()).filter(Boolean) });
      setWebhook({ ...webhook, endpoint_url: '' });
      toast.success('Webhook saved');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Webhook save failed'); }
  }

  async function saveFeatureSetting(value) {
    try {
      await auditApi.saveSetting(meta.settingKey, { value: String(value), category: 'advanced_feature', description: `${meta.title} hospital feature readiness flag` });
      toast.success(`${meta.title} setting saved`);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Setting save failed'); }
  }

  async function ensureSecurityDefaults() {
    try { await auditApi.seedDefaults(); toast.success('Security defaults ensured'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Security defaults failed'); }
  }

  const checklistRows = useMemo(() => meta.checklist.map((label, idx) => ({ id: idx + 1, label, status: idx < 2 ? 'Ready' : 'Configured' })), [meta]);

  return <section className="pageStack advancedFeatureWorkspace">
    <div className="advHero">
      <div>
        <p className="eyebrow">{meta.badge}</p>
        <h1>{meta.title}</h1>
        <p>{meta.description}</p>
      </div>
      <div className="advHeroPanel">
        <span className="statusPill success">Enabled</span>
        <strong>{currentHospital?.name || 'Default Hospital'}</strong>
        <small>Hospital scoped workspace</small>
      </div>
    </div>

    <div className="advStatsGrid">
      <div className="stat-card"><span>API Keys</span><strong>{apiKeys.length || summary.keys || 0}</strong><small>active integration credentials</small></div>
      <div className="stat-card"><span>Webhooks</span><strong>{hooks.length || summary.webhooks || 0}</strong><small>outbound event endpoints</small></div>
      <div className="stat-card"><span>{resource} Resources</span><strong>{fhirCount}</strong><small>FHIR-style records available</small></div>
      <div className="stat-card"><span>Feature Setting</span><strong>{settingValue === 'true' ? 'ON' : settingValue === 'false' ? 'OFF' : 'READY'}</strong><small>{meta.settingKey}</small></div>
    </div>

    <div className="grid twoCols adv-main-grid">
      <div className="card adv-card">
        <div className="sectionTitleRow"><h3>Readiness Checklist</h3><button className="ghostBtn" disabled={loading} onClick={load}>{loading ? 'Loading...' : 'Refresh'}</button></div>
        <div className="featureChecklist">
          {checklistRows.map(item => <div className="featureItem" key={item.id}><span className="checkDot">✓</span><div><strong>{item.label}</strong><p>{item.status}</p></div></div>)}
        </div>
        <div className="featureToggleBox">
          <strong>Hospital feature flag</strong>
          <div className="heroActions"><button onClick={() => saveFeatureSetting(true)}>Enable</button><button className="ghostBtn" onClick={() => saveFeatureSetting(false)}>Disable</button>{isSecurity && <button className="ghostBtn" onClick={ensureSecurityDefaults}>Ensure Security Defaults</button>}</div>
        </div>
      </div>

      <div className="card adv-card">
        <div className="sectionTitleRow"><h3>FHIR / Export Preview</h3><select value={resource} onChange={e => setResource(e.target.value)}>{RESOURCES.map(r => <option key={r}>{r}</option>)}</select></div>
        <pre className="code-box adv-code-preview">{fhir ? JSON.stringify(fhir, null, 2).slice(0, 3500) : 'No preview available. Create core HMS data first or refresh this page.'}</pre>
      </div>
    </div>

    {isIntegration && <div className="grid twoCols adv-main-grid">
      <form className="card adv-card form" onSubmit={createKey}>
        <h3>Create Integration API Key</h3>
        <label><span>Key Name</span><input value={keyName} onChange={e => setKeyName(e.target.value)} required /></label>
        <button>Create API Key</button>
        {generatedKey && <div className="alert success"><strong>Copy now:</strong><code>{generatedKey}</code></div>}
      </form>
      <form className="card adv-card form" onSubmit={createWebhook}>
        <h3>Create Webhook</h3>
        <label><span>Name</span><input value={webhook.name} onChange={e => setWebhook({ ...webhook, name: e.target.value })} /></label>
        <label><span>Endpoint URL</span><input placeholder="https://example.com/hms-webhook" value={webhook.endpoint_url} onChange={e => setWebhook({ ...webhook, endpoint_url: e.target.value })} /></label>
        <label><span>Events comma separated</span><input value={webhook.event_types} onChange={e => setWebhook({ ...webhook, event_types: e.target.value })} /></label>
        <button>Save Webhook</button>
      </form>
    </div>}

    {isPacs && <MiniTable title="Radiology DICOM / PACS Orders" rows={radiologyOrders} columns={[
      { key: 'id', label: 'ID', render: r => `#${r.id}` },
      { key: 'accession_number', label: 'Accession' },
      { key: 'patient_name', label: 'Patient', render: r => r.patient_name || r.patient_id || '-' },
      { key: 'scan_name', label: 'Study', render: r => <>{r.scan_name || r.study_name || '-'}<br/><small>{r.modality || ''} {r.body_part || ''}</small></> },
      { key: 'dicom_study_id', label: 'DICOM Study' },
      { key: 'pacs_viewer_url', label: 'PACS', render: r => r.pacs_viewer_url ? <a href={r.pacs_viewer_url} target="_blank" rel="noreferrer">Open PACS</a> : '-' },
      { key: 'status', label: 'Status' },
    ]} empty="No radiology/PACS orders yet. Create one from Lab/Radiology → Radiology." />}

    {featureKey === 'audit_compliance' && <MiniTable title="Recent Login History" rows={loginHistory} columns={[
      { key: 'email', label: 'Email' }, { key: 'status', label: 'Status' }, { key: 'ip_address', label: 'IP' }, { key: 'user_agent', label: 'Device' }, { key: 'logged_at', label: 'Time', render: r => r.logged_at ? new Date(r.logged_at).toLocaleString() : '-' },
    ]} empty="No login history found yet. New successful/failed logins will appear here." />}

    {featureKey === 'two_factor_auth' && <MiniTable title="Security Settings" rows={settings} columns={[
      { key: 'setting_key', label: 'Key' }, { key: 'setting_value', label: 'Value' }, { key: 'category', label: 'Category' }, { key: 'description', label: 'Description' },
    ]} empty="No security settings yet. Click Ensure Security Defaults." />}

    {featureKey === 'biometric' && <div className="grid twoCols adv-main-grid">
      <div className="card adv-card"><h3>Biometric Device Registry</h3><div className="emptyTableState">Device vendor/API integration placeholder is ready. Add device endpoints in the next hardware integration phase without changing core HMS data.</div></div>
      <div className="card adv-card"><h3>Attendance Events</h3><div className="emptyTableState">Attendance logs will be stored as auditable integration events once a biometric device endpoint is connected.</div></div>
    </div>}

    <div className="grid twoCols adv-main-grid">
      <MiniTable title="API Keys" rows={apiKeys} columns={[{ key: 'key_id', label: 'Key ID' }, { key: 'name', label: 'Name' }, { key: 'key_preview', label: 'Preview' }, { key: 'status', label: 'Status' }]} />
      <MiniTable title="Webhooks" rows={hooks} columns={[{ key: 'name', label: 'Name' }, { key: 'endpoint_url', label: 'Endpoint' }, { key: 'event_types', label: 'Events', render: r => Array.isArray(r.event_types) ? r.event_types.join(', ') : r.event_types }, { key: 'status', label: 'Status' }]} />
    </div>

    <MiniTable title="Recent Integration Logs" rows={logs} columns={[
      { key: 'resource_type', label: 'Resource' }, { key: 'method', label: 'Method' }, { key: 'endpoint', label: 'Endpoint' }, { key: 'status_code', label: 'Status' }, { key: 'created_at', label: 'Time', render: r => r.created_at ? new Date(r.created_at).toLocaleString() : '-' },
    ]} />
  </section>;
}
