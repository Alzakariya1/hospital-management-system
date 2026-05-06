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
} from "lucide-react";
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
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [beds, setBeds] = useState([]);
  const [labs, setLabs] = useState([]);
  const [rads, setRads] = useState([]);
  const [meds, setMeds] = useState([]);
  const [bills, setBills] = useState([]);

  const [patient, setPatient] = useState(emptyPatient);
  const [doctor, setDoctor] = useState(emptyDoctor);

  const [appointment, setAppointment] = useState(emptyAppointment);
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
    ];
    const [s, p, d, a, b, l, r, m, bi] = await Promise.allSettled(calls);
    if (s.value) setStats(s.value.data);
    if (p.value) setPatients(p.value.data);
    if (d.value) setDoctors(d.value.data);
    if (a.value) setAppointments(a.value.data);
    if (b.value) setBeds(b.value.data);
    if (l.value) setLabs(l.value.data);
    if (r.value) setRads(r.value.data);
    if (m.value) setMeds(m.value.data);
    if (bi.value) setBills(bi.value.data);
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
    setPatient(row);
    setEditingPatientId(row.id || row._id);
  }

  async function deletePatient(row) {
    if (!confirm("Delete this patient?")) return;
    await api.delete(`/patients/${row.id || row._id}`);
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
  function logout() {
    localStorage.clear();
    setUser(null);
  }
  const tabs = [
    ["dashboard", "Dashboard", Activity],
    ["patients", "Patients", Users],
    ["doctors", "Doctors", Stethoscope],
    ["appointments", "Appointments", Calendar],
    ["beds", "Beds", Bed],
    ["labs", "Lab/Radiology", TestTube2],
    ["pharmacy", "Pharmacy", Pill],
    ["billing", "Billing", ReceiptText],
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
        <header>
          <h1>{tabs.find((t) => t[0] === tab)?.[1]}</h1>
          <button onClick={load}>Refresh</button>
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
            <h2>Recent Activity</h2>
            <Table rows={stats.recentActivity} />
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
            <Table
              rows={patients}
              onEdit={editPatient}
              onDelete={deletePatient}
            />
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
            <Table rows={doctors} onEdit={editDoctor} onDelete={deleteDoctor} />
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
            <Table
              rows={appointments}
              onEdit={editAppointment}
              onDelete={deleteAppointment}
            />
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
          k === "status" ? (
            <select
              key={k}
              value={data[k] ?? ""}
              onChange={(e) => setData({ ...data, [k]: e.target.value })}
            >
              <option value="scheduled">scheduled</option>
              <option value="completed">completed</option>
              <option value="cancelled">cancelled</option>
              <option value="pending">pending</option>
            </select>
          ) : (
            <input
              key={k}
              type={inputType(k)}
              required={
                k === "full_name" || k === "patient_id" || k === "doctor_id"
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
