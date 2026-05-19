import React from "react";
import toast from "react-hot-toast";
import { DataTable } from "../components";

const BED_STATUSES = ["available", "occupied", "reserved", "cleaning", "maintenance", "inactive"];

export default function Beds({ bed, setBed, addBed, beds = [], permissions = {} }) {
  function submit(e) {
    e.preventDefault();
    const duplicate = beds.some((b) => String(b.ward || '').trim().toLowerCase() === String(bed.ward || '').trim().toLowerCase() && String(b.bed_number || '').trim().toLowerCase() === String(bed.bed_number || '').trim().toLowerCase());
    if (duplicate) return toast.error('This ward + bed number already exists for this hospital.');
    return addBed(e);
  }
  const counts = BED_STATUSES.reduce((acc, s) => ({ ...acc, [s]: beds.filter((b) => String(b.status || '').toLowerCase() === s).length }), {});
  return (
    <section className="modulePage bedsPage improvedBedsPage">
      <div className="bedStatusGrid">
        {BED_STATUSES.slice(0, 5).map((s) => <div className="card bedMetric" key={s}><span>{s}</span><strong>{counts[s] || 0}</strong></div>)}
      </div>
      {permissions.bedCreate && (
        <form className="card form polishedForm" onSubmit={submit}>
          <div className="sectionTitleRow">
            <div>
              <h2>Add Bed</h2>
              <p className="muted">Bed status now uses hospital-friendly values only. Duplicate ward + bed number is blocked before submit.</p>
            </div>
          </div>
          <div className="formGrid labeledGrid">
            <label><span>Ward *</span><input required placeholder="e.g. OPD, General, ICU" value={bed.ward || ""} onChange={(e) => setBed({ ...bed, ward: e.target.value })} /></label>
            <label><span>Bed Number *</span><input required placeholder="e.g. 001" value={bed.bed_number || ""} onChange={(e) => setBed({ ...bed, bed_number: e.target.value })} /></label>
            <label><span>Status</span><select value={bed.status || "available"} onChange={(e) => setBed({ ...bed, status: e.target.value })}>{BED_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
          </div>
          <button>Save Bed</button>
        </form>
      )}
      <div className="card">
        <div className="sectionTitleRow"><h2>Bed Register</h2><span className="muted">{beds.length} records</span></div>
        <DataTable rows={beds} cols={["ward", "bed_number", "status", "patient_id"]} />
      </div>
    </section>
  );
}
