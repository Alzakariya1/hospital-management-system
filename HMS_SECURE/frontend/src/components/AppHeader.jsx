import React, { useEffect, useRef, useState } from "react";
import { Bell, RefreshCcw, Search } from "lucide-react";

export default function AppHeader({ title, user, appointmentCount, lowStockCount, pendingBillCount, onRefresh, onGlobalSearch }) {
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);

  useEffect(() => {
    function handleShortcut(event) {
      if (event.altKey && String(event.key).toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  function submitSearch(event) {
    event.preventDefault();
    const cleanQuery = query.trim();
    if (cleanQuery && typeof onGlobalSearch === "function") {
      onGlobalSearch(cleanQuery);
    }
  }

  return (
    <header className="appHeader">
      <div className="topBar">
        <form className="topBarSearch" aria-label="Global search" onSubmit={submitSearch}>
          <Search size={17} />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search patients, doctors or actions..."
            aria-label="Search patients, doctors or actions"
          />
          <kbd>Alt + K</kbd>
        </form>
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
