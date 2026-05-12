import React from "react";

export default function AppHeader({ title, user, appointmentCount, lowStockCount, pendingBillCount, onRefresh }) {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 20,
      }}
    >
      <div>
        <h1>{title}</h1>

        <p style={{ color: "#666", marginTop: 2 }}>
          Welcome back, {user.full_name}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: "10px 16px",
            borderRadius: 14,
            display: "flex",
            gap: 16,
            alignItems: "center",
            border: "1px solid #eee",
          }}
        >
          <span>📅 {appointmentCount} Appointments</span>

          <span>💊 {lowStockCount} Low Stock</span>

          <span>💰 {pendingBillCount} Pending Bills</span>
        </div>

        <button onClick={onRefresh}>Refresh</button>
      </div>
    </header>
  );
}
