import api from "./client";

export const radiologyApi = {
  list: () => api.get("/radiology/tests"),
  create: (payload) => api.post("/radiology/tests", payload),
};
