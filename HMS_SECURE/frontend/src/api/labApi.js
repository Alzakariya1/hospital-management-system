import api from "./client";

export const labApi = {
  list: () => api.get("/lab/tests"),
  create: (payload) => api.post("/lab/tests", payload),
};
