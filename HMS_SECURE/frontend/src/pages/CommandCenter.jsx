import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bed, CalendarCheck, ClipboardList, FlaskConical, PackageSearch, ReceiptText, RefreshCw, Stethoscope, Users } from 'lucide-react';
import { commandCenterApi, dashboardApi, patientApi, doctorApi, appointmentApi, bedApi, billingApi, labApi, pharmacyApi, auditApi } from '../api';
import { StatCard, DataTable } from '../components';

const zero = { totalPatients: 0, totalDoctors: 0, appointmentsToday: 0, availableBeds: 0 };
const normalizeArray = (value) => Array.isArray(value) ? value : [];

function countStatus(rows, field, values) {
  const allowed = values.map((x) => String(x).toLowerCase());
  return normalizeArray(rows).filter((row) => allowed.includes(String(row?.[field] || '').toLowerCase())).length;
}

export default function CommandCenter() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(zero);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [beds, setBeds] = useState([]);
  const [bills, setBills] = useState([]);
  const [labs, setLabs] = useState([]);
  const [meds, setMeds] = useState([]);
  const [auditRows, setAuditRows] = useState([]);
  const [advanced, setAdvanced] = useState(null);

  async function safe(call, fallback) {
    try {
      const res = await call();
      return res?.data ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  async function load() {
    setLoading(true);
    setError('');
    const [dash, p, d, a, bedRows, billRows, labRows, medRows, audits] = await Promise.all([
      safe(() => dashboardApi.getStats(), zero),
      safe(() => patientApi.list(), []),
      safe(() => doctorApi.list(), []),
      safe(() => appointmentApi.list(), []),
      safe(() => bedApi.list(), []),
      safe(() => billingApi.list(), []),
      safe(() => labApi.list(), []),
      safe(() => pharmacyApi.list(), []),
      safe(() => auditApi.list({ limit: 8 }), []),
    ]);
    setStats({ ...zero, ...(dash || {}) });
    setPatients(normalizeArray(p));
    setDoctors(normalizeArray(d));
    setAppointments(normalizeArray(a));
    setBeds(normalizeArray(bedRows));
    setBills(normalizeArray(billRows));
    setLabs(normalizeArray(labRows));
    setMeds(normalizeArray(medRows));
    setAuditRows(normalizeArray(audits));

    const [summary, queue, pharmacy, labTat] = await Promise.all([
      safe(() => commandCenterApi.summary(), null),
      safe(() => commandCenterApi.queue(), null),
      safe(() => commandCenterApi.pharmacy(), null),
      safe(() => commandCenterApi.labTat(), null),
    ]);
    setAdvanced({ summary, queue, pharmacy, labTat });
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todayAppointments = useMemo(() => appointments.filter((a) => String(a.appointment_date || '').slice(0, 10) === today), [appointments, today]);
  const pendingBills = useMemo(() => bills.filter((b) => ['pending', 'unpaid', 'partial'].includes(String(b.payment_status || b.status || '').toLowerCase())), [bills]);
  const lowStock = useMemo(() => meds.filter((m) => Number(m.stock || m.quantity || 0) <= Number(m.reorder_level || m.min_stock || 0)), [meds]);
  const pendingLabs = useMemo(() => labs.filter((l) => !['approved', 'completed'].includes(String(l.test_status || l.status || '').toLowerCase())), [labs]);
  const availableBeds = countStatus(beds, 'status', ['available', 'active']);

  const quickActions = [
    { title: 'Register patient', text: 'Open Patients and add demographics, insurance and documents.' },
    { title: 'Book appointment', text: 'Create appointment with date, time, doctor and status.' },
    { title: 'Create bill', text: 'Create invoice and track paid or pending amount.' },
    { title: 'Receive stock', text: 'Add supplier stock, batches, barcode and expiry details.' },
  ];

  return (
    <section className="commandCenterPage">
      <div className="commandHeroFixed card">
        <div>
          <span className="eyebrow">Live Command Center</span>
          <h1>Hospital operations control room</h1>
          <p className="muted">This screen now stays useful even when advanced analytics APIs return empty data. It falls back to core patients, doctors, appointments, beds, lab, pharmacy, billing and audit data.</p>
        </div>
        <button className="primaryBtn" onClick={load} disabled={loading}><RefreshCw size={16} /> {loading ? 'Refreshing...' : 'Refresh'}</button>
      </div>

      {error && <div className="alert danger"><AlertTriangle size={16} /> {error}</div>}

      <div className="grid commandStatsGrid">
        <StatCard icon={Users} title="Total Patients" value={stats.totalPatients || patients.length} />
        <StatCard icon={Stethoscope} title="Total Doctors" value={stats.totalDoctors || doctors.length} />
        <StatCard icon={CalendarCheck} title="Today Appointments" value={stats.appointmentsToday || todayAppointments.length} />
        <StatCard icon={Bed} title="Available Beds" value={stats.availableBeds || availableBeds} />
      </div>

      <div className="commandAlertGrid fixedAlerts">
        <div className={`commandAlert ${todayAppointments.length ? 'warn' : 'ok'}`}><span>Today Queue</span><strong>{todayAppointments.length}</strong></div>
        <div className={`commandAlert ${pendingBills.length ? 'warn' : 'ok'}`}><span>Pending Bills</span><strong>{pendingBills.length}</strong></div>
        <div className={`commandAlert ${pendingLabs.length ? 'warn' : 'ok'}`}><span>Pending Lab Reports</span><strong>{pendingLabs.length}</strong></div>
        <div className={`commandAlert ${lowStock.length ? 'danger' : 'ok'}`}><span>Low Stock</span><strong>{lowStock.length}</strong></div>
      </div>

      <div className="dashboardTwoCol commandTwoColFixed">
        <div className="card commandPanelFixed">
          <div className="sectionTitleRow"><h2><CalendarCheck size={18} /> Today Queue</h2><span className="muted">{todayAppointments.length} appointments</span></div>
          <DataTable rows={todayAppointments.slice(0, 8)} cols={["appointment_time", "patient_name", "doctor_name", "status"]} />
        </div>
        <div className="card commandPanelFixed">
          <div className="sectionTitleRow"><h2><ReceiptText size={18} /> Billing Watch</h2><span className="muted">{pendingBills.length} pending</span></div>
          <DataTable rows={pendingBills.slice(0, 8)} cols={["invoice_number", "patient_name", "total_amount", "paid_amount", "payment_status"]} />
        </div>
      </div>

      <div className="dashboardThreeCol commandThreeColFixed">
        <div className="card commandMiniPanel">
          <h3><Bed size={17} /> Bed Pressure</h3>
          <p className="bigMetric">{availableBeds}</p>
          <p className="muted">Available out of {beds.length || 0} registered beds.</p>
          <DataTable rows={beds.slice(0, 5)} cols={["ward", "bed_number", "status"]} />
        </div>
        <div className="card commandMiniPanel">
          <h3><FlaskConical size={17} /> Lab / Radiology</h3>
          <p className="bigMetric">{pendingLabs.length}</p>
          <p className="muted">Pending or in-process lab orders.</p>
          <DataTable rows={pendingLabs.slice(0, 5)} cols={["barcode", "patient_name", "test_name", "test_status"]} />
        </div>
        <div className="card commandMiniPanel">
          <h3><PackageSearch size={17} /> Pharmacy / Stock</h3>
          <p className="bigMetric">{lowStock.length}</p>
          <p className="muted">Medicines at or below reorder level.</p>
          <DataTable rows={lowStock.slice(0, 5)} cols={["name", "stock", "reorder_level", "status"]} />
        </div>
      </div>

      <div className="dashboardTwoCol commandTwoColFixed">
        <div className="card commandPanelFixed">
          <div className="sectionTitleRow"><h2><ClipboardList size={18} /> Recent Activity</h2><span className="muted">Latest audit events</span></div>
          <DataTable rows={auditRows.slice(0, 8)} cols={["user_name", "action", "module_name", "status", "severity"]} />
        </div>
        <div className="card commandPanelFixed quickActionsPanel">
          <h2>Quick operational actions</h2>
          <div className="quickActionGrid">
            {quickActions.map((x) => <div className="quickActionCard" key={x.title}><strong>{x.title}</strong><p>{x.text}</p></div>)}
          </div>
          <p className="muted">Advanced analytics status: {advanced?.summary ? 'Connected' : 'Using safe fallback from core modules'}.</p>
        </div>
      </div>
    </section>
  );
}
