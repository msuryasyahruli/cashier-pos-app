import React from "react";
import { useDateTime } from "../configs/hooks/useDateTime";
import { Clock, Calendar, Bell, Search, Wifi, Menu } from "lucide-react";
import { Badge } from "./Badge";
import { useStoreSettings } from "../configs/hooks";

export interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { time, date } = useDateTime();
  const { store } = useStoreSettings();

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 md:px-6 flex items-center justify-between shrink-0 shadow-sm z-30">
      {/* Left: Quick search / branch title & mobile toggle */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Menu Toggle Button: visible below md breakpoint */}
        <button
          type="button"
          onClick={onToggleSidebar}
          title="Toggle Navigation Menu"
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors md:hidden focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <Menu size={22} />
        </button>

        <div className="flex items-center gap-2">
          <Badge variant="success" size="sm" className="font-semibold gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Online
          </Badge>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            {store?.name}
          </span>
        </div>
      </div>

      {/* Center: Search input */}
      <div className="hidden md:flex items-center w-64 lg:w-96 relative">
        <Search size={16} className="absolute left-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Quick search products, SKUs, or orders..."
          className="w-full bg-slate-100/80 hover:bg-slate-100 border border-slate-200/60 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 transition-all outline-none"
        />
      </div>

      {/* Right: Live time & network status */}
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="hidden lg:flex items-center gap-4 text-xs text-slate-600 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200/60">
          <div className="flex items-center gap-1.5 font-medium">
            <Calendar size={14} className="text-slate-400" />
            <span>{date}</span>
          </div>
          <div className="w-px h-3.5 bg-slate-200" />
          <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-800">
            <Clock size={14} className="text-indigo-500" />
            <span>{time}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            title="System Notifications"
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors relative"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full"></span>
          </button>
          <div
            title="Connected to cloud database"
            className="p-2 text-emerald-600 bg-emerald-50 rounded-xl border border-emerald-200/60"
          >
            <Wifi size={16} />
          </div>
        </div>
      </div>
    </header>
  );
};
