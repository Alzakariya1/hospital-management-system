import api from "./client";

export const doctorApi = {
  list: () => api.get("/doctors"),
  create: (payload) => api.post("/doctors", payload),
  update: (id, payload) => api.put(`/doctors/${id}`, payload),
  delete: (id) => api.delete(`/doctors/${id}`),
};
