import React from "react";
import { DataTable } from "../components";

function Field({ label, children }) {
  return (
    <div className="profileField">
      <span>{label}</span>
      <b>{children || "—"}</b>
    </div>
  );
}

export default function Doctors({
  doctor,
  setDoctor,
  emptyDoctor,
  editingDoctorId,
  setEditingDoctorId,
  addDoctor,
  doctorProfilePreview,
  setDoctorProfilePreview,
  setDoctorProfileImage,
  handleDoctorProfileImage,
  doctorDocForm,
  setDoctorDocForm,
  pendingDoctorDocs,
  setPendingDoctorDocs,
  handlePendingDoctorDocument,
  removePendingDoctorDocument,
  doctorSearch,
  setDoctorSearch,
  paginatedDoctors,
  doctors,
  editDoctor,
  deleteDoctor,
  selectedDoctor,
  setSelectedDoctor,
  openDoctorProfile,
  setTab,
  doctorPage,
  setDoctorPage,
  doctorTotalPages,
  deleteDoctorDocument,
  activeView = "doctors",
  permissions = {},
}) {
  const resetDoctorForm = () => {
    setDoctor(emptyDoctor);
    setEditingDoctorId(null);
    setDoctorProfilePreview("");
    setDoctorProfileImage(null);
    setPendingDoctorDocs([]);
    setDoctorDocForm({
      category: "professional",
      document_type: "Medical Registration Certificate",
      title: "",
      notes: "",
    });
  };

  const doctorRows = (paginatedDoctors || []).map((d) => ({
    id: d.id,
    doctor_id: d.doctor_id,
    full_name: d.full_name,
    specialization: d.specialization,
    phone: d.phone,
    email: d.email,
    qualification: d.qualification,
    consultation_fee: d.consultation_fee,
    status: d.status || "active",
  }));

  if (activeView === "doctorProfile" && selectedDoctor) {
    const docs = selectedDoctor.documents || [];
    return (
      <section className="profilePage doctorProfilePage">
        <button type="button" className="backBtn" onClick={() => setTab("doctors")}>
          <i className="bi bi-arrow-left"></i> Back to Doctors
        </button>

        <div className="profileHeroCard doctorHeroCard">
          <div className="profileHeroLeft">
            <div className="doctorProfileAvatar">
              {selectedDoctor.profile_image_url ? (
                <img src={selectedDoctor.profile_image_url} alt={selectedDoctor.full_name} />
              ) : (
                <i className="bi bi-person-badge"></i>
              )}
            </div>
            <div>
              <p className="eyebrowText">Doctor Profile</p>
              <h1>{selectedDoctor.full_name || "Unnamed Doctor"}</h1>
              <p className="muted">
                {selectedDoctor.specialization || "Specialization not added"} • Doctor ID: {selectedDoctor.doctor_id || "—"}
              </p>
              <div className="profileBadgeRow">
                <span className="statusBadge success">{selectedDoctor.status || "active"}</span>
                {selectedDoctor.registration_number && <span className="softBadge">Reg: {selectedDoctor.registration_number}</span>}
                {selectedDoctor.license_number && <span className="softBadge">License: {selectedDoctor.license_number}</span>}
              </div>
            </div>
          </div>
          <div className="profileHeroActions">
            {permissions.doctorEdit && (
              <button type="button" onClick={() => { editDoctor(selectedDoctor); setTab("doctors"); }}>
                <i className="bi bi-pencil-square"></i> Edit Doctor
              </button>
            )}
          </div>
        </div>

        <div className="doctorSummaryGrid">
          <div className="summary-card"><i className="bi bi-mortarboard"></i><div><span>Qualification</span><h3>{selectedDoctor.qualification || "—"}</h3></div></div>
          <div className="summary-card"><i className="bi bi-briefcase"></i><div><span>Experience</span><h3>{selectedDoctor.experience_years ? `${selectedDoctor.experience_years} yrs` : "—"}</h3></div></div>
          <div className="summary-card"><i className="bi bi-cash-coin"></i><div><span>Consultation Fee</span><h3>{selectedDoctor.consultation_fee ? `₹${selectedDoctor.consultation_fee}` : "—"}</h3></div></div>
          <div className="summary-card"><i className="bi bi-file-earmark-check"></i><div><span>Documents</span><h3>{docs.length}</h3></div></div>
        </div>

        <div className="profileTwoColumnGrid">
          <div className="card profileInfoCard">
            <h2>Professional Information</h2>
            <div className="profileInfoGrid">
              <Field label="Department">{selectedDoctor.department}</Field>
              <Field label="Specialization">{selectedDoctor.specialization}</Field>
              <Field label="Qualification">{selectedDoctor.qualification}</Field>
              <Field label="Registration Number">{selectedDoctor.registration_number}</Field>
              <Field label="License Number">{selectedDoctor.license_number}</Field>
              <Field label="Availability">{selectedDoctor.availability}</Field>
            </div>
          </div>

          <div className="card profileInfoCard">
            <h2>Contact Details</h2>
            <div className="profileInfoGrid">
              <Field label="Phone">{selectedDoctor.phone}</Field>
              <Field label="Email">{selectedDoctor.email}</Field>
              <Field label="Gender">{selectedDoctor.gender}</Field>
              <Field label="Address">{selectedDoctor.address}</Field>
            </div>
          </div>
        </div>

        <div className="card profileInfoCard">
          <h2>Doctor Bio / Notes</h2>
          <p className="profileBioText">{selectedDoctor.bio || "No doctor bio or notes added yet."}</p>
        </div>

        <div className="card profileInfoCard">
          <div className="sectionTitleRow">
            <div>
              <h2>Certificates & Documents</h2>
              <p className="muted">Medical certificates, registration proof, ID documents, degrees and other records.</p>
            </div>
          </div>

          {!docs.length ? (
            <div className="emptyTableState compactEmptyState">
              <div className="emptyIcon"><i className="bi bi-file-earmark-medical"></i></div>
              <h3>No documents uploaded</h3>
              <p className="muted">Upload certificates or identity documents from the doctor form.</p>
            </div>
          ) : (
            <div className="documentCardGrid">
              {docs.map((doc, index) => (
                <div className="documentTile" key={`${doc.file_url || doc.file_name}-${index}`}>
                  <div className="documentTileIcon"><i className="bi bi-file-earmark-text"></i></div>
                  <div className="documentTileBody">
                    <h4>{doc.title || doc.file_name}</h4>
                    <p>{doc.document_type || "Document"} • {doc.category || "professional"}</p>
                    <small>{doc.notes || "No notes"}</small>
                  </div>
                  <div className="documentTileActions">
                    {doc.file_url && <button type="button" onClick={() => window.open(doc.file_url, "_blank")}><i className="bi bi-eye"></i></button>}
                    {doc.file_url && <a href={doc.file_url} download={doc.file_name} title="Download"><i className="bi bi-download"></i></a>}
                    {permissions.doctorEdit && <button type="button" className="dangerLite" onClick={() => deleteDoctorDocument?.(selectedDoctor.id, index)}><i className="bi bi-trash"></i></button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section>
      {(editingDoctorId ? permissions.doctorEdit : permissions.doctorCreate) && (
        <form className="card form doctor-complete-form" onSubmit={addDoctor}>
          <div className="patient-document-header">
            <div>
              <p className="eyebrowText">Doctor Management</p>
              <h2>{editingDoctorId ? "Edit Doctor" : "Add Doctor"}</h2>
              <p className="muted">Add doctor profile details, photo, medical registration and certificate documents.</p>
            </div>
            <div className="document-badge">{pendingDoctorDocs.length} Files</div>
            <div className="form-header-actions">
              <button type="button" className="new-patient-btn" onClick={resetDoctorForm}>
                <i className="bi bi-plus-circle"></i> New Doctor
              </button>
            </div>
          </div>

          <div className="doctorFormTopGrid">
            <div className="doctorUploadCard">
              <div className="doctorImagePreview">
                {doctorProfilePreview ? <img src={doctorProfilePreview} alt="Doctor" /> : <i className="bi bi-person-badge"></i>}
              </div>
              <label className="upload-image-btn doctorUploadBtn">
                <i className="bi bi-camera"></i> Upload Doctor Photo
                <input type="file" accept=".jpg,.jpeg,.png,.webp" hidden onChange={handleDoctorProfileImage} />
              </label>
              <p>JPG, PNG or WEBP • Max 3MB</p>
            </div>

            <div className="doctorSectionFields">
              <h3>Basic Details</h3>
              <div className="formGrid">
                <input placeholder="doctor id" value={doctor.doctor_id || ""} required onChange={(e) => setDoctor({ ...doctor, doctor_id: e.target.value })} />
                <input placeholder="full name" value={doctor.full_name || ""} required onChange={(e) => setDoctor({ ...doctor, full_name: e.target.value })} />
                <select value={doctor.gender || "male"} onChange={(e) => setDoctor({ ...doctor, gender: e.target.value })}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <input placeholder="phone" value={doctor.phone || ""} onChange={(e) => setDoctor({ ...doctor, phone: e.target.value })} />
                <input type="email" placeholder="email" value={doctor.email || ""} onChange={(e) => setDoctor({ ...doctor, email: e.target.value })} />
                <select value={doctor.status || "active"} onChange={(e) => setDoctor({ ...doctor, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="on_leave">On Leave</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="formSectionBlock">
            <h3>Professional Details</h3>
            <div className="formGrid">
              <input placeholder="specialization" value={doctor.specialization || ""} onChange={(e) => setDoctor({ ...doctor, specialization: e.target.value })} />
              <input placeholder="qualification" value={doctor.qualification || ""} onChange={(e) => setDoctor({ ...doctor, qualification: e.target.value })} />
              <input placeholder="department" value={doctor.department || ""} onChange={(e) => setDoctor({ ...doctor, department: e.target.value })} />
              <input type="number" placeholder="experience years" value={doctor.experience_years || ""} onChange={(e) => setDoctor({ ...doctor, experience_years: e.target.value })} />
              <input type="number" placeholder="consultation fee" value={doctor.consultation_fee || ""} onChange={(e) => setDoctor({ ...doctor, consultation_fee: e.target.value })} />
              <input placeholder="availability e.g. Mon-Fri, 10 AM - 4 PM" value={doctor.availability || ""} onChange={(e) => setDoctor({ ...doctor, availability: e.target.value })} />
              <input placeholder="medical registration number" value={doctor.registration_number || ""} onChange={(e) => setDoctor({ ...doctor, registration_number: e.target.value })} />
              <input placeholder="license number / council id" value={doctor.license_number || ""} onChange={(e) => setDoctor({ ...doctor, license_number: e.target.value })} />
              <input placeholder="address" value={doctor.address || ""} onChange={(e) => setDoctor({ ...doctor, address: e.target.value })} />
            </div>
            <textarea placeholder="doctor bio / notes" value={doctor.bio || ""} onChange={(e) => setDoctor({ ...doctor, bio: e.target.value })} rows={3}></textarea>
          </div>

          {permissions.doctorEdit || permissions.doctorCreate ? (
            <div className="formSectionBlock documentUploadBlock">
              <h3>Certificates & Documents</h3>
              <p className="muted">Upload medical registration, degrees, ID proof, certificates or authorization records.</p>
              <div className="patient-document-grid">
                <select value={doctorDocForm.category} onChange={(e) => setDoctorDocForm({ ...doctorDocForm, category: e.target.value })}>
                  <option value="professional">Professional</option>
                  <option value="identity">Identity</option>
                  <option value="education">Education</option>
                  <option value="certificate">Certificate</option>
                  <option value="contract">Contract</option>
                  <option value="other">Other</option>
                </select>
                <select value={doctorDocForm.document_type} onChange={(e) => setDoctorDocForm({ ...doctorDocForm, document_type: e.target.value })}>
                  <option value="Medical Registration Certificate">Medical Registration Certificate</option>
                  <option value="Degree Certificate">Degree Certificate</option>
                  <option value="Specialization Certificate">Specialization Certificate</option>
                  <option value="Government ID">Government ID</option>
                  <option value="Experience Letter">Experience Letter</option>
                  <option value="Contract / Agreement">Contract / Agreement</option>
                  <option value="Other">Other</option>
                </select>
                <input placeholder="Document title" value={doctorDocForm.title} onChange={(e) => setDoctorDocForm({ ...doctorDocForm, title: e.target.value })} />
                <input placeholder="Document notes" value={doctorDocForm.notes} onChange={(e) => setDoctorDocForm({ ...doctorDocForm, notes: e.target.value })} />
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handlePendingDoctorDocument} />
              </div>

              {pendingDoctorDocs.length > 0 && (
                <div className="patient-document-list">
                  {pendingDoctorDocs.map((doc) => (
                    <div className="patient-document-item" key={doc.id}>
                      <div className="patient-document-info">
                        <div className="document-icon"><i className="bi bi-file-earmark-medical"></i></div>
                        <div>
                          <h4>{doc.title}</h4>
                          <p>{doc.document_type} • {doc.category}</p>
                          <small>Added: {doc.uploaded_at}</small>
                        </div>
                      </div>
                      <div className="patient-document-actions">
                        <button type="button" className="icon-btn profile-btn" title="View Document" onClick={() => window.open(doc.file_url, "_blank")}><i className="bi bi-eye"></i></button>
                        <button type="button" className="icon-btn delete-btn" title="Remove Document" onClick={() => removePendingDoctorDocument(doc.id)}><i className="bi bi-trash"></i></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <button type="submit" className="patient-save-btn">
            {editingDoctorId ? "Update Doctor" : "Save Doctor"}
          </button>
        </form>
      )}

      <div className="card">
        <input
          placeholder="Search doctor by ID, name, phone, email or specialization..."
          value={doctorSearch}
          onChange={(e) => setDoctorSearch(e.target.value)}
          style={{ maxWidth: 520, marginBottom: 16 }}
        />

        <DataTable
          rows={doctorRows}
          showProfile={true}
          onProfile={(row) => {
            const latestDoctor = doctors.find((d) => d.id === row.id || d.doctor_id === row.doctor_id) || row;
            if (openDoctorProfile) {
              openDoctorProfile(latestDoctor);
            } else {
              setSelectedDoctor(latestDoctor);
              setTab("doctorProfile");
            }
          }}
          onEdit={permissions.doctorEdit ? (row) => {
            const latestDoctor = doctors.find((d) => d.id === row.id || d.doctor_id === row.doctor_id) || row;
            editDoctor(latestDoctor);
          } : null}
          onDelete={permissions.doctorDelete ? (row) => {
            const latestDoctor = doctors.find((d) => d.id === row.id || d.doctor_id === row.doctor_id) || row;
            deleteDoctor(latestDoctor);
          } : null}
        />
        <div className="paginationRow">
          <button disabled={doctorPage === 1} onClick={() => setDoctorPage(doctorPage - 1)}>Previous</button>
          <span>Page {doctorPage} of {doctorTotalPages || 1}</span>
          <button disabled={doctorPage >= doctorTotalPages} onClick={() => setDoctorPage(doctorPage + 1)}>Next</button>
        </div>
      </div>
    </section>
  );
}
