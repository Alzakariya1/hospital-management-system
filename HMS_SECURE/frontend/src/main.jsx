import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "bootstrap-icons/font/bootstrap-icons.css";
import {
  Activity,
  Bed,
  Building2,
  Calendar,
  Pill,
  ReceiptText,
  Stethoscope,
  TestTube2,
  Users,
  UserCircle,
} from "lucide-react";
import { Toaster, toast } from "react-hot-toast";
import {
  appointmentApi,
  authApi,
  bedApi,
  billingApi,
  dashboardApi,
  doctorApi,
  labApi,
  patientApi,
  pharmacyApi,
  radiologyApi,
  tenantApi,
} from "./api";
import { AppLayout } from "./layouts";
import {
  AdminProfile,
  Appointments,
  Beds,
  Billing,
  Dashboard,
  Doctors,
  Labs,
  Login,
  Patients,
  Pharmacy,
  TenantControl,
} from "./pages";
import { DEFAULT_ENABLED_MODULES, DEFAULT_FEATURE_FLAGS, filterTabsByPermissions, hasPermission, normalizeFeatureFlags } from "./utils";
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

function App() {
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("user") || "null"),
  );
  const [tab, setTab] = useState("dashboard");
  const [currentHospital, setCurrentHospital] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [tenantForm, setTenantForm] = useState({
    hospital_code: "",
    name: "",
    type: "hospital",
    plan: "enterprise",
    status: "active",
    enabled_modules: DEFAULT_ENABLED_MODULES,
    feature_flags: DEFAULT_FEATURE_FLAGS,
  });
  const [editingTenantId, setEditingTenantId] = useState(null);
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
    try {
      const { data: hospital } = await tenantApi.me();
      setCurrentHospital(hospital);
      if (hospital?.name && (!user?.hospital_name || user.hospital_name !== hospital.name)) {
        const enrichedUser = { ...user, hospital_id: hospital.id, hospital_name: hospital.name };
        setUser(enrichedUser);
        localStorage.setItem("user", JSON.stringify(enrichedUser));
      }
    } catch (_) {
      // Tenant endpoint is backward-compatible; ignore if current server has not deployed it yet.
    }
    const calls = [
      dashboardApi.getStats(),
      patientApi.list(),
      doctorApi.list(),
      appointmentApi.list(),
      bedApi.list(),
      labApi.list(),
      radiologyApi.list(),
      pharmacyApi.list(),
      billingApi.list(),
      authApi.getUsers(),
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
    if (hasPermission(user, "hospital.manage")) {
      try {
        const { data: tenantRows } = await tenantApi.list();
        setTenants(tenantRows);
      } catch (_) {
        setTenants([]);
      }
    }
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
        await patientApi.update(editingPatientId, patient);
        toast.success("Patient updated successfully");
      } else {
        const { data } = await patientApi.create(patient);
        savedPatientId = data.id;
        toast.success("Patient added successfully");
      }
      if (patientProfileImage && savedPatientId) {
        const imageFormData = new FormData();

        imageFormData.append("profile_image", patientProfileImage);

        const imageUploadResponse = await patientApi.uploadProfileImage(savedPatientId, imageFormData);

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

        const { data } = await patientApi.uploadDocument(savedPatientId, formData);

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
        await doctorApi.update(editingDoctorId, doctor);
        toast.success("Doctor updated successfully");
        setEditingDoctorId(null);
      } else {
        await doctorApi.create(doctor);
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
      await patientApi.delete(row.id || row._id);
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
      title: patientDocForm.title || file.name,
      notes: patientDocForm.notes,
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
      await doctorApi.delete(row.id || row._id);
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
        await appointmentApi.update(editingAppointmentId, appointment);
        toast.success("Appointment updated successfully");
        setEditingAppointmentId(null);
      } else {
        await appointmentApi.create(appointment);
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
      await appointmentApi.delete(row.id || row._id);
      await load();
      toast.success("Appointment deleted successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  }

  async function addBed(e) {
    e.preventDefault();
    await bedApi.create(bed);
    setBed(emptyBed);
    await load();
  }

  async function addLab(e) {
    e.preventDefault();
    await labApi.create(lab);
    setLab(emptyLab);
    await load();
  }

  async function addRadiology(e) {
    e.preventDefault();
    await radiologyApi.create(rad);
    setRad(emptyRad);
    await load();
  }

  async function addMedicine(e) {
    e.preventDefault();
    await pharmacyApi.create(med);
    setMed(emptyMed);
    await load();
  }

  async function addBill(e) {
    e.preventDefault();
    await billingApi.create(bill);
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
      const { data } = await authApi.updateProfile(profile);
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
      await authApi.changePassword(passwordForm);
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
      await authApi.createUser(newUser);
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
    await authApi.updateUserStatus(row.id, row.status === "active" ? "inactive" : "active");

    await load();
  }
  async function deleteUser(row) {
    if (row.email === user.email) {
      return toast.error("You cannot delete your own admin account");
    }

    if (!confirm("Delete this user?")) return;

    try {
      await authApi.deleteUser(row.id);
      await load();
      toast.success("User deleted successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "User delete failed");
    }
  }
  async function saveTenant(e) {
    e.preventDefault();
    if (!tenantForm.name?.trim()) return toast.error("Hospital name is required");

    try {
      const payload = {
        ...tenantForm,
        hospital_code: tenantForm.hospital_code?.trim() || undefined,
      };

      if (editingTenantId) {
        await tenantApi.update(editingTenantId, payload);
        toast.success("Hospital updated successfully");
      } else {
        await tenantApi.create(payload);
        toast.success("Hospital created successfully");
      }

      setTenantForm({ hospital_code: "", name: "", type: "hospital", plan: "enterprise", status: "active", enabled_modules: DEFAULT_ENABLED_MODULES, feature_flags: DEFAULT_FEATURE_FLAGS });
      setEditingTenantId(null);
      const { data } = await tenantApi.list();
      setTenants(data);
      try {
        const { data: updatedHospital } = await tenantApi.me();
        setCurrentHospital(updatedHospital);
      } catch (_) {
        // keep current hospital state unchanged if refresh fails
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Hospital save failed");
    }
  }

  function editTenant(row) {
    setEditingTenantId(row.id);
    setTenantForm({
      hospital_code: row.hospital_code || "",
      name: row.name || "",
      type: row.type || "hospital",
      plan: row.plan || "enterprise",
      status: row.status || "active",
      enabled_modules: Array.isArray(row.enabled_modules) && row.enabled_modules.length ? row.enabled_modules : DEFAULT_ENABLED_MODULES,
      feature_flags: normalizeFeatureFlags(row.feature_flags),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleTenantStatus(row) {
    try {
      await tenantApi.update(row.id, { status: row.status === "active" ? "inactive" : "active" });
      const { data } = await tenantApi.list();
      setTenants(data);
      toast.success("Hospital status updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Status update failed");
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
    ["tenants", "Hospitals", Building2],
  ];

  const enabledModules = currentHospital?.enabled_modules || DEFAULT_ENABLED_MODULES;
  const tabs = filterTabsByPermissions(user, allTabs, enabledModules);

  useEffect(() => {
    if (tabs.length && !tabs.some(([id]) => id === tab)) {
      setTab(tabs[0][0]);
    }
  }, [tab, tabs]);

  const can = (permission) => hasPermission(user, permission);

  const permissions = {
    patientCreate: can("patient.create"),
    patientEdit: can("patient.edit"),
    patientDelete: can("patient.delete"),
    patientDocumentManage: can("patient.document.manage"),
    doctorCreate: can("doctor.create"),
    doctorEdit: can("doctor.edit"),
    doctorDelete: can("doctor.delete"),
    appointmentCreate: can("appointment.create"),
    appointmentEdit: can("appointment.edit"),
    appointmentDelete: can("appointment.delete"),
    bedCreate: can("bed.create"),
    labCreate: can("lab.create"),
    radiologyCreate: can("radiology.create"),
    pharmacyCreate: can("pharmacy.create"),
    billingCreate: can("billing.create"),
    adminUsersManage: can("admin.users.manage"),
    hospitalManage: can("hospital.manage"),
    featureFlags: normalizeFeatureFlags(currentHospital?.feature_flags),
  };

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
      <AppLayout
        user={user}
        tabs={tabs}
        activeTab={tab}
        onTabChange={setTab}
        onLogout={logout}
        headerTitle={tabs.find((t) => t[0] === tab)?.[1]}
        appointmentCount={appointments.length}
        lowStockCount={meds.filter((m) => Number(m.stock || 0) < 10).length}
        pendingBillCount={bills.filter((b) => b.status === "pending").length}
        onRefresh={load}
      >
            {tab === "dashboard" && (
              <Dashboard
                stats={stats}
                patients={patients}
                doctors={doctors}
                appointments={appointments}
                beds={beds}
                bills={bills}
                permissions={permissions}
              />
            )}
            {tab === "patients" && (
              <Patients
                patient={patient}
                setPatient={setPatient}
                emptyPatient={emptyPatient}
                editingPatientId={editingPatientId}
                setEditingPatientId={setEditingPatientId}
                patientProfilePreview={patientProfilePreview}
                setPatientProfilePreview={setPatientProfilePreview}
                patientProfileImage={patientProfileImage}
                setPatientProfileImage={setPatientProfileImage}
                pendingPatientDocs={pendingPatientDocs}
                setPendingPatientDocs={setPendingPatientDocs}
                patientDocForm={patientDocForm}
                setPatientDocForm={setPatientDocForm}
                handlePatientProfileImage={handlePatientProfileImage}
                handlePendingPatientDocument={handlePendingPatientDocument}
                removePendingPatientDocument={removePendingPatientDocument}
                addPatient={addPatient}
                patientSearch={patientSearch}
                setPatientSearch={setPatientSearch}
                paginatedPatients={paginatedPatients}
                editPatient={editPatient}
                deletePatient={deletePatient}
                patients={patients}
                setSelectedPatient={setSelectedPatient}
                setTab={setTab}
                patientPage={patientPage}
                setPatientPage={setPatientPage}
                patientTotalPages={patientTotalPages}
                selectedPatient={selectedPatient}
                appointments={appointments}
                bills={bills}
                savedPatientDocs={savedPatientDocs}
                permissions={permissions}
                activeView="patients"
              />
            )}
            {tab === "patientProfile" && selectedPatient && (
              <Patients
                patient={patient}
                setPatient={setPatient}
                emptyPatient={emptyPatient}
                editingPatientId={editingPatientId}
                setEditingPatientId={setEditingPatientId}
                patientProfilePreview={patientProfilePreview}
                setPatientProfilePreview={setPatientProfilePreview}
                patientProfileImage={patientProfileImage}
                setPatientProfileImage={setPatientProfileImage}
                pendingPatientDocs={pendingPatientDocs}
                setPendingPatientDocs={setPendingPatientDocs}
                patientDocForm={patientDocForm}
                setPatientDocForm={setPatientDocForm}
                handlePatientProfileImage={handlePatientProfileImage}
                handlePendingPatientDocument={handlePendingPatientDocument}
                removePendingPatientDocument={removePendingPatientDocument}
                addPatient={addPatient}
                patientSearch={patientSearch}
                setPatientSearch={setPatientSearch}
                paginatedPatients={paginatedPatients}
                editPatient={editPatient}
                deletePatient={deletePatient}
                patients={patients}
                setSelectedPatient={setSelectedPatient}
                setTab={setTab}
                patientPage={patientPage}
                setPatientPage={setPatientPage}
                patientTotalPages={patientTotalPages}
                selectedPatient={selectedPatient}
                appointments={appointments}
                bills={bills}
                savedPatientDocs={savedPatientDocs}
                permissions={permissions}
                activeView="patientProfile"
              />
            )}
            {tab === "doctors" && (
              <Doctors
                doctor={doctor}
                setDoctor={setDoctor}
                addDoctor={addDoctor}
                doctorSearch={doctorSearch}
                setDoctorSearch={setDoctorSearch}
                paginatedDoctors={paginatedDoctors}
                editDoctor={editDoctor}
                deleteDoctor={deleteDoctor}
                doctorPage={doctorPage}
                setDoctorPage={setDoctorPage}
                doctorTotalPages={doctorTotalPages}
                permissions={permissions}
              />
            )}
            {tab === "appointments" && (
              <Appointments
                appointment={appointment}
                setAppointment={setAppointment}
                addAppointment={addAppointment}
                appointmentSearch={appointmentSearch}
                setAppointmentSearch={setAppointmentSearch}
                appointmentStatusFilter={appointmentStatusFilter}
                setAppointmentStatusFilter={setAppointmentStatusFilter}
                filteredAppointments={filteredAppointments}
                paginatedAppointments={paginatedAppointments}
                editAppointment={editAppointment}
                deleteAppointment={deleteAppointment}
                appointmentPage={appointmentPage}
                setAppointmentPage={setAppointmentPage}
                appointmentTotalPages={appointmentTotalPages}
                permissions={permissions}
              />
            )}

            {tab === "beds" && (
              <Beds bed={bed} setBed={setBed} addBed={addBed} beds={beds} permissions={permissions} />
            )}

            {tab === "labs" && (
              <Labs
                lab={lab}
                setLab={setLab}
                addLab={addLab}
                labs={labs}
                rad={rad}
                setRad={setRad}
                addRadiology={addRadiology}
                rads={rads}
                permissions={permissions}
              />
            )}

            {tab === "pharmacy" && (
              <Pharmacy
                med={med}
                setMed={setMed}
                addMedicine={addMedicine}
                meds={meds}
                permissions={permissions}
              />
            )}

            {tab === "billing" && (
              <Billing
                bill={bill}
                setBill={setBill}
                addBill={addBill}
                bills={bills}
                permissions={permissions}
              />
            )}
            {tab === "tenants" && (
              <TenantControl
                tenants={tenants}
                tenantForm={tenantForm}
                setTenantForm={setTenantForm}
                editingTenantId={editingTenantId}
                setEditingTenantId={setEditingTenantId}
                saveTenant={saveTenant}
                editTenant={editTenant}
                toggleTenantStatus={toggleTenantStatus}
                currentHospital={currentHospital}
                enabledModules={enabledModules}
                permissions={permissions}
              />
            )}
            {tab === "profile" && (
              <AdminProfile
                user={user}
                profile={profile}
                setProfile={setProfile}
                updateProfile={updateProfile}
                handleProfileImageUpload={handleProfileImageUpload}
                passwordForm={passwordForm}
                setPasswordForm={setPasswordForm}
                changePassword={changePassword}
                newUser={newUser}
                setNewUser={setNewUser}
                addUser={addUser}
                userSearch={userSearch}
                setUserSearch={setUserSearch}
                roleFilter={roleFilter}
                setRoleFilter={setRoleFilter}
                filteredUsers={filteredUsers}
                toggleUserStatus={toggleUserStatus}
                deleteUser={deleteUser}
                permissions={permissions}
              />
            )}
      </AppLayout>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
