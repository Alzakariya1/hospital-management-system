import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Activity, Database, HardDrive, RefreshCcw, ShieldCheck, TimerReset } from 'lucide-react';
import { operationsApi } from '../api';
import { DataTable, StatCard } from '../components';

const emptyVerification = {
  backup_type: 'manual',
  backup_location: '',
  restore_tested: false,
  status: 'pending',
  notes: '',
};

function fmtBytes(bytes = 0) {
  const n = Number(bytes || 0);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function ProductionOps({ permissions = {} }) {
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(emptyVerification);
  const [loading, setLoading] = useState(false);

  const canManage = permissions.securityManage || permissions.auditView;

  async function load() {
    try {
      setLoading(true);
      const { data } = await operationsApi.summary();
      setSummary(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Production ops summary failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveVerification(e) {
    e.preventDefault();
    if (!permissions.securityManage) return toast.error('Security manage permission required');
    try {
      await operationsApi.recordBackupVerification(form);
      setForm(emptyVerification);
      toast.success('Backup verification recorded');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Backup verification failed');
    }
  }

  const backupRows = useMemo(() => (summary?.backup_files || []).map((row) => ({
    ...row,
    size: fmtBytes(row.size_bytes),
  })), [summary]);

  if (!canManage) return <div className="card"><h2>Production Ops</h2><p className="muted">You do not have permission to view production operations.</p></div>;

  return (
    <div className="stack">
      <div className="section-head">
        <div>
          <h2>DevOps & Production Hardening</h2>
          <p className="muted">Health, backup verification, deployment readiness and monitoring indicators for enterprise HMS production runs.</p>
        </div>
        <button className="btn secondary" onClick={load} disabled={loading}><RefreshCcw size={16} /> Refresh</button>
      </div>

      <div className="stats">
        <StatCard icon={Database} title="Database" value={summary?.database || '--'} />
        <StatCard icon={Activity} title="Node Env" value={summary?.node_env || '--'} />
        <StatCard icon={TimerReset} title="Uptime" value={`${summary?.uptime_seconds || 0}s`} />
        <StatCard icon={ShieldCheck} title="Sentry" value={summary?.sentry_configured ? 'Configured' : 'Pending'} />
        <StatCard icon={HardDrive} title="Backups" value={summary?.backup_files?.length || 0} />
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Production Readiness</h3>
          <div className="details-grid">
            <span>Node Version</span><strong>{summary?.node_version || '--'}</strong>
            <span>Rate Limit Max</span><strong>{summary?.rate_limit_max || '--'}</strong>
            <span>CORS Configured</span><strong>{summary?.cors_origins_configured ? 'Yes' : 'No'}</strong>
            <span>Uptime Monitor</span><strong>{summary?.uptime_monitor_configured ? 'Configured' : 'Pending'}</strong>
            <span>Backup Directory</span><strong>{summary?.backup_dir || '--'}</strong>
          </div>
        </div>

        <form className="card form-grid" onSubmit={saveVerification}>
          <h3>Record Backup / Restore Verification</h3>
          <input placeholder="Backup type" value={form.backup_type} onChange={(e) => setForm({ ...form, backup_type: e.target.value })} />
          <input placeholder="Backup location" value={form.backup_location} onChange={(e) => setForm({ ...form, backup_location: e.target.value })} />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="pending">Pending</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="partial">Partial</option>
          </select>
          <label className="check-row"><input type="checkbox" checked={form.restore_tested} onChange={(e) => setForm({ ...form, restore_tested: e.target.checked })} /> Restore tested in staging</label>
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button className="btn" type="submit" disabled={!permissions.securityManage}>Save Verification</button>
        </form>
      </div>

      <div className="card">
        <h3>Recent Backup Files</h3>
        <DataTable rows={backupRows} hiddenKeys={['size_bytes']} />
      </div>

      <div className="card">
        <h3>Recent Backup Verification Logs</h3>
        <DataTable rows={summary?.backup_verifications || []} hiddenKeys={['_id', 'hospital_id']} />
      </div>
    </div>
  );
}
