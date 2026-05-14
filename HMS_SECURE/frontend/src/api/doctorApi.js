import api from "./client";

export const doctorApi = {
  list: () => api.get("/doctors"),
  get: (id) => api.get(`/doctors/${id}`),
  create: (payload) => api.post("/doctors", payload),
  update: (id, payload) => api.put(`/doctors/${id}`, payload),
  delete: (id) => api.delete(`/doctors/${id}`),
  uploadProfileImage: (id, formData) => api.post(`/doctors/${id}/profile-image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
  uploadDocument: (id, formData) => api.post(`/doctors/${id}/documents`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
  deleteDocument: (id, docIndex) => api.delete(`/doctors/${id}/documents/${docIndex}`),
};
