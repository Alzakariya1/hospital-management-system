import api from "./client";

export const labApi = {
  list: () => api.get("/lab/tests"),
  create: (payload) => api.post("/lab/tests", payload),
  updateStatus: (id, status) => api.patch(`/lab/tests/${id}/status`, { status, test_status: status }),
  uploadReport: (id, payload) => api.patch(`/lab/upload-report/${id}`, payload),
};
