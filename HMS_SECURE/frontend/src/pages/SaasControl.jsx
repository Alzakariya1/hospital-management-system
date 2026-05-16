import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Building2, Crown, Download, Gauge, IndianRupee, ShieldAlert, Users } from 'lucide-react';
import { saasApi } from '../api';

const money = (value = 0) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

function PlanBadge({ plan }) {
  return <span className={`statusPill statusPill-${plan || 'clinic'}`}>{plan || 'clinic'}</span>;
}

function UsageBar({ label, item }) {
  const percent = Number(item?.percent || 0);
  const danger = percent >= 90;
  const warn = percent >= 75 && !danger;
  return (
    <div className="usageRow">
      <div className="usageRowTop">
        <span>{label}</span>
        <b>{item?.used ?? 0}{item?.limit ? ` / ${item.limit}` : ''}</b>
      </div>
      <div className="usageTrack">
        <div className={`usageFill ${danger ? 'danger' : warn ? 'warning' : ''}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
}

export default function SaasControl() {
  const [data, setData] = useState({ summary: {}, tenants: [], plans: [] });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  async function load() {
    setLoading(true);
    try {
      const res = await saasApi.overview();
      setData(res.data || { summary: {}, tenants: [], plans: [] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load SaaS control center');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data.tenants || []).filter((row) => {
      const matchesSearch = !q || [row.name, row.hospital_code, row.plan].some((v) => String(v || '').toLowerCase().includes(q));
      const matchesPlan = planFilter === 'all' || row.plan === planFilter;
      const subStatus = row.subscription?.status || row.status || 'unknown';
      const matchesStatus = statusFilter === 'all' || subStatus === statusFilter;
      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [data.tenants, query, planFilter, statusFilter]);

  async function exportCsv() {
    try {
      const res = await saasApi.exportTenants();
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'saas-tenants-export.csv';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Export failed');
    }
  }

  const summary = data.summary || {};
  const riskyTenants = (data.tenants || []).filter((t) => t.warnings?.length);

  return (
    <section className="saasControl">
      <div className="sectionHeader heroHeader">
        <div>
          <span className="eyebrow">Platform owner</span>
          <h1>SaaS Control Center</h1>
          <p>Monitor hospital tenants, plans, subscription health, usage limits and commercial readiness from one place.</p>
        </div>
        <div className="headerActions">
          <button type="button" className="ghostBtn" onClick={load} disabled={loading}>Refresh</button>
          <button type="button" onClick={exportCsv}><Download size={16} /> Export CSV</button>
        </div>
      </div>

      <div className="statsGrid saasStats">
        <div className="statCard"><span>Total hospitals</span><strong>{summary.total_tenants || 0}</strong><small>{summary.active_tenants || 0} active</small><Building2 size={24} /></div>
        <div className="statCard"><span>Active MRR</span><strong>{money(summary.monthly_recurring_revenue)}</strong><small>Based on active plan pricing</small><IndianRupee size={24} /></div>
        <div className="statCard"><span>Recorded revenue</span><strong>{money(summary.total_revenue_recorded)}</strong><small>From hospital billing data</small><Gauge size={24} /></div>
        <div className="statCard"><span>Needs attention</span><strong>{riskyTenants.length}</strong><small>Limit/subscription warnings</small><ShieldAlert size={24} /></div>
      </div>

      <div className="grid twoCol saasPanels">
        <div className="card">
          <div className="sectionTitleRow compact"><div><h3>Plan breakdown</h3><p>Tenant count by plan</p></div></div>
          <div className="planBreakdown">
            {(data.plans || []).map((plan) => (
              <div className="planLine" key={plan.id}>
                <div><Crown size={16} /><b>{plan.name}</b><span>{money(plan.monthly_price_inr)}/mo</span></div>
                <strong>{summary.plan_breakdown?.[plan.id] || 0}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="sectionTitleRow compact"><div><h3>Subscription status</h3><p>Commercial health summary</p></div></div>
          <div className="planBreakdown">
            {Object.entries(summary.status_breakdown || {}).map(([status, count]) => (
              <div className="planLine" key={status}>
                <div><Users size={16} /><b className="capitalize">{status}</b><span>subscription state</span></div>
                <strong>{count}</strong>
              </div>
            ))}
            {!Object.keys(summary.status_breakdown || {}).length && <p className="muted">No status data yet.</p>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="sectionTitleRow">
          <div>
            <h2>Tenant usage monitor</h2>
            <p>Search hospitals and spot tenants that are close to plan limits.</p>
          </div>
        </div>
        <div className="filterRow">
          <input placeholder="Search hospital, code or plan" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
            <option value="all">All plans</option>
            {(data.plans || []).map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="trial">Trial</option>
            <option value="active">Active</option>
            <option value="past_due">Past Due</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="tenantUsageList">
          {loading && <p className="muted">Loading SaaS control center...</p>}
          {!loading && filtered.map((tenant) => (
            <article className="tenantUsageCard" key={tenant.id}>
              <div className="tenantUsageHead">
                <div>
                  <h3>{tenant.name}</h3>
                  <p>{tenant.hospital_code || `HOSP-${tenant.id}`} · {tenant.type || 'hospital'}</p>
                </div>
                <div className="tenantTags"><PlanBadge plan={tenant.plan} /><span className="statusPill mutedPill">{tenant.subscription?.status || tenant.status}</span></div>
              </div>
              <div className="usageGrid">
                <UsageBar label="Users" item={tenant.limitHealth?.users} />
                <UsageBar label="Patients" item={tenant.limitHealth?.patients} />
                <UsageBar label="Doctors" item={tenant.limitHealth?.doctors} />
                <UsageBar label="Appointments/month" item={tenant.limitHealth?.appointments_per_month} />
                <UsageBar label="Medicines" item={tenant.limitHealth?.medicines} />
              </div>
              <div className="tenantFooter">
                <span>{tenant.enabled_modules_count || 0} modules · {tenant.feature_flags_count || 0} features enabled</span>
                <strong>{money(tenant.revenue)} recorded revenue</strong>
              </div>
              {!!tenant.warnings?.length && <div className="warningBox">{tenant.warnings.join(' · ')}</div>}
            </article>
          ))}
          {!loading && !filtered.length && <p className="muted">No tenants match the current filters.</p>}
        </div>
      </div>
    </section>
  );
}
