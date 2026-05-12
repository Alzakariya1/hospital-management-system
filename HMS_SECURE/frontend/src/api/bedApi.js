import api from "./client";

export const bedApi = {
  list: () => api.get("/beds"),
  create: (payload) => api.post("/beds", payload),
};
