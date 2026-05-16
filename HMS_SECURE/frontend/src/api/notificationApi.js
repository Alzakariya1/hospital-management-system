import api from "./client";

export const notificationApi = {
  list: (params = {}) => api.get("/notifications", { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/read-all"),
  create: (payload) => api.post("/notifications", payload),
};
