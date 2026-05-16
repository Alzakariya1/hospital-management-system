import React from "react";
import { DataTable } from "../components";

// Compatibility alias while remaining pages are being split safely.
const Table = DataTable;

export default function Patients({
  patient,
  setPatient,
  emptyPatient,
  editingPatientId,
  setEditingPatientId,
  patientProfilePreview,
  setPatientProfilePreview,
  patientProfileImage,
  setPatientProfileImage,
  pendingPatientDocs,
  setPendingPatientDocs,
  patientDocForm,
  setPatientDocForm,
  handlePatientProfileImage,
  handlePendingPatientDocument,
  removePendingPatientDocument,
  addPatient,
  patientSearch,
  setPatientSearch,
  paginatedPatients,
  editPatient,
  deletePatient,
  patients,
  setSelectedPatient,
  setTab,
  patientPage,
  setPatientPage,
  patientTotalPages,
  selectedPatient,
  appointments,
  bills,
  savedPatientDocs,
  activeView = "patients",
  permissions = {},
}) {
  return (
    <>
      {activeView === "patients" && (
              <section>
                {(editingPatientId ? permissions.patientEdit : permissions.patientCreate) && (
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
                        Upload
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

                  {permissions.patientDocumentManage && (<>
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

                  </>)}

                  <button type="submit" className="patient-save-btn">
                    {editingPatientId ? "Update Patient" : "Save Patient"}
                  </button>
                </form>
                )}
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
                    onEdit={permissions.patientEdit ? editPatient : null}
                    onDelete={permissions.patientDelete ? deletePatient : null}
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

      {activeView === "patientProfile" && selectedPatient && (
              <section className="keka-profile-page patient-keka-profile">
                <button className="profileBackBtn" onClick={() => setTab("patients")}>
                  ← Back to Patients
                </button>

                <div className="card keka-entity-profile-card" style={{ marginTop: 16 }}>
                  <div className="keka-cover-card compact-cover">
                    <div className="keka-cover-art"></div>
                    <div className="keka-cover-content entity-cover-content">
                      <div className="keka-cover-title-block">
                        <span className="doctor-kicker">Patient Overview</span>
                        <h1>{selectedPatient.full_name}</h1>
                        <p>Patient ID: {selectedPatient.patient_id} • {selectedPatient.gender || "Not added"} • {selectedPatient.blood_group || "Blood group not added"}</p>
                      </div>
                      <div className="keka-profile-score"><div className="score-ring">{selectedPatient.documents?.length || 0}</div><div><b>Documents</b><span>Saved records</span></div></div>
                    </div>
                  </div>

                  <div className="patient-profile-top keka-entity-overview">
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
                          <span className="doctor-kicker">Personal Details</span>
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
    </>
  );
}
