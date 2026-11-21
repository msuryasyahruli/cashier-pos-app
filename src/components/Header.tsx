import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDateTime } from "../hooks/useDateTime";
import { Clock, Calendar, Search, Wifi, WifiOff, Menu } from "lucide-react";
import { StoreSelector } from "./store/StoreSelector";
import { ThemeToggle } from "./ThemeToggle";

export interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const { time, date } = useDateTime();
  const [quickSearch, setQuickSearch] = useState("");
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickSearch.trim();
    navigate(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : "/");
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-700 px-4 md:px-6 flex items-center justify-between shrink-0 shadow-sm z-30">
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
          {/* Interactive store switcher & current store badge */}
          <StoreSelector />
        </div>
      </div>

      {/* Center: Search input */}
      <form
        onSubmit={handleQuickSearchSubmit}
        className="hidden md:flex items-center w-64 lg:w-96 relative"
      >
        <Search size={16} className="absolute left-3.5 text-slate-400" />
        <input
          type="text"
          value={quickSearch}
          onChange={(e) => setQuickSearch(e.target.value)}
          placeholder="Quick search products or SKUs..."
          className="w-full bg-slate-100/80 hover:bg-slate-100 border border-slate-200/60 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 transition-all outline-none"
        />
      </form>

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
          <ThemeToggle />
          <div
            title={
              isOnline ? "Online — connected to network" : "Offline — no network"
            }
            className={`p-2 rounded-xl border ${
              isOnline
                ? "text-emerald-600 bg-emerald-50 border-emerald-200/60"
                : "text-rose-600 bg-rose-50 border-rose-200/60"
            }`}
          >
            {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
          </div>
        </div>
      </div>
    </header>
  );
};
