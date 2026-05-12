import React from "react";

export default function StatCard({ icon: Icon, title, value }) {
  return (
    <div className="stat">
      <Icon size={22} />
      <div>
        <p>{title}</p>
        <b>{value ?? 0}</b>
      </div>
    </div>
  );
}
