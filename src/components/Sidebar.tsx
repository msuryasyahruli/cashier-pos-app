import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  Receipt,
  Package,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Logo } from "./Logo";

export interface SidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { user, profile, signOut } = useAuth();
  const userName =
    profile?.name ||
    profile?.username ||
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Cashier User";
  const userRole = profile?.role || "Active Session";
  const userInitials = userName.slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await signOut();
  };

  const navItems = [
    { to: "/", label: "Cashier POS", icon: <LayoutGrid size={20} /> },
    { to: "/transactions", label: "Transactions", icon: <Receipt size={20} /> },
    { to: "/inventory", label: "Inventory", icon: <Package size={20} /> },
    { to: "/settings", label: "Settings", icon: <Settings size={20} /> },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 transition-all duration-300 ease-in-out
          /* Mobile Drawer Positioning (< md) */
          fixed inset-y-0 left-0 z-50 w-64 transform ${
            isOpenMobile ? "translate-x-0" : "-translate-x-full"
          }
          /* Desktop/Tablet Positioning (>= md) */
          md:static md:translate-x-0 md:w-20 xl:w-64
        `}
      >
        {/* Brand logo header */}
        <div className="h-16 flex items-center justify-between px-4 xl:px-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3 md:justify-center xl:justify-start w-full">
            {/* Collapsed emblem on medium screens */}
            <div className="hidden md:block xl:hidden">
              <Logo size="md" showWordmark={false} />
            </div>

            {/* Full Logo on mobile & expanded desktop */}
            <div className="block md:hidden xl:block">
              <Logo size="md" showWordmark={true} theme="white" />
            </div>
          </div>

          {/* Close button for mobile drawer */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg md:hidden transition-colors"
            title="Close Menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation menu */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          <div className="hidden xl:block px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Main Menu
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
              }}
              title={item.label}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 md:justify-center xl:justify-start ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/70"
                }`
              }
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="inline xl:inline md:hidden truncate">
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Cashier user session card */}
        <div className="p-3 xl:p-4 border-t border-slate-800">
          <div className="bg-slate-800/60 rounded-xl p-2.5 xl:p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 md:justify-center xl:justify-start w-full">
              <div
                title={`${userName} (Active Session)`}
                className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 font-semibold flex items-center justify-center text-xs border border-indigo-500/30 shrink-0"
              >
                {userInitials}
              </div>
              <div className="md:hidden xl:block min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {userName}
                </p>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1 capitalize">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {userRole}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout / End Shift"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors md:hidden xl:block"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
