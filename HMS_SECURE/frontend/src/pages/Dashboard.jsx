import React from "react";
import { Bed, Calendar, Stethoscope, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DataTable, StatCard } from "../components";

export default function Dashboard({ stats = {}, patients = [], doctors = [], appointments = [], beds = [], bills = [] }) {
  const appointmentChartData = [
    { name: "Patients", value: patients.length },
    { name: "Doctors", value: doctors.length },
    { name: "Appointments", value: appointments.length },
    { name: "Beds", value: beds.length },
  ];

  const billingChartData = [
    {
      name: "Paid",
      value: bills.filter((b) => b.status === "paid").length || 1,
    },
    {
      name: "Pending",
      value: bills.filter((b) => b.status === "pending").length || 1,
    },
    {
      name: "Unpaid",
      value: bills.filter((b) => b.status === "unpaid").length || 1,
    },
  ];

  return (
    <section>
      <div className="grid">
        <StatCard icon={Users} title="Total Patients" value={stats.totalPatients} />
        <StatCard icon={Stethoscope} title="Total Doctors" value={stats.totalDoctors} />
        <StatCard icon={Calendar} title="Appointments Today" value={stats.appointmentsToday} />
        <StatCard icon={Bed} title="Available Beds" value={stats.availableBeds} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginTop: 24,
        }}
      >
        <div className="card" style={{ padding: 24 }}>
          <h2>Hospital Overview</h2>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={appointmentChartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h2>Billing Status</h2>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={billingChartData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {billingChartData.map((entry, index) => (
                    <Cell key={index} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>Recent Activity</h2>
        <small className="muted">Latest 6 activities</small>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          <DataTable rows={(stats.recentActivity || []).slice(0, 6)} />
        </div>
      </div>
    </section>
  );
}
