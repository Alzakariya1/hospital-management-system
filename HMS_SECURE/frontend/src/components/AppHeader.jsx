import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bell, RefreshCcw, Search, X } from "lucide-react";

function safeText(value) {
  return String(value || "").toLowerCase();
}

export default function AppHeader({
  title,
  user,
  appointmentCount,
  lowStockCount,
  pendingBillCount,
  onRefresh,
  searchData,
  onSearchNavigate,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    }
    function onClick(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const results = useMemo(() => {
    const q = safeText(query).trim();
    const patients = searchData?.patients || [];
    const doctors = searchData?.doctors || [];
    const actions = searchData?.actions || [];
    if (!q) return { patients: [], doctors: [], actions: actions.slice(0, 6) };
    return {
      patients: patients
        .filter((p) => [p.full_name, p.patient_id, p.phone, p.email].some((v) => safeText(v).includes(q)))
        .slice(0, 5),
      doctors: doctors
        .filter((d) => [d.full_name, d.doctor_id, d.phone, d.email, d.specialization].some((v) => safeText(v).includes(q)))
        .slice(0, 5),
      actions: actions.filter((a) => safeText(a.label).includes(q)).slice(0, 6),
    };
  }, [query, searchData]);

  const hasResults = results.patients.length || results.doctors.length || results.actions.length;

  function choose(type, item) {
    setOpen(false);
    setQuery("");
    onSearchNavigate?.(type, item);
  }

  return (
    <header className="appHeader">
      <div className="topBar">
        <div className="topBarSearch" ref={wrapRef}>
          <Search size={17} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search patients, doctors or actions..."
            aria-label="Global search"
          />
          {query ? (
            <button type="button" className="searchClear" onClick={() => setQuery("")} aria-label="Clear search">
              <X size={14} />
            </button>
          ) : null}
          <kbd>Alt + K</kbd>

          {open ? (
            <div className="searchDropdown">
              <div className="searchSection">
                <b>Patients</b>
                {results.patients.length ? results.patients.map((p) => (
                  <button type="button" key={`p-${p.id || p.patient_id}`} onClick={() => choose("patient", p)}>
                    <span>{p.full_name || "Unnamed Patient"}</span>
                    <small>{p.patient_id || p.phone || p.email || "Patient"}</small>
                  </button>
                )) : <p>No patient found</p>}
              </div>
              <div className="searchSection">
                <b>Doctors</b>
                {results.doctors.length ? results.doctors.map((d) => (
                  <button type="button" key={`d-${d.id || d.doctor_id}`} onClick={() => choose("doctor", d)}>
                    <span>{d.full_name || "Unnamed Doctor"}</span>
                    <small>{d.specialization || d.doctor_id || d.email || "Doctor"}</small>
                  </button>
                )) : <p>No doctor found</p>}
              </div>
              <div className="searchSection">
                <b>Actions</b>
                {results.actions.length ? results.actions.map((a) => (
                  <button type="button" key={a.key} onClick={() => choose("action", a)}>
                    <span>{a.label}</span>
                    <small>{a.hint}</small>
                  </button>
                )) : <p>No action found</p>}
              </div>
              {!hasResults ? <div className="searchEmpty">No matching result</div> : null}
            </div>
          ) : null}
        </div>
        <div className="topBarActions">
          <button type="button" className="iconBtn" aria-label="Notifications"><Bell size={18} /></button>
          <div className="userChip">
            <span>{(user?.full_name || "User").slice(0, 1).toUpperCase()}</span>
            <div><b>{user?.full_name || "User"}</b><small>{user?.hospital_name || "Hospital"}</small></div>
          </div>
        </div>
      </div>

      <div className="pageHeader">
        <div><h1>{title}</h1><p>Welcome back, {user?.full_name || "User"}</p></div>
        <div className="headerMetrics">
          <span>📅 {appointmentCount} Appointments</span>
          <span>💊 {lowStockCount} Low Stock</span>
          <span>💰 {pendingBillCount} Pending Bills</span>
          <button type="button" onClick={onRefresh} className="refreshBtn"><RefreshCcw size={15} />Refresh</button>
        </div>
      </div>
    </header>
  );
}
