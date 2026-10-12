import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";

export const RootLayout: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleToggleSidebar = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleCloseMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans">
      {/* Navigation Sidebar */}
      <Sidebar
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={handleCloseMobileSidebar}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onToggleSidebar={handleToggleSidebar} />
        <main className="flex-1 sm:flex overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
