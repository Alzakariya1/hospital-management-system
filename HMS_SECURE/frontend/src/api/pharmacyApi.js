import api from "./client";

export const pharmacyApi = {
  list: () => api.get("/pharmacy/medicines"),
  create: (payload) => api.post("/pharmacy/medicines", payload),
};
