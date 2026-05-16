import React from "react";
import { AppHeader, Sidebar } from "../components";

export default function AppLayout({
  user,
  tabs,
  activeTab,
  onTabChange,
  onLogout,
  headerTitle,
  appointmentCount,
  lowStockCount,
  pendingBillCount,
  onRefresh,
  searchData,
  onSearchNavigate,
  children,
}) {
  return (
    <div className="app">
      <Sidebar
        user={user}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onLogout={onLogout}
      />
      <main>
        <div className="mainContent">
          <AppHeader
            title={headerTitle}
            user={user}
            appointmentCount={appointmentCount}
            lowStockCount={lowStockCount}
            pendingBillCount={pendingBillCount}
            onRefresh={onRefresh}
            searchData={searchData}
            onSearchNavigate={onSearchNavigate}
            onOpenProfile={() => onTabChange("profile")}
            onChangePassword={() => onTabChange("profile")}
            onLogout={onLogout}
          />
          {children}
        </div>
      </main>
    </div>
  );
}
