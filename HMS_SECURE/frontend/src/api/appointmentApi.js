import api from "./client";

export const appointmentApi = {
  list: () => api.get("/appointments"),
  create: (payload) => api.post("/appointments", payload),
  update: (id, payload) => api.put(`/appointments/${id}`, payload),
  delete: (id) => api.delete(`/appointments/${id}`),
};
