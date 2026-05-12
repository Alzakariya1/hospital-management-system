import React from "react";
import { LogOut } from "lucide-react";

export default function Sidebar({ user, tabs, activeTab, onTabChange, onLogout }) {
  return (
    <aside>
      <h2>HMS</h2>
      <p>
        {user?.full_name || "User"}
        <br />
        <small>{user?.role || ""}</small>
        {user?.hospital_name ? (
          <>
            <br />
            <small>{user?.hospital_name}</small>
          </>
        ) : null}
      </p>
      {tabs.map(([id, label, Icon]) => (
        <button
          className={activeTab === id ? "active" : ""}
          onClick={() => onTabChange(id)}
          key={id}
        >
          <Icon size={17} />
          {label}
        </button>
      ))}
      <button onClick={onLogout}>
        <LogOut size={17} />
        Logout
      </button>
    </aside>
  );
}
