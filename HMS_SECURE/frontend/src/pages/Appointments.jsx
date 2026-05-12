import React from "react";
import { Form } from "../components";

export default function Appointments({
  appointment,
  setAppointment,
  addAppointment,
  appointmentSearch,
  setAppointmentSearch,
  appointmentStatusFilter,
  setAppointmentStatusFilter,
  filteredAppointments,
  paginatedAppointments,
  editAppointment,
  deleteAppointment,
  appointmentPage,
  setAppointmentPage,
  appointmentTotalPages,
}) {
  return (
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
            onChange={(e) => setAppointmentStatusFilter(e.target.value)}
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
                    <p className="muted" style={{ margin: "4px 0 0" }}>
                      Patient ID: {a.patient_id}
                    </p>
                  </div>

                  <div>
                    <b>{a.doctor_name || a.doctor_id}</b>
                    <p className="muted" style={{ margin: "4px 0 0" }}>
                      Doctor ID: {a.doctor_id}
                    </p>
                  </div>

                  <div>
                    <b>{a.appointment_date || "No date"}</b>
                    <p className="muted" style={{ margin: "4px 0 0" }}>
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

                    <button onClick={() => editAppointment(a)}>Edit</button>
                    <button onClick={() => deleteAppointment(a)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button
                disabled={appointmentPage === 1}
                onClick={() => setAppointmentPage(appointmentPage - 1)}
              >
                Previous
              </button>

              <span>Page {appointmentPage} of {appointmentTotalPages || 1}</span>

              <button
                disabled={appointmentPage >= appointmentTotalPages}
                onClick={() => setAppointmentPage(appointmentPage + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
