import React, { useEffect, useMemo, useState } from 'react';
import { configurationApi } from '../api/configurationApi';
import { DataTable } from '../components';

const emptyField = {
  target_module: 'patients',
  label: '',
  field_key: '',
  field_type: 'text',
  placeholder: '',
  section: 'Additional Details',
  help_text: '',
  required: false,
  options: '',
  default_value: '',
  display_order: 100,
  is_active: true,
};

const moduleLabels = {
  patients: 'Patients',
  doctors: 'Doctors',
  appointments: 'Appointments',
  billing: 'Billing',
  lab: 'Laboratory',
  radiology: 'Radiology',
  pharmacy: 'Pharmacy',
  ipd: 'IPD',
  opd: 'OPD',
};

function buildKey(label = '') {
  return String(label).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export default function Configuration({ permissions = {} }) {
  const [fields, setFields] = useState([]);
  const [form, setForm] = useState(emptyField);
  const [editingId, setEditingId] = useState(null);
  const [moduleFilter, setModuleFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    try {
      const { data } = await configurationApi.listDynamicFields(moduleFilter === 'all' ? {} : { module: moduleFilter });
      setFields(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [moduleFilter]);

  const grouped = useMemo(() => fields.reduce((acc, row) => {
    acc[row.target_module] = (acc[row.target_module] || 0) + 1;
    return acc;
  }, {}), [fields]);

  async function submit(e) {
    e.preventDefault();
    setMessage('');
    const payload = {
      ...form,
      field_key: form.field_key || buildKey(form.label),
      display_order: Number(form.display_order || 100),
      options: String(form.options || '').split(',').map(x => x.trim()).filter(Boolean),
    };
    try {
      if (editingId) {
        await configurationApi.updateDynamicField(editingId, payload);
        setMessage('Dynamic field updated successfully.');
      } else {
        await configurationApi.createDynamicField(payload);
        setMessage('Dynamic field created successfully.');
      }
      setForm(emptyField);
      setEditingId(null);
      await load();
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Unable to save dynamic field.');
    }
  }

  function edit(row) {
    setEditingId(row.id);
    setForm({
      target_module: row.target_module || 'patients',
      label: row.label || '',
      field_key: row.field_key || '',
      field_type: row.field_type || 'text',
      placeholder: row.placeholder || '',
      section: row.section || 'Additional Details',
      help_text: row.help_text || '',
      required: Boolean(row.required),
      options: Array.isArray(row.options) ? row.options.join(', ') : '',
      default_value: row.default_value || '',
      display_order: row.display_order || 100,
      is_active: row.is_active !== false,
    });
  }

  async function toggle(row) {
    await configurationApi.updateDynamicFieldStatus(row.id, !row.is_active);
    await load();
  }

  async function remove(row) {
    if (!confirm(`Delete field ${row.label || row.field_key}? Existing saved values will remain in records but the field will no longer show in forms.`)) return;
    await configurationApi.deleteDynamicField(row.id);
    await load();
  }

  return (
    <section className="configuration-page">
      <div className="page-intro-card">
        <div>
          <span className="doctor-kicker">No-Code Configuration</span>
          <h1>Dynamic Forms</h1>
          <p className="muted">Add hospital-specific fields to patient, doctor and clinical workflows without code changes.</p>
        </div>
        <div className="config-summary-grid">
          <div><b>{fields.length}</b><span>Total Fields</span></div>
          <div><b>{fields.filter(x => x.is_active !== false).length}</b><span>Active</span></div>
          <div><b>{Object.keys(grouped).length}</b><span>Modules</span></div>
        </div>
      </div>

      <div className="config-layout-grid">
        <form className="card form configuration-form" onSubmit={submit}>
          <h2>{editingId ? 'Edit Dynamic Field' : 'Create Dynamic Field'}</h2>
          {message && <p className="muted">{message}</p>}
          <div className="formGrid">
            <select value={form.target_module} onChange={e => setForm({ ...form, target_module: e.target.value })}>
              {Object.entries(moduleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <input placeholder="Label e.g. ABHA ID" value={form.label} required onChange={e => setForm({ ...form, label: e.target.value, field_key: form.field_key || buildKey(e.target.value) })} />
            <input placeholder="Field key e.g. abha_id" value={form.field_key} required onChange={e => setForm({ ...form, field_key: buildKey(e.target.value) })} />
            <select value={form.field_type} onChange={e => setForm({ ...form, field_type: e.target.value })}>
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="select">Select</option>
              <option value="textarea">Textarea</option>
              <option value="checkbox">Checkbox</option>
            </select>
            <input placeholder="Section" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} />
            <input placeholder="Placeholder" value={form.placeholder} onChange={e => setForm({ ...form, placeholder: e.target.value })} />
            <input placeholder="Options: one, two, three" value={form.options} disabled={form.field_type !== 'select'} onChange={e => setForm({ ...form, options: e.target.value })} />
            <input type="number" placeholder="Display order" value={form.display_order} onChange={e => setForm({ ...form, display_order: e.target.value })} />
          </div>
          <textarea placeholder="Help text" value={form.help_text} onChange={e => setForm({ ...form, help_text: e.target.value })} />
          <div className="config-checkbox-row">
            <label><input type="checkbox" checked={form.required} onChange={e => setForm({ ...form, required: e.target.checked })} /> Required field</label>
            <label><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button disabled={!permissions.configurationManage}>{editingId ? 'Update Field' : 'Create Field'}</button>
            {editingId && <button type="button" className="secondaryBtn" onClick={() => { setEditingId(null); setForm(emptyField); }}>Cancel</button>}
          </div>
        </form>

        <div className="card configuration-guide">
          <h3>Enterprise use cases</h3>
          <ul>
            <li>Add ABHA ID, passport, insurance or custom ID fields per hospital.</li>
            <li>Add doctor credential fields without frontend code changes.</li>
            <li>Keep data inside <b>custom_fields</b> so old records stay safe.</li>
            <li>Fields are tenant/hospital isolated.</li>
          </ul>
        </div>
      </div>

      <div className="card">
        <div className="patient-document-header">
          <div>
            <h2>Configured Fields</h2>
            <p className="muted">These fields will appear in supported module forms.</p>
          </div>
          <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="all">All modules</option>
            {Object.entries(moduleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
        {loading ? <p className="muted">Loading fields...</p> : (
          <DataTable
            rows={fields.map(row => ({ ...row, module_label: moduleLabels[row.target_module] || row.target_module, options_text: Array.isArray(row.options) ? row.options.join(', ') : '' }))}
            cols={['id', 'module_label', 'label', 'field_key', 'field_type', 'section', r => r.required ? 'Required' : 'Optional', r => r.is_active === false ? 'Inactive' : 'Active']}
            onEdit={permissions.configurationManage ? edit : null}
            onDelete={permissions.configurationManage ? remove : null}
            extraActions={permissions.configurationManage ? [{ label: 'Toggle Active', onClick: toggle }] : []}
          />
        )}
      </div>
    </section>
  );
}
