import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "bootstrap-icons/font/bootstrap-icons.css";
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
import { Toaster, toast } from "react-hot-toast";
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

  // profile_image_url: "",

  emergency_contact_name: "",
  emergency_contact_phone: "",
  insurance_provider: "",
  insurance_policy_number: "",
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
function Table({ rows, onEdit, onDelete, showProfile, onProfile }) {
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
                <td className="action-icons">
                  {showProfile && (
                    <button
                      className="icon-btn profile-btn"
                      title="View Profile"
                      onClick={() => onProfile(r)}
                    >
                      <i className="bi bi-eye"></i>
                    </button>
                  )}
                  {onEdit && (
                    <button
                      className="icon-btn edit-btn"
                      title="Edit"
                      onClick={() => onEdit(r)}
                    >
                      <i className="bi bi-pencil-square"></i>
                    </button>
                  )}

                  {onDelete && (
                    <button
                      className="icon-btn delete-btn"
                      title="Delete"
                      onClick={() => onDelete(r)}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
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
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [pendingPatientDocs, setPendingPatientDocs] = useState([]);
  const [patientProfileImage, setPatientProfileImage] = useState(null);
  const [patientProfilePreview, setPatientProfilePreview] = useState("");

  const [savedPatientDocs, setSavedPatientDocs] = useState({});

  const [patientDocForm, setPatientDocForm] = useState({
    category: "medical",
    document_type: "Prescription",
    title: "",
    notes: "",
  });

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
  const [patientPage, setPatientPage] = useState(1);
  const [doctorPage, setDoctorPage] = useState(1);
  const [appointmentPage, setAppointmentPage] = useState(1);
  const pageSize = 10;
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

    try {
      let savedPatientId = editingPatientId;

      if (editingPatientId) {
        await api.put(`/patients/${editingPatientId}`, patient);
        toast.success("Patient updated successfully");
      } else {
        const { data } = await api.post("/patients", patient);
        savedPatientId = data.id;
        toast.success("Patient added successfully");
      }
      if (patientProfileImage && savedPatientId) {
        const imageFormData = new FormData();

        imageFormData.append("profile_image", patientProfileImage);

        const imageUploadResponse = await api.post(
          `/patients/${savedPatientId}/profile-image`,
          imageFormData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        );

        patient.profile_image_url = imageUploadResponse.data.profile_image_url;
      }
      if (patientProfileImage && savedPatientId) {
        const imageFormData = new FormData();

        imageFormData.append("profile_image", patientProfileImage);

        const imageUploadResponse = await api.post(
          `/patients/${savedPatientId}/profile-image`,
          imageFormData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        );

        patient.profile_image_url = imageUploadResponse.data.profile_image_url;
      }

      const uploadedDocs = [];

      for (const doc of pendingPatientDocs) {
        if (!doc.file) {
          uploadedDocs.push(doc);
          continue;
        }

        const formData = new FormData();

        formData.append("document", doc.file);
        formData.append("title", doc.title);
        formData.append("category", doc.category);
        formData.append("document_type", doc.document_type);
        formData.append("notes", doc.notes || "");

        const { data } = await api.post(
          `/patients/${savedPatientId}/documents`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        );

        if (data.document) {
          uploadedDocs.push(data.document);
        }
      }

      setSavedPatientDocs((prev) => ({
        ...prev,
        [patient.patient_id]: uploadedDocs,
      }));

      setEditingPatientId(null);

      setPatient(emptyPatient);
      setPendingPatientDocs([]);

      setPatientProfileImage(null);
      setPatientProfilePreview("");

      await load();

      toast.success("Patient and documents saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Patient action failed");
    }
  }

  async function addDoctor(e) {
    e.preventDefault();

    try {
      if (editingDoctorId) {
        await api.put(`/doctors/${editingDoctorId}`, doctor);
        toast.success("Doctor updated successfully");
        setEditingDoctorId(null);
      } else {
        await api.post("/doctors", doctor);
        toast.success("Doctor added successfully");
      }

      setDoctor(emptyDoctor);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Doctor action failed");
    }
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
      profile_image_url: row.profile_image_url || "",

      emergency_contact_name: row.emergency_contact_name || "",
      emergency_contact_phone: row.emergency_contact_phone || "",
      insurance_provider: row.insurance_provider || "",
      insurance_policy_number: row.insurance_policy_number || "",
    });

    setEditingPatientId(row.id || row._id);
    setPendingPatientDocs(
      row.documents || savedPatientDocs[row.patient_id] || [],
    );

    setPatientProfilePreview(row.profile_image_url || "");
    setPatientProfileImage(null);
  }

  async function deletePatient(row) {
    if (!confirm("Delete this patient?")) return;

    try {
      await api.delete(`/patients/${row.id || row._id}`);
      await load();
      toast.success("Patient deleted successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  }
  function handlePendingPatientDocument(e) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!patient.patient_id) {
      toast.error("Please enter Patient ID before uploading document");
      e.target.value = "";
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Only PDF, JPG, PNG, and WEBP files are allowed");
      e.target.value = "";
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      toast.error("File size should be less than 5MB");
      e.target.value = "";
      return;
    }

    const newDoc = {
      id: Date.now(),
      patient_id: patient.patient_id,
      category: patientDocForm.category,
      document_type: patientDocForm.document_type,
      // title: patientDocForm.title || file.name,
      // notes: patientDocForm.notes,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      file,
      file_url: URL.createObjectURL(file),
      uploaded_at: new Date().toLocaleString(),
    };

    setPendingPatientDocs((prev) => [...prev, newDoc]);

    setPatientDocForm({
      category: "medical",
      document_type: "Prescription",
      title: "",
      notes: "",
    });

    e.target.value = "";
    toast.success("Document added to patient form");
  }
  function handlePatientProfileImage(e) {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, PNG, and WEBP images are allowed");
      e.target.value = "";
      return;
    }

    const maxSize = 3 * 1024 * 1024;

    if (file.size > maxSize) {
      toast.error("Image size should be less than 3MB");
      e.target.value = "";
      return;
    }

    setPatientProfileImage(file);
    setPatientProfilePreview(URL.createObjectURL(file));

    toast.success("Patient profile image selected");
  }
  function removePendingPatientDocument(docId) {
    setPendingPatientDocs((prev) => prev.filter((doc) => doc.id !== docId));
    toast.success("Document removed");
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

    try {
      await api.delete(`/doctors/${row.id || row._id}`);
      await load();
      toast.success("Doctor deleted successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  }
  async function addAppointment(e) {
    e.preventDefault();

    try {
      if (editingAppointmentId) {
        await api.put(`/appointments/${editingAppointmentId}`, appointment);
        toast.success("Appointment updated successfully");
        setEditingAppointmentId(null);
      } else {
        await api.post("/appointments", appointment);
        toast.success("Appointment added successfully");
      }

      setAppointment(emptyAppointment);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Appointment action failed");
    }
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

    try {
      await api.delete(`/appointments/${row.id || row._id}`);
      await load();
      toast.success("Appointment deleted successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
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
  function handleProfileImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      setProfile({
        ...profile,
        profile_image: reader.result,
      });
      toast.success("Profile image selected");
    };

    reader.readAsDataURL(file);
  }
  async function updateProfile(e) {
    e.preventDefault();
    try {
      const { data } = await api.put("/auth/me", profile);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Profile update failed");
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    try {
      await api.put("/auth/change-password", passwordForm);
      toast.success("Password changed. Please login again.");
      localStorage.clear();
      setUser(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Password change failed");
    }
  }

  async function addUser(e) {
    e.preventDefault();
    try {
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
      toast.success("User added successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "User add failed");
    }
  }

  async function toggleUserStatus(row) {
    await api.patch(`/auth/users/${row.id}`, {
      status: row.status === "active" ? "inactive" : "active",
    });

    await load();
  }
  async function deleteUser(row) {
    if (row.email === user.email) {
      return toast.error("You cannot delete your own admin account");
    }

    if (!confirm("Delete this user?")) return;

    try {
      await api.delete(`/auth/users/${row.id}`);
      await load();
      toast.success("User deleted successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "User delete failed");
    }
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

  const paginatedDoctors = filteredDoctors.slice(
    (doctorPage - 1) * pageSize,
    doctorPage * pageSize,
  );

  const doctorTotalPages = Math.ceil(filteredDoctors.length / pageSize);
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
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#0f172a",
            color: "#fff",
            borderRadius: "12px",
            padding: "14px 16px",
            fontWeight: 600,
          },
        }}
      />
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
          <div className="mainContent">
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

                <p style={{ color: "#666", marginTop: 2 }}>
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
                    💊 {meds.filter((m) => Number(m.stock || 0) < 10).length}{" "}
                    Low Stock
                  </span>

                  <span>
                    💰 {bills.filter((b) => b.status === "pending").length}{" "}
                    Pending Bills
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
                <div
                  className="card"
                  style={{ padding: 0, overflow: "hidden" }}
                >
                  <div style={{ maxHeight: 320, overflowY: "auto" }}>
                    <Table rows={(stats.recentActivity || []).slice(0, 6)} />
                  </div>
                </div>
              </section>
            )}
            {tab === "patients" && (
              <section>
                <form
                  className="card form patient-complete-form"
                  onSubmit={addPatient}
                >
                  <div className="patient-document-header">
                    <div>
                      <h2>
                        {editingPatientId ? "Edit Patient" : "Add Patient"}
                      </h2>
                      <p className="muted">
                        Add patient details and upload required documents in one
                        place.
                      </p>
                    </div>

                    <div className="document-badge">
                      {pendingPatientDocs.length} Files
                    </div>
                    <div className="form-header-actions">
                      <button
                        type="button"
                        className="new-patient-btn"
                        onClick={() => {
                          setPatient(emptyPatient);
                          setEditingPatientId(null);
                          setPendingPatientDocs([]);
                          setPatientProfileImage(null);
                          setPatientProfilePreview("");
                        }}
                      >
                        <i className="bi bi-plus-circle"></i>
                        New Patient
                      </button>

                      <div className="document-badge">
                        {pendingPatientDocs.length} Files
                      </div>
                    </div>
                  </div>
                  <div className="patient-image-upload-section">
                    <div className="patient-image-preview">
                      {patientProfilePreview ? (
                        <img src={patientProfilePreview} alt="Patient" />
                      ) : (
                        <i className="bi bi-person-circle"></i>
                      )}
                    </div>

                    <div className="patient-image-upload-actions">
                      <label className="upload-image-btn">
                        <i className="bi bi-camera"></i>
                        Upload Patient Photo
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp"
                          hidden
                          onChange={handlePatientProfileImage}
                        />
                      </label>

                      <p>JPG, PNG or WEBP • Max 3MB</p>
                    </div>
                  </div>
                  <div className="formGrid">
                    {Object.keys(patient).map((k) =>
                      k === "gender" ? (
                        <select
                          key={k}
                          value={patient[k] ?? ""}
                          onChange={(e) =>
                            setPatient({
                              ...patient,
                              [k]: e.target.value,
                            })
                          }
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      ) : (
                        <input
                          key={k}
                          type={
                            k.includes("age")
                              ? "number"
                              : k.includes("email")
                                ? "email"
                                : "text"
                          }
                          required={k === "patient_id" || k === "full_name"}
                          placeholder={k.replaceAll("_", " ")}
                          value={patient[k] ?? ""}
                          onChange={(e) =>
                            setPatient({
                              ...patient,
                              [k]: e.target.value,
                            })
                          }
                        />
                      ),
                    )}
                  </div>

                  <div className="patient-form-divider"></div>

                  <h2>Patient Documents</h2>
                  <p className="muted">
                    Upload identity proof, prescriptions, reports, insurance or
                    admission documents.
                  </p>

                  <div className="patient-document-grid">
                    <select
                      value={patientDocForm.category}
                      onChange={(e) =>
                        setPatientDocForm({
                          ...patientDocForm,
                          category: e.target.value,
                        })
                      }
                    >
                      <option value="identity">Identity Document</option>
                      <option value="medical">Medical Document</option>
                      <option value="insurance">Insurance Document</option>
                      <option value="admission">Admission Document</option>
                      <option value="billing">Billing Document</option>
                      <option value="other">Other</option>
                    </select>

                    <select
                      value={patientDocForm.document_type}
                      onChange={(e) =>
                        setPatientDocForm({
                          ...patientDocForm,
                          document_type: e.target.value,
                        })
                      }
                    >
                      <option value="Aadhaar Card">Aadhaar Card</option>
                      <option value="PAN Card">PAN Card</option>
                      <option value="Passport">Passport</option>
                      <option value="Insurance Card">Insurance Card</option>
                      <option value="Prescription">Prescription</option>
                      <option value="Lab Report">Lab Report</option>
                      <option value="X-Ray">X-Ray</option>
                      <option value="MRI / CT Scan">MRI / CT Scan</option>
                      <option value="ECG Report">ECG Report</option>
                      <option value="Discharge Summary">
                        Discharge Summary
                      </option>
                      <option value="Consent Form">Consent Form</option>
                      <option value="Admission Form">Admission Form</option>
                      <option value="Invoice / Bill">Invoice / Bill</option>
                      <option value="Other">Other</option>
                    </select>

                    <input
                      placeholder="Document title"
                      value={patientDocForm.title}
                      onChange={(e) =>
                        setPatientDocForm({
                          ...patientDocForm,
                          title: e.target.value,
                        })
                      }
                    />

                    <input
                      placeholder="Document notes"
                      value={patientDocForm.notes}
                      onChange={(e) =>
                        setPatientDocForm({
                          ...patientDocForm,
                          notes: e.target.value,
                        })
                      }
                    />

                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={handlePendingPatientDocument}
                    />
                  </div>

                  {pendingPatientDocs.length > 0 && (
                    <div className="patient-document-list">
                      {pendingPatientDocs.map((doc) => (
                        <div className="patient-document-item" key={doc.id}>
                          <div className="patient-document-info">
                            <div className="document-icon">
                              <i className="bi bi-file-earmark-medical"></i>
                            </div>

                            <div>
                              <h4>{doc.title}</h4>
                              <p>
                                {doc.document_type} • {doc.category}
                              </p>
                              <small>Uploaded: {doc.uploaded_at}</small>
                            </div>
                          </div>

                          <div className="patient-document-actions">
                            <button
                              type="button"
                              className="icon-btn profile-btn"
                              title="View Document"
                              onClick={() =>
                                window.open(doc.file_url, "_blank")
                              }
                            >
                              <i className="bi bi-eye"></i>
                            </button>

                            <button
                              type="button"
                              className="icon-btn delete-btn"
                              title="Remove Document"
                              onClick={() =>
                                removePendingPatientDocument(doc.id)
                              }
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button type="submit" className="patient-save-btn">
                    {editingPatientId ? "Update Patient" : "Save Patient"}
                  </button>
                </form>
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
                    showProfile={true}
                    onProfile={(row) => {
                      const latestPatient =
                        patients.find(
                          (p) =>
                            p.id === row.id || p.patient_id === row.patient_id,
                        ) || row;

                      setSelectedPatient(latestPatient);
                      setTab("patientProfile");
                    }}
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
            {tab === "patientProfile" && selectedPatient && (
              <section>
                <button onClick={() => setTab("patients")}>
                  ← Back to Patients
                </button>

                <div className="card" style={{ marginTop: 16 }}>
                  <h2>Patient Profile</h2>

                  <div className="patient-profile-top">
                    <div className="patient-avatar">
                      {selectedPatient.profile_image_url ? (
                        <img
                          src={selectedPatient.profile_image_url}
                          alt={selectedPatient.full_name}
                        />
                      ) : (
                        <i className="bi bi-person-circle"></i>
                      )}
                    </div>

                    <div className="patient-profile-main">
                      <div className="patient-profile-header">
                        <div>
                          <h1>{selectedPatient.full_name}</h1>

                          <p>Patient ID: {selectedPatient.patient_id}</p>
                        </div>

                        <div className="patient-status">Active Patient</div>
                      </div>

                      <div className="patient-info-grid">
                        <div className="info-card">
                          <span>Age</span>
                          <h3>{selectedPatient.age || "--"}</h3>
                        </div>

                        <div className="info-card">
                          <span>Gender</span>
                          <h3>{selectedPatient.gender || "--"}</h3>
                        </div>

                        <div className="info-card">
                          <span>Blood Group</span>
                          <h3>{selectedPatient.blood_group || "--"}</h3>
                        </div>

                        <div className="info-card">
                          <span>Phone</span>
                          <h3>{selectedPatient.phone || "--"}</h3>
                        </div>

                        <div className="info-card">
                          <span>Email</span>
                          <h3>{selectedPatient.email || "--"}</h3>
                        </div>

                        <div className="info-card">
                          <span>Address</span>
                          <h3>{selectedPatient.address || "--"}</h3>
                        </div>
                      </div>

                      <div className="medical-notes-box">
                        <h3>Medical Notes</h3>

                        <p>
                          {selectedPatient.medical_notes ||
                            "No medical notes available."}
                        </p>
                      </div>

                      <div className="patient-extra-grid">
                        <div className="extra-info-card">
                          <h3>Emergency Contact</h3>

                          <div className="extra-info-row">
                            <span>Contact Name</span>
                            <b>
                              {selectedPatient.emergency_contact_name || "--"}
                            </b>
                          </div>

                          <div className="extra-info-row">
                            <span>Phone Number</span>
                            <b>
                              {selectedPatient.emergency_contact_phone || "--"}
                            </b>
                          </div>
                        </div>

                        <div className="extra-info-card">
                          <h3>Insurance Details</h3>

                          <div className="extra-info-row">
                            <span>Insurance Provider</span>
                            <b>{selectedPatient.insurance_provider || "--"}</b>
                          </div>

                          <div className="extra-info-row">
                            <span>Policy Number</span>
                            <b>
                              {selectedPatient.insurance_policy_number || "--"}
                            </b>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="patient-summary-grid">
                    <div className="summary-card">
                      <i className="bi bi-file-earmark-medical"></i>
                      <div>
                        <span>Documents</span>
                        <h3>{selectedPatient.documents?.length || 0}</h3>
                      </div>
                    </div>

                    <div className="summary-card">
                      <i className="bi bi-calendar-check"></i>
                      <div>
                        <span>Appointments</span>
                        <h3>
                          {
                            appointments.filter(
                              (a) =>
                                a.patient_id === selectedPatient.patient_id,
                            ).length
                          }
                        </h3>
                      </div>
                    </div>

                    <div className="summary-card">
                      <i className="bi bi-receipt"></i>
                      <div>
                        <span>Total Bills</span>
                        <h3>
                          {
                            bills.filter(
                              (b) =>
                                b.patient_id === selectedPatient.patient_id,
                            ).length
                          }
                        </h3>
                      </div>
                    </div>

                    <div className="summary-card">
                      <i className="bi bi-cash-stack"></i>
                      <div>
                        <span>Pending Amount</span>
                        <h3>
                          ₹
                          {bills
                            .filter(
                              (b) =>
                                b.patient_id === selectedPatient.patient_id &&
                                b.status !== "paid",
                            )
                            .reduce((sum, b) => sum + Number(b.amount || 0), 0)}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <div className="patient-related-grid">
                    <div className="patient-related-card">
                      <h3>Appointment History</h3>

                      {(() => {
                        const patientAppointments = appointments.filter(
                          (a) => a.patient_id === selectedPatient.patient_id,
                        );

                        if (!patientAppointments.length) {
                          return (
                            <p className="muted">No appointments found.</p>
                          );
                        }

                        return patientAppointments.map((a) => (
                          <div className="mini-record" key={a.id || a._id}>
                            <div>
                              <b>
                                {a.doctor_name ||
                                  a.doctor_id ||
                                  "Doctor not assigned"}
                              </b>
                              <p>
                                {a.appointment_date || "No date"} •{" "}
                                {a.appointment_time || "No time"}
                              </p>
                            </div>

                            <span className="record-status">
                              {a.status || "scheduled"}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>

                    <div className="patient-related-card">
                      <h3>Billing Summary</h3>

                      {(() => {
                        const patientBills = bills.filter(
                          (b) => b.patient_id === selectedPatient.patient_id,
                        );

                        if (!patientBills.length) {
                          return <p className="muted">No bills found.</p>;
                        }

                        return patientBills.map((b) => (
                          <div className="mini-record" key={b.id || b._id}>
                            <div>
                              <b>₹{b.amount}</b>
                              <p>Bill Status</p>
                            </div>

                            <span className="record-status">
                              {b.status || "unpaid"}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                    <div className="patient-document-card profile-documents">
                      <div className="patient-document-header">
                        <div>
                          <h2>Patient Documents</h2>
                          <p className="muted">
                            Uploaded records for this patient.
                          </p>
                        </div>
                      </div>

                      {(() => {
                        const docs =
                          selectedPatient.documents ||
                          savedPatientDocs[selectedPatient.patient_id] ||
                          [];

                        if (!docs.length) {
                          return (
                            <p className="muted">
                              No documents uploaded for this patient.
                            </p>
                          );
                        }

                        return (
                          <div className="patient-document-list">
                            {docs.map((doc) => (
                              <div
                                className="patient-document-item"
                                key={doc.id}
                              >
                                <div className="patient-document-info">
                                  <div className="document-icon">
                                    <i className="bi bi-file-earmark-medical"></i>
                                  </div>

                                  <div>
                                    <h4>{doc.title}</h4>

                                    <p>
                                      {doc.document_type} • {doc.category}
                                    </p>

                                    <small>Uploaded: {doc.uploaded_at}</small>
                                  </div>
                                </div>

                                <div className="patient-document-actions">
                                  <button
                                    className="icon-btn profile-btn"
                                    title="View Document"
                                    onClick={() =>
                                      window.open(doc.file_url, "_blank")
                                    }
                                  >
                                    <i className="bi bi-eye"></i>
                                  </button>

                                  <a
                                    href={doc.file_url}
                                    download={doc.file_name}
                                    className="icon-btn edit-btn"
                                    title="Download Document"
                                  >
                                    <i className="bi bi-download"></i>
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
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
                      onChange={(e) =>
                        setAppointmentStatusFilter(e.target.value)
                      }
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
                              <p
                                className="muted"
                                style={{ margin: "4px 0 0" }}
                              >
                                Patient ID: {a.patient_id}
                              </p>
                            </div>

                            <div>
                              <b>{a.doctor_name || a.doctor_id}</b>
                              <p
                                className="muted"
                                style={{ margin: "4px 0 0" }}
                              >
                                Doctor ID: {a.doctor_id}
                              </p>
                            </div>

                            <div>
                              <b>{a.appointment_date || "No date"}</b>
                              <p
                                className="muted"
                                style={{ margin: "4px 0 0" }}
                              >
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
                          onClick={() =>
                            setAppointmentPage(appointmentPage - 1)
                          }
                        >
                          Previous
                        </button>

                        <span>
                          Page {appointmentPage} of {appointmentTotalPages || 1}
                        </span>

                        <button
                          disabled={appointmentPage >= appointmentTotalPages}
                          onClick={() =>
                            setAppointmentPage(appointmentPage + 1)
                          }
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
                <Form
                  title="Add Bed"
                  data={bed}
                  setData={setBed}
                  submit={addBed}
                />
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
                  <div
                    style={{ display: "flex", gap: 18, alignItems: "center" }}
                  >
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
                      {profile.bio && (
                        <p
                          style={{
                            margin: "8px 0 0",
                            color: "#475569",
                            maxWidth: 520,
                          }}
                        >
                          {profile.bio}
                        </p>
                      )}
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
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageUpload}
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
          </div>
        </main>
      </div>
    </>
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
