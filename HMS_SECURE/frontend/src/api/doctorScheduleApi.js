import api from "./client";

export const doctorScheduleApi = {
  list: (params = {}) => api.get("/doctor-schedules", { params }),
  save: (payload) => api.post("/doctor-schedules", payload),
  delete: (id) => api.delete(`/doctor-schedules/${id}`),
  slots: (doctorId, date) => api.get(`/doctors/${doctorId}/slots`, { params: { date } }),
};
