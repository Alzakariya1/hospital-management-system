import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { CalendarClock, CheckCircle2, ClipboardList, Globe2, Megaphone, PencilLine, PlayCircle, Sparkles } from 'lucide-react';
import { salesApi } from '../api';

const emptyDemo = { name: '', email: '', phone: '', organization: '', organization_type: 'hospital', city: '', staff_size: '', interest: 'OPD, Billing, Lab, Pharmacy', preferred_demo_date: '', message: '' };

function Pill({ children }) {
  return <span className="statusPill success">{children}</span>;
}

export default function SalesDemoCenter() {
  const [marketing, setMarketing] = useState({ product: {}, plans: [], highlights: [] });
  const [requests, setRequests] = useState([]);
  const [assets, setAssets] = useState({ demo_flow: [], objection_answers: [], checklist: [] });
  const [demoForm, setDemoForm] = useState(emptyDemo);
  const [activityForms, setActivityForms] = useState({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [marketingRes, requestRes, assetRes] = await Promise.all([
        salesApi.marketing(),
        salesApi.demoRequests().catch(() => ({ data: [] })),
        salesApi.assets().catch(() => ({ data: { demo_flow: [], objection_answers: [], checklist: [] } })),
      ]);
      setMarketing(marketingRes.data || { product: {}, plans: [], highlights: [] });
      setRequests(requestRes.data || []);
      setAssets(assetRes.data || { demo_flow: [], objection_answers: [], checklist: [] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load sales demo center');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const summary = useMemo(() => {
    const rows = requests || [];
    return {
      total: rows.length,
      new: rows.filter((r) => r.status === 'new').length,
      qualified: rows.filter((r) => r.status === 'qualified').length,
      won: rows.filter((r) => r.status === 'won').length,
    };
  }, [requests]);

  async function submitDemoRequest(e) {
    e.preventDefault();
    try {
      await salesApi.submitDemoRequest({ ...demoForm, interest: String(demoForm.interest || '').split(',').map((x) => x.trim()).filter(Boolean) });
      toast.success('Demo request saved');
      setDemoForm(emptyDemo);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Demo request failed');
    }
  }

  async function updateStatus(row, status) {
    try {
      await salesApi.updateDemoRequest(row.id, { status });
      toast.success('Lead status updated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status update failed');
    }
  }

  async function saveActivity(row) {
    const form = activityForms[row.id] || {};
    if (!form.notes) return toast.error('Add notes first');
    try {
      await salesApi.createActivity({ demo_request_id: row.id, activity_type: form.activity_type || 'note', subject: form.subject || `Follow-up for ${row.organization}`, notes: form.notes, outcome: form.outcome || '', next_follow_up_at: form.next_follow_up_at || null });
      await salesApi.updateDemoRequest(row.id, { notes: form.notes, follow_up_at: form.next_follow_up_at || null });
      toast.success('Sales note saved');
      setActivityForms((prev) => ({ ...prev, [row.id]: {} }));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Activity save failed');
    }
  }

  if (loading) return <div className="card"><p>Loading sales demo center...</p></div>;

  return (
    <div className="pageStack">
      <section className="card heroPanel">
        <div>
          <div className="eyebrow"><Megaphone size={16} /> V39 Sales Demo Readiness</div>
          <h2>{marketing.product?.headline || 'Cloud HMS SaaS for hospitals'}</h2>
          <p className="muted bigText">{marketing.product?.subheadline}</p>
          <div className="heroActions"><button>{marketing.product?.primary_cta || 'Book a Demo'}</button><button className="ghostBtn">{marketing.product?.secondary_cta || 'View Pricing'}</button></div>
        </div>
        <div className="heroCard">
          <Sparkles size={32} />
          <strong>{marketing.product?.name || 'Nexora HMS'}</strong>
          <span>Product website, pricing, lead capture and demo script are now available in one control center.</span>
        </div>
      </section>

      <section className="grid statsGrid fourCols">
        <div className="card stat"><span>Total demo leads</span><strong>{summary.total}</strong></div>
        <div className="card stat"><span>New leads</span><strong>{summary.new}</strong></div>
        <div className="card stat"><span>Qualified</span><strong>{summary.qualified}</strong></div>
        <div className="card stat"><span>Won/Pilot</span><strong>{summary.won}</strong></div>
      </section>

      <section className="grid twoCols">
        <div className="card">
          <div className="sectionHead"><div><h3>Public website content preview</h3><p className="muted">Use this copy for your landing page, Vercel marketing page or product brochure.</p></div><Globe2 /></div>
          <div className="featureList">{(marketing.highlights || []).map((h) => <div key={h} className="featureItem"><CheckCircle2 size={18} /> {h}</div>)}</div>
        </div>
        <form className="card formGrid" onSubmit={submitDemoRequest}>
          <div className="sectionHead"><div><h3>Book demo / lead capture</h3><p className="muted">Create demo requests manually or connect this endpoint to a public website form.</p></div><CalendarClock /></div>
          <input placeholder="Contact name" value={demoForm.name} onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })} required />
          <input placeholder="Email" value={demoForm.email} onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })} required />
          <input placeholder="Phone" value={demoForm.phone} onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })} />
          <input placeholder="Hospital / clinic name" value={demoForm.organization} onChange={(e) => setDemoForm({ ...demoForm, organization: e.target.value })} required />
          <select value={demoForm.organization_type} onChange={(e) => setDemoForm({ ...demoForm, organization_type: e.target.value })}><option value="clinic">Clinic</option><option value="hospital">Hospital</option><option value="diagnostic_center">Diagnostic Center</option><option value="nursing_home">Nursing Home</option></select>
          <input placeholder="City" value={demoForm.city} onChange={(e) => setDemoForm({ ...demoForm, city: e.target.value })} />
          <input placeholder="Staff size" value={demoForm.staff_size} onChange={(e) => setDemoForm({ ...demoForm, staff_size: e.target.value })} />
          <input type="date" value={demoForm.preferred_demo_date} onChange={(e) => setDemoForm({ ...demoForm, preferred_demo_date: e.target.value })} />
          <textarea placeholder="Interested modules" value={demoForm.interest} onChange={(e) => setDemoForm({ ...demoForm, interest: e.target.value })} />
          <textarea placeholder="Message / pain points" value={demoForm.message} onChange={(e) => setDemoForm({ ...demoForm, message: e.target.value })} />
          <button>Save Demo Request</button>
        </form>
      </section>

      <section className="card">
        <div className="sectionHead"><div><h3>Pricing and package comparison</h3><p className="muted">Use these packages for first demos. Adjust prices later after pilot feedback.</p></div></div>
        <div className="pricingGrid">
          {(marketing.plans || []).map((plan) => (
            <div className="priceCard" key={plan.id || plan.name}>
              <Pill>{plan.name}</Pill>
              <h3>{plan.price}</h3>
              <p className="muted">{plan.audience}</p>
              <ul>{(plan.modules || []).slice(0, 8).map((m) => <li key={m}>{m}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>

      <section className="grid twoCols">
        <div className="card">
          <div className="sectionHead"><div><h3>Demo script</h3><p className="muted">Follow this sequence during a live sales demo.</p></div><PlayCircle /></div>
          <ol className="cleanList">{(assets.demo_flow || []).map((step) => <li key={step}>{step}</li>)}</ol>
        </div>
        <div className="card">
          <div className="sectionHead"><div><h3>Sales checklist</h3><p className="muted">Use this before moving a lead into pilot onboarding.</p></div><ClipboardList /></div>
          <ul className="cleanList">{(assets.checklist || []).map((step) => <li key={step}>{step}</li>)}</ul>
        </div>
      </section>

      <section className="card">
        <div className="sectionHead"><div><h3>Demo request pipeline</h3><p className="muted">Track prospects from new lead to qualified demo and pilot win.</p></div></div>
        <div className="tableWrap"><table><thead><tr><th>Hospital</th><th>Contact</th><th>Interest</th><th>Status</th><th>Follow-up note</th><th>Actions</th></tr></thead><tbody>{(requests || []).map((row) => (
          <tr key={row.id}>
            <td><strong>{row.organization}</strong><br /><span className="muted">{row.organization_type} · {row.city}</span></td>
            <td>{row.name}<br /><span className="muted">{row.email}<br />{row.phone}</span></td>
            <td>{(row.interest || []).join(', ')}</td>
            <td><Pill>{row.status}</Pill></td>
            <td><textarea placeholder="Follow-up note" value={activityForms[row.id]?.notes || ''} onChange={(e) => setActivityForms((prev) => ({ ...prev, [row.id]: { ...(prev[row.id] || {}), notes: e.target.value } }))} /></td>
            <td className="actionStack"><button className="ghostBtn" onClick={() => updateStatus(row, 'qualified')}><PencilLine size={14} /> Qualify</button><button className="ghostBtn" onClick={() => updateStatus(row, 'won')}>Pilot Won</button><button onClick={() => saveActivity(row)}>Save Note</button></td>
          </tr>
        ))}</tbody></table></div>
      </section>
    </div>
  );
}
