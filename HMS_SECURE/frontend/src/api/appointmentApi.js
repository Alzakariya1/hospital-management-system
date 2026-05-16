import api from "./client";

export const appointmentApi = {
  list: (params = {}) => api.get("/appointments", { params }),
  queue: (params = {}) => api.get("/appointments/queue", { params }),
  create: (payload) => api.post("/appointments", payload),
  update: (id, payload) => api.put(`/appointments/${id}`, payload),
  updateStatus: (id, status, extra = {}) => api.patch(`/appointments/${id}/status`, { status, ...extra }),
  delete: (id) => api.delete(`/appointments/${id}`),
  saveConsultation: (payload) => api.post("/opd/consultations", payload),
  consultations: (params = {}) => api.get("/opd/consultations", { params }),
};
