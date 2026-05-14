import React from "react";
import { Bell, RefreshCcw, Search } from "lucide-react";

export default function AppHeader({ title, user, appointmentCount, lowStockCount, pendingBillCount, onRefresh }) {
  return (
    <header className="appHeader">
      <div className="topBar">
        <div className="topBarSearch" aria-label="Global search">
          <Search size={17} />
          <span>Search patients, doctors or actions...</span>
          <kbd>Alt + K</kbd>
        </div>
        <div className="topBarActions">
          <button type="button" className="iconBtn" aria-label="Notifications">
            <Bell size={18} />
          </button>
          <div className="userChip">
            <span>{(user?.full_name || "User").slice(0, 1).toUpperCase()}</span>
            <div>
              <b>{user?.full_name || "User"}</b>
              <small>{user?.hospital_name || "Hospital"}</small>
            </div>
          </div>
        </div>
      </div>

      <div className="pageHeader">
        <div>
          <h1>{title}</h1>
          <p>Welcome back, {user?.full_name || "User"}</p>
        </div>

        <div className="headerMetrics">
          <span>📅 {appointmentCount} Appointments</span>
          <span>💊 {lowStockCount} Low Stock</span>
          <span>💰 {pendingBillCount} Pending Bills</span>
          <button type="button" onClick={onRefresh} className="refreshBtn">
            <RefreshCcw size={15} />
            Refresh
          </button>
        </div>
      </div>
    </header>
  );
}
