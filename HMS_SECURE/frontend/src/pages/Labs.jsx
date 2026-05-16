import React, { useMemo, useState } from "react";

const LAB_STATUS = [
  ["ordered", "Ordered"],
  ["sample_collected", "Sample Collected"],
  ["processing", "Processing"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
];

const RAD_STATUS = [
  ["ordered", "Ordered"],
  ["scheduled", "Scheduled"],
  ["scanned", "Scanned"],
  ["reported", "Reported"],
  ["cancelled", "Cancelled"],
];

function Badge({ value }) {
  return <span className={`statusPill statusPill-${String(value || "").replaceAll("_", "-")}`}>{String(value || "ordered").replaceAll("_", " ")}</span>;
}

function PersonSelect({ value, onChange, list, placeholder, type }) {
  return (
    <select value={value || ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {list.map((item) => {
        const code = type === "doctor" ? item.doctor_id || item.id : item.patient_id || item.id;
        return <option key={item.id} value={code}>{item.full_name || item.name} {code ? `(${code})` : ""}</option>;
      })}
    </select>
  );
}

function ReportMiniForm({ onSubmit, type }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ report_file: "", image_file: "", report_notes: "" });
  if (!open) return <button type="button" className="miniBtn" onClick={() => setOpen(true)}>Upload Report</button>;
  return (
    <div className="miniReportBox">
      {type === "radiology" && (
        <input placeholder="Image/scan file URL" value={form.image_file} onChange={(e) => setForm({ ...form, image_file: e.target.value })} />
      )}
      <input placeholder="Report file URL" value={form.report_file} onChange={(e) => setForm({ ...form, report_file: e.target.value })} />
      <textarea placeholder="Report notes" value={form.report_notes} onChange={(e) => setForm({ ...form, report_notes: e.target.value })} />
      <div className="rowActions">
        <button type="button" onClick={() => onSubmit(form)}>Save Report</button>
        <button type="button" className="ghostBtn" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}

export default function Labs({
  lab,
  setLab,
  addLab,
  labs = [],
  rad,
  setRad,
  addRadiology,
  rads = [],
  patients = [],
  doctors = [],
  updateLabStatus,
  uploadLabReport,
  updateRadiologyStatus,
  uploadRadiologyReport,
  permissions = {},
}) {
  const [active, setActive] = useState("lab");
  const labStats = useMemo(() => ({
    total: labs.length,
    pending: labs.filter((x) => ["ordered", "sample_collected", "processing"].includes(x.test_status || "ordered")).length,
    completed: labs.filter((x) => (x.test_status || "") === "completed").length,
  }), [labs]);
  const radStats = useMemo(() => ({
    total: rads.length,
    pending: rads.filter((x) => ["ordered", "scheduled", "scanned"].includes(x.status || "ordered")).length,
    completed: rads.filter((x) => (x.status || "") === "reported" || (x.status || "") === "completed").length,
  }), [rads]);

  return (
    <section className="labWorkflowPage">
      <div className="pageHero">
        <div>
          <p className="eyebrow">Clinical Diagnostics</p>
          <h1>Lab & Radiology Workflow</h1>
          <p className="muted">Create diagnostic orders, track status, and attach reports to patient EMR timeline.</p>
        </div>
        <div className="segmented">
          <button className={active === "lab" ? "active" : ""} onClick={() => setActive("lab")}>Laboratory</button>
          <button className={active === "radiology" ? "active" : ""} onClick={() => setActive("radiology")}>Radiology</button>
        </div>
      </div>

      {active === "lab" && (
        <>
          <div className="statsGrid">
            <div className="statCard"><span>Total Lab Orders</span><strong>{labStats.total}</strong></div>
            <div className="statCard"><span>Pending Workflow</span><strong>{labStats.pending}</strong></div>
            <div className="statCard"><span>Completed Reports</span><strong>{labStats.completed}</strong></div>
          </div>

          {permissions.labCreate && (
            <form className="enterpriseForm" onSubmit={addLab}>
              <h3>Create Lab Order</h3>
              <div className="formGrid">
                <PersonSelect type="patient" list={patients} value={lab.patient_id} placeholder="Select patient" onChange={(v) => setLab({ ...lab, patient_id: v })} />
                <PersonSelect type="doctor" list={doctors} value={lab.doctor_id} placeholder="Select doctor" onChange={(v) => setLab({ ...lab, doctor_id: v })} />
                <input placeholder="Test name" value={lab.test_name || ""} onChange={(e) => setLab({ ...lab, test_name: e.target.value })} required />
                <input placeholder="Category" value={lab.test_category || ""} onChange={(e) => setLab({ ...lab, test_category: e.target.value })} />
                <select value={lab.priority || "routine"} onChange={(e) => setLab({ ...lab, priority: e.target.value })}>
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">STAT</option>
                </select>
                <input placeholder="Notes" value={lab.notes || ""} onChange={(e) => setLab({ ...lab, notes: e.target.value })} />
              </div>
              <button>Create Lab Order</button>
            </form>
          )}

          <div className="workflowTableCard">
            <h3>Lab Orders</h3>
            <table>
              <thead><tr><th>ID</th><th>Patient</th><th>Doctor</th><th>Test</th><th>Priority</th><th>Status</th><th>Report</th><th>Actions</th></tr></thead>
              <tbody>
                {labs.map((row) => (
                  <tr key={row.id}>
                    <td>#{row.id}</td>
                    <td>{row.patient_name || row.patient_id || "-"}</td>
                    <td>{row.doctor_name || row.doctor_id || "-"}</td>
                    <td>{row.test_name || row.name || "-"}</td>
                    <td>{row.priority || "routine"}</td>
                    <td><Badge value={row.test_status || "ordered"} /></td>
                    <td>{row.report_file ? <a href={row.report_file} target="_blank" rel="noreferrer">View</a> : <span className="muted">Not uploaded</span>}</td>
                    <td>
                      <select value={row.test_status || "ordered"} onChange={(e) => updateLabStatus?.(row.id, e.target.value)}>
                        {LAB_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <ReportMiniForm type="lab" onSubmit={(payload) => uploadLabReport?.(row.id, payload)} />
                    </td>
                  </tr>
                ))}
                {!labs.length && <tr><td colSpan="8" className="emptyCell">No lab orders yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {active === "radiology" && (
        <>
          <div className="statsGrid">
            <div className="statCard"><span>Total Radiology Orders</span><strong>{radStats.total}</strong></div>
            <div className="statCard"><span>Pending Workflow</span><strong>{radStats.pending}</strong></div>
            <div className="statCard"><span>Reported Scans</span><strong>{radStats.completed}</strong></div>
          </div>

          {permissions.radiologyCreate && (
            <form className="enterpriseForm" onSubmit={addRadiology}>
              <h3>Create Radiology Order</h3>
              <div className="formGrid">
                <PersonSelect type="patient" list={patients} value={rad.patient_id} placeholder="Select patient" onChange={(v) => setRad({ ...rad, patient_id: v })} />
                <PersonSelect type="doctor" list={doctors} value={rad.doctor_id} placeholder="Select doctor" onChange={(v) => setRad({ ...rad, doctor_id: v })} />
                <input placeholder="Scan name" value={rad.scan_name || ""} onChange={(e) => setRad({ ...rad, scan_name: e.target.value })} required />
                <input placeholder="Category" value={rad.scan_category || ""} onChange={(e) => setRad({ ...rad, scan_category: e.target.value })} />
                <select value={rad.priority || "routine"} onChange={(e) => setRad({ ...rad, priority: e.target.value })}>
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">STAT</option>
                </select>
                <input placeholder="Notes" value={rad.notes || ""} onChange={(e) => setRad({ ...rad, notes: e.target.value })} />
              </div>
              <button>Create Radiology Order</button>
            </form>
          )}

          <div className="workflowTableCard">
            <h3>Radiology Orders</h3>
            <table>
              <thead><tr><th>ID</th><th>Patient</th><th>Doctor</th><th>Scan</th><th>Priority</th><th>Status</th><th>Report</th><th>Actions</th></tr></thead>
              <tbody>
                {rads.map((row) => (
                  <tr key={row.id}>
                    <td>#{row.id}</td>
                    <td>{row.patient_name || row.patient_id || "-"}</td>
                    <td>{row.doctor_name || row.doctor_id || "-"}</td>
                    <td>{row.scan_name || row.name || "-"}</td>
                    <td>{row.priority || "routine"}</td>
                    <td><Badge value={row.status || "ordered"} /></td>
                    <td>{row.report_file ? <a href={row.report_file} target="_blank" rel="noreferrer">View</a> : <span className="muted">Not uploaded</span>}</td>
                    <td>
                      <select value={row.status || "ordered"} onChange={(e) => updateRadiologyStatus?.(row.id, e.target.value)}>
                        {RAD_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <ReportMiniForm type="radiology" onSubmit={(payload) => uploadRadiologyReport?.(row.id, payload)} />
                    </td>
                  </tr>
                ))}
                {!rads.length && <tr><td colSpan="8" className="emptyCell">No radiology orders yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
