import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  Bed,
  Calendar,
  LogOut,
  Pill,
  ReceiptText,
  Stethoscope,
  TestTube2,
  Users,
  UserCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import api from "./api/client";
import "./style.css";

const emptyPatient = {
  patient_id: "",
  full_name: "",
  age: "",
  gender: "male",
  phone: "",
  email: "",
  address: "",
  blood_group: "",
  medical_notes: "",
};
const emptyDoctor = {
  doctor_id: "",
  full_name: "",
  email: "",
  phone: "",
  specialization: "",
  qualification: "",
  consultation_fee: "",
};
const emptyAppointment = {
  patient_id: "",
  doctor_id: "",
  appointment_date: "",
  appointment_time: "",
  status: "scheduled",
  notes: "",
};
const emptyBed = { ward: "", bed_number: "", status: "available" };
const emptyLab = { name: "", price: "" };
const emptyRad = { name: "", price: "" };
const emptyMed = { name: "", stock: "", price: "" };
const emptyBill = { patient_id: "", amount: "", status: "unpaid" };

function Login({ onLogin }) {
  const [form, setForm] = useState({
    email: "admin@hospital.com",
    password: "admin12345",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login", form);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="loginWrap">
      <form className="card login" onSubmit={submit}>
        <h1>Enterprise HMS</h1>
        <p>Login to manage hospital operations.</p>
        {error && <div className="error">{error}</div>}
        <input
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button disabled={loading}>
          {loading ? "Signing in..." : "Login"}
        </button>
        <small>
          After DB import, run backend seed to use admin@hospital.com /
          admin12345.
        </small>
      </form>
    </div>
  );
}

function Stat({ icon: Icon, title, value }) {
  return (
    <div className="stat">
      <Icon size={22} />
      <div>
        <p>{title}</p>
        <b>{value ?? 0}</b>
      </div>
    </div>
  );
}
function Table({ rows, onEdit, onDelete }) {
  if (!rows?.length) return <p className="muted">No records found.</p>;

  const hiddenKeys = [
    "_id",
    "id",
    "__v",
    "created_at",
    "updated_at",
    "doctor_uid",
    "opd_timing",
    "ipd_timing",
    "department_id",
    "department_name",
    "experience_years",
    "status",
  ];
  const keys = Object.keys(rows[0])
    .filter((k) => !hiddenKeys.includes(k))
    .slice(0, 7);

  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            {keys.map((k) => (
              <th key={k}>{k.replaceAll("_", " ")}</th>
            ))}
            {(onEdit || onDelete) && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {keys.map((k) => (
                <td key={k}>{String(r[k] ?? "")}</td>
              ))}
              {(onEdit || onDelete) && (
                <td>
                  {onEdit && <button onClick={() => onEdit(r)}>Edit</button>}
                  {onDelete && (
                    <button onClick={() => onDelete(r)}>Delete</button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("user") || "null"),
  );
  const [tab, setTab] = useState("dashboard");
  const [stats, setStats] = useState({});
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [beds, setBeds] = useState([]);
  const [labs, setLabs] = useState([]);
  const [rads, setRads] = useState([]);
  const [meds, setMeds] = useState([]);
  const [bills, setBills] = useState([]);
  const [profile, setProfile] = useState(user || {});
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
  });
  const [newUser, setNewUser] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "receptionist",
    profile_image: "",
    bio: "",
  });
  const [usersList, setUsersList] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [patient, setPatient] = useState(emptyPatient);
  const [doctor, setDoctor] = useState(emptyDoctor);

  const [appointment, setAppointment] = useState(emptyAppointment);
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState("all");
  const pageSize = 10;
  const [patientPage, setPatientPage] = useState(1);
  const [doctorPage, setDoctorPage] = useState(1);
  const [appointmentPage, setAppointmentPage] = useState(1);

  const [bed, setBed] = useState(emptyBed);
  const [lab, setLab] = useState(emptyLab);
  const [rad, setRad] = useState(emptyRad);
  const [med, setMed] = useState(emptyMed);
  const [bill, setBill] = useState(emptyBill);
  const [editingPatientId, setEditingPatientId] = useState(null);
  const [editingDoctorId, setEditingDoctorId] = useState(null);
  const [editingAppointmentId, setEditingAppointmentId] = useState(null);
  async function load() {
    if (!localStorage.getItem("token")) return;
    const calls = [
      api.get("/dashboard/stats"),
      api.get("/patients"),
      api.get("/doctors"),
      api.get("/appointments"),
      api.get("/beds"),
      api.get("/lab/tests"),
      api.get("/radiology/tests"),
      api.get("/pharmacy/medicines"),
      api.get("/billing/all"),
      api.get("/auth/users"),
    ];
    const [s, p, d, a, b, l, r, m, bi, u] = await Promise.allSettled(calls);
    if (s.value) setStats(s.value.data);
    if (p.value) setPatients(p.value.data);
    if (d.value) setDoctors(d.value.data);
    if (a.value) setAppointments(a.value.data);
    if (b.value) setBeds(b.value.data);
    if (l.value) setLabs(l.value.data);
    if (r.value) setRads(r.value.data);
    if (m.value) setMeds(m.value.data);
    if (bi.value) setBills(bi.value.data);
    if (u.value) setUsersList(u.value.data);
  }
  useEffect(() => {
    load();
  }, [user]);
  if (!user) return <Login onLogin={setUser} />;
  async function addPatient(e) {
    e.preventDefault();

    if (editingPatientId) {
      await api.put(`/patients/${editingPatientId}`, patient);
      setEditingPatientId(null);
    } else {
      await api.post("/patients", patient);
    }

    setPatient(emptyPatient);
    await load();
  }

  async function addDoctor(e) {
    e.preventDefault();

    if (editingDoctorId) {
      await api.put(`/doctors/${editingDoctorId}`, doctor);
      setEditingDoctorId(null);
    } else {
      await api.post("/doctors", doctor);
    }

    setDoctor(emptyDoctor);
    await load();
  }
  function editPatient(row) {
    setPatient({
      patient_id: row.patient_id || "",
      full_name: row.full_name || "",
      age: row.age || "",
      gender: row.gender || "male",
      phone: row.phone || "",
      email: row.email || "",
      address: row.address || "",
      blood_group: row.blood_group || "",
      medical_notes: row.medical_notes || "",
    });

    setEditingPatientId(row.id);
  }

  async function deletePatient(row) {
    if (!confirm("Delete this patient?")) return;
    await api.delete(`/patients/${row.id}`);
    await load();
  }
  function editDoctor(row) {
    setDoctor({
      doctor_id: row.doctor_id || "",
      full_name: row.full_name || "",
      email: row.email || "",
      phone: row.phone || "",
      specialization: row.specialization || "",
      qualification: row.qualification || "",
      consultation_fee: row.consultation_fee || "",
    });

    setEditingDoctorId(row.id);
  }

  async function deleteDoctor(row) {
    if (!confirm("Delete this doctor?")) return;
    await api.delete(`/doctors/${row.id || row._id}`);
    await load();
  }
  async function addAppointment(e) {
    e.preventDefault();

    if (editingAppointmentId) {
      await api.put(`/appointments/${editingAppointmentId}`, appointment);
      setEditingAppointmentId(null);
    } else {
      await api.post("/appointments", appointment);
    }

    setAppointment(emptyAppointment);
    await load();
  }

  function editAppointment(row) {
    setAppointment({
      patient_id: row.patient_id || "",
      doctor_id: row.doctor_id || "",
      appointment_date: row.appointment_date || "",
      appointment_time: row.appointment_time || "",
      status: row.status || "scheduled",
      notes: row.notes || "",
    });

    setEditingAppointmentId(row.id || row._id);
  }

  async function deleteAppointment(row) {
    if (!confirm("Delete this appointment?")) return;

    await api.delete(`/appointments/${row.id || row._id}`);
    await load();
  }
  async function addAppointment(e) {
    e.preventDefault();

    if (editingAppointmentId) {
      await api.put(`/appointments/${editingAppointmentId}`, appointment);
      setEditingAppointmentId(null);
    } else {
      await api.post("/appointments", appointment);
    }

    setAppointment(emptyAppointment);
    await load();
  }

  async function addBed(e) {
    e.preventDefault();
    await api.post("/beds", bed);
    setBed(emptyBed);
    await load();
  }

  async function addLab(e) {
    e.preventDefault();
    await api.post("/lab/tests", lab);
    setLab(emptyLab);
    await load();
  }

  async function addRadiology(e) {
    e.preventDefault();
    await api.post("/radiology/tests", rad);
    setRad(emptyRad);
    await load();
  }

  async function addMedicine(e) {
    e.preventDefault();
    await api.post("/pharmacy/medicines", med);
    setMed(emptyMed);
    await load();
  }

  async function addBill(e) {
    e.preventDefault();
    await api.post("/billing", bill);
    setBill(emptyBill);
    await load();
  }
  async function updateProfile(e) {
    e.preventDefault();
    const { data } = await api.put("/auth/me", profile);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    alert("Profile updated");
  }

  async function changePassword(e) {
    e.preventDefault();
    await api.put("/auth/change-password", passwordForm);

    alert("Password changed successfully. Please login again.");

    localStorage.clear();
    setUser(null);
  }

  async function addUser(e) {
    e.preventDefault();
    await api.post("/auth/users", newUser);
    setNewUser({
      full_name: "",
      email: "",
      password: "",
      role: "receptionist",
      profile_image: "",
      bio: "",
    });
    await load();
  }

  async function toggleUserStatus(row) {
    await api.patch(`/auth/users/${row.id}`, {
      status: row.status === "active" ? "inactive" : "active",
    });

    await load();
  }
  async function deleteUser(row) {
    if (row.email === user.email) {
      return alert("You cannot delete your own admin account.");
    }

    if (!confirm("Delete this user?")) return;

    await api.delete(`/auth/users/${row.id}`);
    await load();
  }
  function logout() {
    localStorage.clear();
    setUser(null);
  }
  const allTabs = [
    ["dashboard", "Dashboard", Activity],
    ["patients", "Patients", Users],
    ["doctors", "Doctors", Stethoscope],
    ["appointments", "Appointments", Calendar],
    ["beds", "Beds", Bed],
    ["labs", "Lab/Radiology", TestTube2],
    ["pharmacy", "Pharmacy", Pill],
    ["billing", "Billing", ReceiptText],
    ["profile", "Profile", UserCircle],
  ];

  const roleTabs = {
    super_admin: [
      "dashboard",
      "patients",
      "doctors",
      "appointments",
      "beds",
      "labs",
      "pharmacy",
      "billing",
      "profile",
    ],
    admin: [
      "dashboard",
      "patients",
      "doctors",
      "appointments",
      "beds",
      "labs",
      "pharmacy",
      "billing",
      "profile",
    ],
    doctor: ["dashboard", "patients", "appointments", "profile"],
    nurse: ["dashboard", "patients", "beds", "profile"],
    receptionist: ["dashboard", "patients", "appointments", "beds", "profile"],
    pharmacist: ["dashboard", "pharmacy", "profile"],
    lab_technician: ["dashboard", "labs", "profile"],
    accountant: ["dashboard", "billing", "profile"],
    patient: ["dashboard", "appointments", "billing", "profile"],
  };

  const allowedTabs = roleTabs[user.role] || ["dashboard", "profile"];
  const tabs = allTabs.filter(([id]) => allowedTabs.includes(id));

  const filteredUsers = usersList.filter((u) => {
    const matchSearch =
      (u.full_name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(userSearch.toLowerCase());

    const matchRole = roleFilter === "all" ? true : u.role === roleFilter;

    return matchSearch && matchRole;
  });
  const filteredPatients = patients.filter((p) => {
    const q = patientSearch.toLowerCase();

    return (
      (p.patient_id || "").toLowerCase().includes(q) ||
      (p.full_name || "").toLowerCase().includes(q) ||
      (p.phone || "").toLowerCase().includes(q) ||
      (p.email || "").toLowerCase().includes(q)
    );
  });
  const paginatedPatients = filteredPatients.slice(
    (patientPage - 1) * pageSize,
    patientPage * pageSize,
  );

  const patientTotalPages = Math.ceil(filteredPatients.length / pageSize);

  const paginatedDoctors = filteredDoctors.slice(
    (doctorPage - 1) * pageSize,
    doctorPage * pageSize,
  );

  const doctorTotalPages = Math.ceil(filteredDoctors.length / pageSize);

  const filteredDoctors = doctors.filter((d) => {
    const q = doctorSearch.toLowerCase();

    return (
      (d.doctor_id || "").toLowerCase().includes(q) ||
      (d.full_name || "").toLowerCase().includes(q) ||
      (d.email || "").toLowerCase().includes(q) ||
      (d.phone || "").toLowerCase().includes(q) ||
      (d.specialization || "").toLowerCase().includes(q)
    );
  });
  const filteredAppointments = appointments.filter((a) => {
    const q = appointmentSearch.toLowerCase();

    const matchSearch =
      (a.patient_id || "").toLowerCase().includes(q) ||
      (a.doctor_id || "").toLowerCase().includes(q) ||
      (a.patient_name || "").toLowerCase().includes(q) ||
      (a.doctor_name || "").toLowerCase().includes(q);

    const matchStatus =
      appointmentStatusFilter === "all"
        ? true
        : a.status === appointmentStatusFilter;

    return matchSearch && matchStatus;
  });
  const paginatedAppointments = filteredAppointments.slice(
    (appointmentPage - 1) * pageSize,
    appointmentPage * pageSize,
  );

  const appointmentTotalPages = Math.ceil(
    filteredAppointments.length / pageSize,
  );
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
    <div className="app">
      <aside>
        <h2>HMS</h2>
        <p>
          {user.full_name}
          <br />
          <small>{user.role}</small>
        </p>
        {tabs.map(([id, label, Icon]) => (
          <button
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
            key={id}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
        <button onClick={logout}>
          <LogOut size={17} />
          Logout
        </button>
      </aside>
      <main>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div>
            <h1>{tabs.find((t) => t[0] === tab)?.[1]}</h1>

            <p style={{ color: "#666", marginTop: -10 }}>
              Welcome back, {user.full_name}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: "10px 16px",
                borderRadius: 14,
                display: "flex",
                gap: 16,
                alignItems: "center",
                border: "1px solid #eee",
              }}
            >
              <span>📅 {appointments.length} Appointments</span>

              <span>
                💊 {meds.filter((m) => Number(m.stock || 0) < 10).length} Low
                Stock
              </span>

              <span>
                💰 {bills.filter((b) => b.status === "pending").length} Pending
                Bills
              </span>
            </div>

            <button onClick={load}>Refresh</button>
          </div>
        </header>
        {tab === "dashboard" && (
          <section>
            <div className="grid">
              <Stat
                icon={Users}
                title="Total Patients"
                value={stats.totalPatients}
              />
              <Stat
                icon={Stethoscope}
                title="Total Doctors"
                value={stats.totalDoctors}
              />
              <Stat
                icon={Calendar}
                title="Appointments Today"
                value={stats.appointmentsToday}
              />
              <Stat
                icon={Bed}
                title="Available Beds"
                value={stats.availableBeds}
              />
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
                      <Pie
                        data={billingChartData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={90}
                        label
                      >
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
                <Table rows={(stats.recentActivity || []).slice(0, 6)} />
              </div>
            </div>
          </section>
        )}
        {tab === "patients" && (
          <section>
            <Form
              title="Add Patient"
              data={patient}
              setData={setPatient}
              submit={addPatient}
            />
            <div className="card">
              <input
                placeholder="Search patient by ID, name, phone or email..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                style={{
                  maxWidth: 420,
                  marginBottom: 16,
                }}
              />

              <Table
                rows={paginatedPatients}
                onEdit={editPatient}
                onDelete={deletePatient}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button
                  disabled={patientPage === 1}
                  onClick={() => setPatientPage(patientPage - 1)}
                >
                  Previous
                </button>

                <span>
                  Page {patientPage} of {patientTotalPages || 1}
                </span>

                <button
                  disabled={patientPage >= patientTotalPages}
                  onClick={() => setPatientPage(patientPage + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        )}
        {tab === "doctors" && (
          <section>
            <Form
              title="Add Doctor"
              data={doctor}
              setData={setDoctor}
              submit={addDoctor}
            />
            <div className="card">
              <input
                placeholder="Search doctor by ID, name, phone, email or specialization..."
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                style={{
                  maxWidth: 460,
                  marginBottom: 16,
                }}
              />

              <Table
                rows={paginatedDoctors}
                onEdit={editDoctor}
                onDelete={deleteDoctor}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button
                  disabled={doctorPage === 1}
                  onClick={() => setDoctorPage(doctorPage - 1)}
                >
                  Previous
                </button>

                <span>
                  Page {doctorPage} of {doctorTotalPages || 1}
                </span>

                <button
                  disabled={doctorPage >= doctorTotalPages}
                  onClick={() => setDoctorPage(doctorPage + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        )}
        {tab === "appointments" && (
          <section>
            <Form
              title="Add Appointment"
              data={appointment}
              setData={setAppointment}
              submit={addAppointment}
            />

            <div className="card">
              <h2>Appointment Calendar</h2>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 16,
                  flexWrap: "wrap",
                }}
              >
                <input
                  placeholder="Search by patient/doctor ID or name..."
                  value={appointmentSearch}
                  onChange={(e) => setAppointmentSearch(e.target.value)}
                  style={{ maxWidth: 380 }}
                />

                <select
                  value={appointmentStatusFilter}
                  onChange={(e) => setAppointmentStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {!filteredAppointments?.length ? (
                <p className="muted">No appointments found.</p>
              ) : (
                <>
                  <div style={{ display: "grid", gap: 12 }}>
                    {paginatedAppointments.map((a) => (
                      <div
                        key={a.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr auto",
                          gap: 12,
                          alignItems: "center",
                          padding: 14,
                          border: "1px solid #eee",
                          borderRadius: 14,
                          background: "#fff",
                        }}
                      >
                        <div>
                          <b>{a.patient_name || a.patient_id}</b>
                          <p className="muted" style={{ margin: "4px 0 0" }}>
                            Patient ID: {a.patient_id}
                          </p>
                        </div>

                        <div>
                          <b>{a.doctor_name || a.doctor_id}</b>
                          <p className="muted" style={{ margin: "4px 0 0" }}>
                            Doctor ID: {a.doctor_id}
                          </p>
                        </div>

                        <div>
                          <b>{a.appointment_date || "No date"}</b>
                          <p className="muted" style={{ margin: "4px 0 0" }}>
                            {a.appointment_time || "No time"}
                          </p>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              padding: "6px 10px",
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 700,
                              background:
                                a.status === "completed"
                                  ? "#dcfce7"
                                  : a.status === "cancelled"
                                    ? "#fee2e2"
                                    : "#fef3c7",
                              color:
                                a.status === "completed"
                                  ? "#166534"
                                  : a.status === "cancelled"
                                    ? "#991b1b"
                                    : "#92400e",
                            }}
                          >
                            {a.status || "scheduled"}
                          </span>

                          <button onClick={() => editAppointment(a)}>
                            Edit
                          </button>
                          <button onClick={() => deleteAppointment(a)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                    <button
                      disabled={appointmentPage === 1}
                      onClick={() => setAppointmentPage(appointmentPage - 1)}
                    >
                      Previous
                    </button>

                    <span>
                      Page {appointmentPage} of {appointmentTotalPages || 1}
                    </span>

                    <button
                      disabled={appointmentPage >= appointmentTotalPages}
                      onClick={() => setAppointmentPage(appointmentPage + 1)}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {tab === "beds" && (
          <section>
            <Form title="Add Bed" data={bed} setData={setBed} submit={addBed} />
            <Table rows={beds} />
          </section>
        )}

        {tab === "labs" && (
          <section>
            <Form
              title="Add Lab Test"
              data={lab}
              setData={setLab}
              submit={addLab}
            />
            <Table rows={labs} />
            <Form
              title="Add Radiology Test"
              data={rad}
              setData={setRad}
              submit={addRadiology}
            />
            <Table rows={rads} />
          </section>
        )}

        {tab === "pharmacy" && (
          <section>
            <Form
              title="Add Medicine"
              data={med}
              setData={setMed}
              submit={addMedicine}
            />
            <Table rows={meds} />
          </section>
        )}

        {tab === "billing" && (
          <section>
            <Form
              title="Add Bill"
              data={bill}
              setData={setBill}
              submit={addBill}
            />
            <Table rows={bills} />
          </section>
        )}
        {tab === "profile" && (
          <section>
            <div className="card" style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                <img
                  src={
                    profile.profile_image ||
                    "https://ui-avatars.com/api/?name=" +
                      encodeURIComponent(profile.full_name || "Admin")
                  }
                  alt="Profile"
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "3px solid #e5e7eb",
                  }}
                />

                <div>
                  <h2 style={{ margin: "0 0 6px" }}>
                    {profile.full_name || "Admin User"}
                  </h2>
                  <p className="muted" style={{ margin: 0 }}>
                    {profile.email}
                  </p>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 8,
                      padding: "4px 10px",
                      borderRadius: 20,
                      background: "#eef2ff",
                      color: "#3730a3",
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {profile.role || user.role}
                  </span>
                </div>
              </div>
            </div>

            <form className="card form" onSubmit={updateProfile}>
              <h2>Edit Profile</h2>

              <div className="formGrid">
                <input
                  placeholder="Name"
                  value={profile.full_name || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, full_name: e.target.value })
                  }
                />

                <input
                  placeholder="Email / Gmail"
                  value={profile.email || ""}
                  disabled
                />

                <input
                  placeholder="Profile Image URL"
                  value={profile.profile_image || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, profile_image: e.target.value })
                  }
                />

                <textarea
                  placeholder="Bio"
                  value={profile.bio || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, bio: e.target.value })
                  }
                  style={{
                    minHeight: 90,
                    resize: "vertical",
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <button>Update Profile</button>
            </form>

            <form className="card form" onSubmit={changePassword}>
              <h2>Change Password</h2>

              <div className="formGrid">
                <input
                  type="password"
                  placeholder="Old Password"
                  value={passwordForm.oldPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      oldPassword: e.target.value,
                    })
                  }
                />

                <input
                  type="password"
                  placeholder="New Password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      newPassword: e.target.value,
                    })
                  }
                />
              </div>

              <button>Change Password</button>
            </form>

            {(user.role === "super_admin" || user.role === "admin") && (
              <>
                <Form
                  title="Add New User / Role"
                  data={newUser}
                  setData={setNewUser}
                  submit={addUser}
                />

                <div className="card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <input
                      placeholder="Search user..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      style={{ maxWidth: 240 }}
                    />

                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                    >
                      <option value="all">All Roles</option>
                      <option value="super_admin">Super Admin</option>
                      <option value="admin">Admin</option>
                      <option value="doctor">Doctor</option>
                      <option value="receptionist">Receptionist</option>
                      <option value="pharmacist">Pharmacist</option>
                      <option value="lab_technician">Lab Technician</option>
                      <option value="accountant">Accountant</option>
                    </select>
                  </div>

                  <h2>User List</h2>

                  <div className="tableWrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredUsers.map((u) => (
                          <tr key={u.id}>
                            <td>{u.full_name}</td>
                            <td>{u.email}</td>
                            <td>{u.role}</td>
                            <td>
                              <button onClick={() => toggleUserStatus(u)}>
                                {u.status}
                              </button>
                            </td>
                            <td>
                              {u.email !== user.email ? (
                                <button onClick={() => deleteUser(u)}>
                                  Delete
                                </button>
                              ) : (
                                <button
                                  disabled
                                  style={{
                                    opacity: 0.5,
                                    cursor: "not-allowed",
                                  }}
                                >
                                  Current User
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
function Form({ title, data, setData, submit }) {
  function inputType(k) {
    if (k.includes("date")) return "date";
    if (k.includes("time")) return "time";
    if (k.includes("email")) return "email";
    if (
      k.includes("age") ||
      k.includes("fee") ||
      k.includes("price") ||
      k.includes("stock") ||
      k.includes("amount")
    )
      return "number";
    return "text";
  }

  return (
    <form className="card form" onSubmit={submit}>
      <h2>{title}</h2>
      <div className="formGrid">
        {Object.keys(data).map((k) =>
          k === "role" ? (
            <select
              key={k}
              value={data[k] ?? ""}
              onChange={(e) => setData({ ...data, [k]: e.target.value })}
            >
              <option value="receptionist">Receptionist</option>
              <option value="doctor">Doctor</option>
              <option value="nurse">Nurse</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="lab_technician">Lab Technician</option>
              <option value="accountant">Accountant</option>
              <option value="admin">Admin</option>
            </select>
          ) : k === "status" ? (
            <select
              key={k}
              value={data[k] ?? ""}
              onChange={(e) => setData({ ...data, [k]: e.target.value })}
            >
              <option value="scheduled">scheduled</option>
              <option value="completed">completed</option>
              <option value="cancelled">cancelled</option>
              <option value="pending">pending</option>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          ) : (
            <input
              key={k}
              type={inputType(k)}
              required={
                k === "full_name" ||
                k === "patient_id" ||
                k === "doctor_id" ||
                k === "email" ||
                k === "password"
              }
              placeholder={k.replaceAll("_", " ")}
              value={data[k] ?? ""}
              onChange={(e) => setData({ ...data, [k]: e.target.value })}
            />
          ),
        )}
      </div>
      <button>Save</button>
    </form>
  );
}
createRoot(document.getElementById("root")).render(<App />);
