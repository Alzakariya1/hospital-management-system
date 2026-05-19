import React from "react";
import { DataTable } from "../components";

const BED_STATUSES = ["available", "occupied", "reserved", "cleaning", "maintenance", "inactive"];

export default function Beds({ bed, setBed, addBed, beds, permissions = {} }) {
  return (
    <section className="modulePage bedsPage">
      {permissions.bedCreate && (
        <form className="card form polishedForm" onSubmit={addBed}>
          <div className="sectionTitleRow">
            <div>
              <h2>Add Bed</h2>
              <p className="muted">Create ward-wise beds with operational status. Bed numbers are checked per hospital and ward.</p>
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
        <div className="sectionTitleRow"><h2>Bed Register</h2><span className="muted">{beds?.length || 0} records</span></div>
        <DataTable rows={beds} cols={["hospital_id", "ward", "bed_number", "status"]} />
      </div>
    </section>
  );
}
