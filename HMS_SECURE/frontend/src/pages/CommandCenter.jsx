import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Bed, Clock3, FlaskConical, PackageSearch, RefreshCw, Stethoscope, Users, WalletCards } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { commandCenterApi } from '../api';
import { StatCard } from '../components';

const empty = {
  summary: null,
  revenue: null,
  occupancy: null,
  doctors: [],
  queue: null,
  pharmacy: null,
  labTat: null,
  emergency: null,
};

function money(value) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function statusRows(obj = {}) {
  return Object.entries(obj).map(([name, value]) => ({ name, value }));
}

function MiniTable({ columns, rows = [], emptyText = 'No data yet' }) {
  return (
    <div className="tableWrap compactTable">
      <table>
        <thead>
          <tr>{columns.map((col) => <th key={col.key}>{col.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, index) => (
            <tr key={row.id || row._id || index}>
              {columns.map((col) => <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>)}
            </tr>
          )) : <tr><td colSpan={columns.length} className="muted">{emptyText}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default function CommandCenter() {
  const [data, setData] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const safe = async (fn, fallback) => {
        try { const res = await fn(); return res.data ?? fallback; }
        catch (err) { return fallback; }
      };
      const [summary, revenue, occupancy, doctors, queue, pharmacy, labTat, emergency] = await Promise.all([
        safe(commandCenterApi.summary, { kpis: {} }),
        safe(commandCenterApi.revenue, { byDay: [], byStatus: {} }),
        safe(commandCenterApi.occupancy, { byStatus: {}, byWard: [] }),
        safe(commandCenterApi.doctorPerformance, []),
        safe(commandCenterApi.queue, { byStatus: {}, queue: [] }),
        safe(commandCenterApi.pharmacy, {}),
        safe(commandCenterApi.labTat, {}),
        safe(commandCenterApi.emergency, {}),
      ]);
      setData({ summary, revenue, occupancy, doctors: doctors || [], queue, pharmacy, labTat, emergency });
    } catch (err) {
      setError(err.response?.data?.message || 'Some command center data could not be loaded. Showing safe zero-state widgets.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const kpis = data.summary?.kpis || {};
  const revenueTrend = data.revenue?.byDay?.length ? data.revenue.byDay : [{ date: 'No data', amount: 0 }];
  const occupancyRows = data.occupancy?.byWard || [];
  const queueRows = statusRows(data.queue?.byStatus || {});
  const revenueStatus = statusRows(data.revenue?.byStatus || {});
  const palette = ['var(--purple)', 'var(--chart-blue)', 'var(--chart-green)', 'var(--chart-amber)', 'var(--chart-rose)'];

  const commandAlerts = useMemo(() => [
    { label: 'Low stock medicines', value: kpis.lowStockCount || 0, tone: (kpis.lowStockCount || 0) > 0 ? 'warn' : 'ok' },
    { label: 'Expiring batches', value: kpis.expiringBatchCount || 0, tone: (kpis.expiringBatchCount || 0) > 0 ? 'warn' : 'ok' },
    { label: 'Pending lab reports', value: kpis.pendingLabReports || 0, tone: (kpis.pendingLabReports || 0) > 0 ? 'warn' : 'ok' },
    { label: 'Emergency workload', value: data.emergency?.activeEmergencyCount || 0, tone: (data.emergency?.activeEmergencyCount || 0) > 0 ? 'danger' : 'ok' },
  ], [kpis, data.emergency]);

  return (
    <section>
      <div className="quickPanel commandHero">
        <div>
          <p className="eyebrow">Analytics + Hospital Command Center</p>
          <h1>Hospital Command Center</h1>
          <p>Monitor revenue, occupancy, doctors, queues, pharmacy, lab TAT and emergency workload from one control room.</p>
        </div>
        <button className="btnGhost" onClick={load} disabled={loading}><RefreshCw size={16} /> Refresh</button>
      </div>

      {error && <div className="alert danger"><AlertTriangle size={16} /> {error}</div>}

      <div className="grid" style={{ marginTop: 18 }}>
        <StatCard icon={WalletCards} title="30-Day Revenue" value={money(kpis.revenue30)} />
        <StatCard icon={Bed} title="Occupancy Rate" value={`${kpis.occupancyRate || 0}%`} />
        <StatCard icon={Users} title="Today Queue" value={kpis.appointmentsToday || 0} />
        <StatCard icon={Clock3} title="Avg Lab TAT" value={`${data.labTat?.averageTatHours || 0}h`} />
      </div>

      <div className="commandAlertGrid">
        {commandAlerts.map((alert) => <div key={alert.label} className={`commandAlert ${alert.tone}`}><span>{alert.label}</span><strong>{alert.value}</strong></div>)}
      </div>

      <div className="dashboardTwoCol">
        <div className="card commandCard">
          <div className="kekaPanelTitle"><h2>Revenue Dashboard</h2><small className="muted">Last 30 days</small></div>
          <div className="chartBox">
            <ResponsiveContainer>
              <LineChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} stroke="var(--muted)" />
                <YAxis axisLine={false} tickLine={false} stroke="var(--muted)" />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} />
                <Line type="monotone" dataKey="amount" stroke="var(--purple)" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <MiniTable columns={[{ key: 'name', label: 'Status' }, { key: 'value', label: 'Amount', render: (r) => money(r.value) }]} rows={revenueStatus} />
        </div>

        <div className="card commandCard">
          <div className="kekaPanelTitle"><h2>Occupancy Dashboard</h2><small className="muted">Ward-wise bed pressure</small></div>
          <div className="chartBox small">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusRows(data.occupancy?.byStatus || {})} dataKey="value" nameKey="name" outerRadius={90} label>
                  {statusRows(data.occupancy?.byStatus || {}).map((entry, index) => <Cell key={entry.name} fill={palette[index % palette.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <MiniTable columns={[{ key: 'ward', label: 'Ward' }, { key: 'total', label: 'Total' }, { key: 'occupied', label: 'Occupied' }, { key: 'available', label: 'Available' }]} rows={occupancyRows} />
        </div>
      </div>

      <div className="dashboardTwoCol">
        <div className="card commandCard">
          <div className="kekaPanelTitle"><h2>Doctor Performance</h2><small className="muted">Appointments, completion and linked revenue</small></div>
          <MiniTable columns={[
            { key: 'full_name', label: 'Doctor' },
            { key: 'specialization', label: 'Specialization' },
            { key: 'appointments', label: 'Appts' },
            { key: 'completionRate', label: 'Done %', render: (r) => `${r.completionRate || 0}%` },
            { key: 'revenue', label: 'Revenue', render: (r) => money(r.revenue) },
          ]} rows={data.doctors.slice(0, 10)} />
        </div>

        <div className="card commandCard">
          <div className="kekaPanelTitle"><h2>Queue Monitoring</h2><small className="muted">Today's appointment movement</small></div>
          <div className="chartBox small">
            <ResponsiveContainer>
              <BarChart data={queueRows}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="var(--muted)" />
                <YAxis axisLine={false} tickLine={false} stroke="var(--muted)" />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="var(--chart-blue)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <MiniTable columns={[{ key: 'appointment_time', label: 'Time' }, { key: 'patient_id', label: 'Patient' }, { key: 'doctor_id', label: 'Doctor' }, { key: 'status', label: 'Status' }]} rows={data.queue?.queue?.slice(0, 8) || []} />
        </div>
      </div>

      <div className="dashboardThreeCol">
        <div className="card commandCard">
          <div className="kekaPanelTitle"><h2><PackageSearch size={18} /> Pharmacy Stats</h2></div>
          <p className="bigMetric">{data.pharmacy?.salesCount || 0}</p><p className="muted">Sales in last 30 days</p>
          <p><strong>{data.pharmacy?.lowStockCount || 0}</strong> low-stock medicines</p>
          <p><strong>{data.pharmacy?.expiringBatchCount || 0}</strong> batches near expiry</p>
        </div>
        <div className="card commandCard">
          <div className="kekaPanelTitle"><h2><FlaskConical size={18} /> Lab Turnaround</h2></div>
          <p className="bigMetric">{data.labTat?.averageTatHours || 0}h</p><p className="muted">Average TAT</p>
          <p><strong>{data.labTat?.completedReports || 0}</strong> completed reports</p>
          <p><strong>{data.labTat?.pendingReports || 0}</strong> pending reports</p>
        </div>
        <div className="card commandCard emergencyPanel">
          <div className="kekaPanelTitle"><h2><Activity size={18} /> Emergency Dashboard</h2></div>
          <p className="bigMetric">{data.emergency?.activeEmergencyCount || 0}</p><p className="muted">Active emergency workload</p>
          <p><strong>{data.emergency?.urgentAppointments?.length || 0}</strong> urgent appointments</p>
          <p><strong>{data.emergency?.urgentLabs?.length || 0}</strong> urgent lab cases</p>
        </div>
      </div>

      {loading && <p className="muted" style={{ marginTop: 12 }}>Loading command center data...</p>}
    </section>
  );
}
