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
      className="relative flex h-8 w-14 items-center rounded-full bg-divider p-1 text-ink-secondary transition-colors hover:bg-divider/80 focus:outline-none focus:ring-2 focus:ring-brand-ring dark:bg-surface-hover dark:text-status-warningText"
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full bg-surface shadow-sm transition-transform ${
          isDark ? "translate-x-6" : "translate-x-0"
        }`}
      >
        {isDark ? <Moon size={16} /> : <Sun size={16} />}
      </span>
    </button>
  );
};
