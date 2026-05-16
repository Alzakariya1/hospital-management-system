import api from "./client";

export const radiologyApi = {
  list: () => api.get("/radiology/tests"),
  create: (payload) => api.post("/radiology/tests", payload),
  updateStatus: (id, status) => api.patch(`/radiology/tests/${id}/status`, { status }),
  uploadReport: (id, payload) => api.patch(`/radiology/upload-report/${id}`, payload),
};
