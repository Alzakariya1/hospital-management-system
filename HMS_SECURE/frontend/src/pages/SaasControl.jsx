import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Building2, Crown, Download, Gauge, IndianRupee, ShieldAlert, Users, PlayCircle, PauseCircle, XCircle, ReceiptText, CreditCard, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
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
  const [billing, setBilling] = useState({ summary: {}, invoices: [], intents: [] });
  const [invoiceForm, setInvoiceForm] = useState({ hospital_id: '', billing_cycle: 'monthly', tax_amount: '0', discount_amount: '0', due_date: '' });
  const [paymentForms, setPaymentForms] = useState({});

  async function load() {
    setLoading(true);
    try {
      const [res, invoiceRes, billingRes, intentRes] = await Promise.all([
        saasApi.overview(),
        saasApi.invoices(),
        saasApi.billingSummary(),
        saasApi.paymentIntents(),
      ]);
      setData(res.data || { summary: {}, tenants: [], plans: [] });
      setBilling({ invoices: invoiceRes.data || [], summary: billingRes.data || {}, intents: intentRes.data || [] });
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

  async function tenantAction(tenant, action) {
    try {
      await saasApi.lifecycle(tenant.id, { action });
      toast.success(`Tenant ${action} updated`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Tenant action failed');
    }
  }

  async function changePlan(tenant, plan) {
    try {
      await saasApi.updateSubscription(tenant.id, { plan });
      toast.success('Plan updated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Plan update failed');
    }
  }



  async function generateInvoice(e) {
    e.preventDefault();
    if (!invoiceForm.hospital_id) return toast.error('Select a hospital first');
    try {
      await saasApi.generateInvoice({
        ...invoiceForm,
        hospital_id: Number(invoiceForm.hospital_id),
        tax_amount: Number(invoiceForm.tax_amount || 0),
        discount_amount: Number(invoiceForm.discount_amount || 0),
      });
      toast.success('Subscription invoice generated');
      setInvoiceForm({ hospital_id: '', billing_cycle: 'monthly', tax_amount: '0', discount_amount: '0', due_date: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invoice generation failed');
    }
  }

  async function recordPayment(invoice) {
    const form = paymentForms[invoice.id] || {};
    if (!Number(form.amount || 0)) return toast.error('Enter a valid payment amount');
    try {
      await saasApi.recordPayment(invoice.id, {
        amount: Number(form.amount || 0),
        payment_mode: form.payment_mode || 'manual',
        transaction_id: form.transaction_id || '',
        notes: form.notes || '',
      });
      toast.success('Payment recorded');
      setPaymentForms((prev) => ({ ...prev, [invoice.id]: {} }));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    }
  }



  async function createPaymentLink(invoice) {
    try {
      const res = await saasApi.createPaymentLink(invoice.id, { amount: invoice.balance_amount || invoice.total_amount });
      const url = res.data?.intent?.payment_link_url;
      if (url && navigator.clipboard) await navigator.clipboard.writeText(url);
      toast.success(url ? 'Payment link created and copied' : 'Payment link created');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment link creation failed');
    }
  }

  async function confirmIntent(intent) {
    try {
      await saasApi.confirmPaymentIntent(intent.id, { transaction_id: intent.payment_link_id });
      toast.success('Gateway payment confirmed');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment confirmation failed');
    }
  }

  async function markOverdue() {
    try {
      const res = await saasApi.markOverdueInvoices();
      toast.success(`${res.data?.updated || 0} overdue invoice(s) updated`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Overdue scan failed');
    }
  }

  async function markInvoiceStatus(invoice, status) {
    try {
      await saasApi.updateInvoiceStatus(invoice.id, { status });
      toast.success('Invoice status updated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status update failed');
    }
  }

  async function exportInvoices() {
    try {
      const res = await saasApi.exportInvoices();
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'saas-subscription-invoices.csv';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invoice export failed');
    }
  }

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
              <div className="tenantLifecyclePanel">
                <select value={tenant.plan || 'clinic'} onChange={(e) => changePlan(tenant, e.target.value)}>
                  {(data.plans || []).map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                </select>
                <button type="button" className="ghostBtn" onClick={() => tenantAction(tenant, 'activate')}><PlayCircle size={14} /> Activate</button>
                <button type="button" className="ghostBtn" onClick={() => tenantAction(tenant, 'trial')}><Crown size={14} /> Trial</button>
                <button type="button" className="ghostBtn" onClick={() => tenantAction(tenant, 'suspend')}><PauseCircle size={14} /> Suspend</button>
                <button type="button" className="ghostBtn dangerText" onClick={() => tenantAction(tenant, 'cancel')}><XCircle size={14} /> Cancel</button>
              </div>
              <div className="billingMeta">
                <span>Billing: {tenant.subscription?.billing_cycle || 'monthly'}</span>
                <span>Renewal: {tenant.subscription?.renewal_date || tenant.subscription?.next_billing_date || 'Not set'}</span>
                <span>Trial ends: {tenant.subscription?.trial_end_date || '—'}</span>
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

      <div className="card saasBillingPanel">
        <div className="sectionTitleRow">
          <div>
            <h2>Subscription invoices & payments</h2>
            <p>Generate tenant subscription invoices, track due balances and record manual payments.</p>
          </div>
          <div className="headerActions"><button type="button" className="ghostBtn" onClick={markOverdue}><ShieldAlert size={16} /> Mark overdue</button><button type="button" className="ghostBtn" onClick={exportInvoices}><Download size={16} /> Export invoices</button></div>
        </div>

        <div className="statsGrid saasStats compactStats">
          <div className="statCard"><span>Total billed</span><strong>{money(billing.summary?.total_billed)}</strong><small>{billing.summary?.total_invoices || 0} invoices</small><ReceiptText size={24} /></div>
          <div className="statCard"><span>Collected</span><strong>{money(billing.summary?.total_collected)}</strong><small>Subscription payments</small><CreditCard size={24} /></div>
          <div className="statCard"><span>Outstanding</span><strong>{money(billing.summary?.total_due)}</strong><small>Pending/partial/overdue</small><ShieldAlert size={24} /></div>
        </div>

        <form className="invoiceBuilder" onSubmit={generateInvoice}>
          <select value={invoiceForm.hospital_id} onChange={(e) => setInvoiceForm({ ...invoiceForm, hospital_id: e.target.value })}>
            <option value="">Select hospital</option>
            {(data.tenants || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} · {tenant.plan}</option>)}
          </select>
          <select value={invoiceForm.billing_cycle} onChange={(e) => setInvoiceForm({ ...invoiceForm, billing_cycle: e.target.value })}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
          <input type="number" placeholder="Tax amount" value={invoiceForm.tax_amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, tax_amount: e.target.value })} />
          <input type="number" placeholder="Discount amount" value={invoiceForm.discount_amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, discount_amount: e.target.value })} />
          <input type="date" value={invoiceForm.due_date} onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })} />
          <button type="submit"><ReceiptText size={16} /> Generate invoice</button>
        </form>

        <div className="tenantUsageList invoiceList">
          {(billing.invoices || []).slice(0, 12).map((invoice) => {
            const form = paymentForms[invoice.id] || {};
            return (
              <article className="tenantUsageCard invoiceCard" key={invoice.id}>
                <div className="tenantUsageHead">
                  <div>
                    <h3>{invoice.invoice_number}</h3>
                    <p>{invoice.hospital_name} · {invoice.plan_name || invoice.plan} · Due {invoice.due_date || 'Not set'}</p>
                  </div>
                  <div className="tenantTags"><span className={`statusPill statusPill-${invoice.status}`}>{invoice.status}</span></div>
                </div>
                <div className="billingMeta">
                  <span>Total: {money(invoice.total_amount)}</span>
                  <span>Paid: {money(invoice.paid_amount)}</span>
                  <span>Balance: {money(invoice.balance_amount)}</span>
                  <span>Period: {invoice.period_start || '—'} to {invoice.period_end || '—'}</span>
                </div>
                <div className="invoicePaymentRow">
                  <input type="number" placeholder="Payment amount" value={form.amount || ''} onChange={(e) => setPaymentForms((prev) => ({ ...prev, [invoice.id]: { ...form, amount: e.target.value } }))} />
                  <select value={form.payment_mode || 'manual'} onChange={(e) => setPaymentForms((prev) => ({ ...prev, [invoice.id]: { ...form, payment_mode: e.target.value } }))}>
                    <option value="manual">Manual</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                    <option value="payment_gateway">Payment gateway</option>
                  </select>
                  <input placeholder="Transaction ID" value={form.transaction_id || ''} onChange={(e) => setPaymentForms((prev) => ({ ...prev, [invoice.id]: { ...form, transaction_id: e.target.value } }))} />
                  <button type="button" className="ghostBtn" onClick={() => recordPayment(invoice)}><CreditCard size={14} /> Record payment</button>
                  {invoice.status !== 'paid' && invoice.status !== 'cancelled' && <button type="button" className="ghostBtn" onClick={() => createPaymentLink(invoice)}><LinkIcon size={14} /> Payment link</button>}
                  {invoice.status !== 'cancelled' && <button type="button" className="ghostBtn dangerText" onClick={() => markInvoiceStatus(invoice, 'cancelled')}>Cancel invoice</button>}
                </div>
                {!!invoice.payments?.length && <div className="paymentHistory">Last payment: {money(invoice.payments[0].amount)} via {invoice.payments[0].payment_mode} on {invoice.payments[0].payment_date}</div>}
              </article>
            );
          })}
          {!(billing.invoices || []).length && <p className="muted">No SaaS subscription invoices generated yet.</p>}
        </div>

        <div className="sectionTitleRow compact gatewayTitle">
          <div>
            <h3>Payment gateway readiness</h3>
            <p>Generated payment links can be connected to Razorpay, Stripe, PayU or any future gateway webhook.</p>
          </div>
        </div>
        <div className="tenantUsageList invoiceList">
          {(billing.intents || []).slice(0, 8).map((intent) => (
            <article className="tenantUsageCard invoiceCard gatewayCard" key={intent.id}>
              <div className="tenantUsageHead">
                <div>
                  <h3>{intent.payment_link_id}</h3>
                  <p>{intent.invoice_number} · {intent.gateway} · expires {intent.expires_at || 'Not set'}</p>
                </div>
                <div className="tenantTags"><span className={`statusPill statusPill-${intent.status}`}>{intent.status}</span></div>
              </div>
              <div className="billingMeta">
                <span>Amount: {money(intent.amount)}</span>
                <span>Currency: {intent.currency || 'INR'}</span>
                <span>Transaction: {intent.transaction_id || 'Pending'}</span>
              </div>
              <div className="invoicePaymentRow">
                {intent.payment_link_url && <a className="ghostBtn linkBtn" href={intent.payment_link_url} target="_blank" rel="noreferrer"><LinkIcon size={14} /> Open link</a>}
                {intent.status !== 'paid' && <button type="button" className="ghostBtn" onClick={() => confirmIntent(intent)}><CheckCircle2 size={14} /> Confirm paid</button>}
              </div>
            </article>
          ))}
          {!(billing.intents || []).length && <p className="muted">No payment links generated yet.</p>}
        </div>
      </div>
    </section>
  );
}
