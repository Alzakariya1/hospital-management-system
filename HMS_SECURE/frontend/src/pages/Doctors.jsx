import React from "react";
import { DataTable, Form } from "../components";

export default function Doctors({
  doctor,
  setDoctor,
  addDoctor,
  doctorSearch,
  setDoctorSearch,
  paginatedDoctors,
  editDoctor,
  deleteDoctor,
  doctorPage,
  setDoctorPage,
  doctorTotalPages,
  permissions = {},
}) {
  return (
    <section>
      {permissions.doctorCreate && (
        <Form
          title="Add Doctor"
          data={doctor}
          setData={setDoctor}
          submit={addDoctor}
        />
      )}
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

        <DataTable
          rows={paginatedDoctors}
          onEdit={permissions.doctorEdit ? editDoctor : null}
          onDelete={permissions.doctorDelete ? deleteDoctor : null}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            disabled={doctorPage === 1}
            onClick={() => setDoctorPage(doctorPage - 1)}
          >
            Previous
          </button>

          <span>Page {doctorPage} of {doctorTotalPages || 1}</span>

          <button
            disabled={doctorPage >= doctorTotalPages}
            onClick={() => setDoctorPage(doctorPage + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
