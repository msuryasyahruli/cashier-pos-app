import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      className="relative flex h-9 w-16 items-center rounded-full bg-slate-200 p-1 text-slate-600 transition-colors hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:text-amber-300 dark:hover:bg-slate-600"
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm transition-transform dark:bg-slate-900 ${
          isDark ? "translate-x-7" : "translate-x-0"
        }`}
      >
        {isDark ? <Moon size={15} /> : <Sun size={16} />}
      </span>
    </button>
  );
};
