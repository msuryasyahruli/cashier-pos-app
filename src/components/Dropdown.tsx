import { useState, useRef, useEffect } from "react";
import { Button } from "./Button";

type DropdownItem = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
};

type DropdownButtonProps = {
  label: string;
  items: DropdownItem[];
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  align?: "left" | "right";
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
};

export default function Dropdown({
  label,
  items,
  variant = "primary",
  align = "left",
  disabled = false,
  size = "md",
}: DropdownButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // const variantClass: Record<string, string> = {
  //   primary: "bg-blue-600 text-white hover:bg-blue-700 border border-blue-700",
  //   secondary:
  //     "bg-white text-gray-800 hover:bg-gray-100 border border-gray-300",
  //   ghost:
  //     "bg-transparent text-gray-700 hover:bg-gray-100 border border-transparent",
  // };

  return (
    <div className="relative inline-block" ref={ref}>
      {/* Trigger button */}
      <Button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
        variant={variant}
        size={size}
      >
        {label}
        {/* Chevron icon */}
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </Button>

      {/* Dropdown menu */}
      {open && (
        <div
          role="menu"
          className={[
            "absolute z-50 mt-1 min-w-32 rounded-lg bg-white shadow-lg border border-gray-200 py-1 animate-fade-in",
            align === "right" ? "right-0" : "left-0",
          ].join(" ")}
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              role="menuitem"
              type="button"
              disabled={item.disabled}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className={[
                "w-full text-left px-4 py-2 text-sm transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed",
                item.danger
                  ? "text-red-600 hover:bg-red-50"
                  : "text-gray-700 hover:bg-gray-100",
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.12s ease-out both;
        }
      `}</style>
    </div>
  );
}
