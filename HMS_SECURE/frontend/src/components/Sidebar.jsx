import React from "react";
import { LogOut } from "lucide-react";

function getInitials(name = "User") {
  return String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

export default function Sidebar({ user, tabs, activeTab, onTabChange, onLogout }) {
  return (
    <aside className="sidebarShell">
      <div className="brandBlock">
        <div className="brandMark">H</div>
        <div>
          <h2>HMS</h2>
          <small>Hospital Suite</small>
        </div>
      </div>

      <div className="sidebarUser">
        <div className="sidebarAvatar">{getInitials(user?.full_name)}</div>
        <div>
          <b>{user?.full_name || "User"}</b>
          <small>{user?.role || ""}</small>
          {user?.hospital_name ? <small>{user?.hospital_name}</small> : null}
        </div>
      </div>

      <nav className="sideNav" aria-label="Main navigation">
        {tabs.map(([id, label, Icon]) => (
          <button
            type="button"
            className={activeTab === id ? "active" : ""}
            onClick={() => onTabChange(id)}
            key={id}
            title={label}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebarFooter">
        <button type="button" onClick={onLogout} className="logoutBtn">
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
