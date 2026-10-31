import React from "react";

export interface LogoProps {
  /** Size variant or icon height */
  size?: "sm" | "md" | "lg" | "xl";
  /** Whether to show "note bill" wordmark alongside the emblem */
  showWordmark?: boolean;
  /** Layout direction when wordmark is enabled: "horizontal" or "vertical" */
  orientation?: "horizontal" | "vertical";
  /** Color theme: "gradient" (default brand), "white" (monochrome light), or "dark" */
  theme?: "gradient" | "white" | "dark";
  className?: string;
}

export const LogoEmblem: React.FC<{
  size?: number | string;
  theme?: "gradient" | "white" | "dark";
  className?: string;
}> = ({ size = 36, theme = "gradient", className = "" }) => {
  const gradientId = React.useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="45%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>

      {/* Bill receipt body with folded corner and serrated bottom edge */}
      <path
        d="M 22 14 
           L 62 14 
           L 78 30 
           L 78 82 
           L 72 77 
           L 66 82 
           L 60 77 
           L 54 82 
           L 48 77 
           L 42 82 
           L 36 77 
           L 30 82 
           L 24 77 
           L 22 79 
           Z"
        fill={
          theme === "white"
            ? "#ffffff"
            : theme === "dark"
            ? "#0f172a"
            : `url(#${gradientId})`
        }
      />

      {/* Top right corner fold shading */}
      <path
        d="M 62 14 L 62 30 L 78 30 Z"
        fill={theme === "white" ? "#cbd5e1" : theme === "dark" ? "#334155" : "#0369a1"}
        opacity={theme === "white" || theme === "dark" ? 0.4 : 0.45}
      />

      {/* Horizontal text bars on the bill */}
      <rect
        x="32"
        y="25"
        width="22"
        height="4.5"
        rx="2.25"
        fill={theme === "white" ? "#0f172a" : "#ffffff"}
      />
      <rect
        x="32"
        y="35"
        width="34"
        height="4.5"
        rx="2.25"
        fill={theme === "white" ? "#0f172a" : "#ffffff"}
      />
      <rect
        x="32"
        y="45"
        width="28"
        height="4.5"
        rx="2.25"
        fill={theme === "white" ? "#0f172a" : "#ffffff"}
      />

      {/* Checkmark verification stroke */}
      <path
        d="M 45 64 L 54 73 L 75 48"
        stroke={theme === "white" ? "#0f172a" : "#ffffff"}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dollar currency glyph inside the checkmark notch */}
      <text
        x="63.5"
        y="56"
        fill={theme === "white" ? "#0f172a" : "#ffffff"}
        fontSize="11.5"
        fontWeight="800"
        fontFamily="system-ui, -apple-system, sans-serif"
        textAnchor="middle"
      >
        $
      </text>
    </svg>
  );
};

export const Logo: React.FC<LogoProps> = ({
  size = "md",
  showWordmark = true,
  orientation = "horizontal",
  theme = "gradient",
  className = "",
}) => {
  const sizeMap = {
    sm: { icon: 28, text: "text-base", sub: "text-[10px]" },
    md: { icon: 38, text: "text-xl", sub: "text-xs" },
    lg: { icon: 48, text: "text-2xl", sub: "text-xs" },
    xl: { icon: 60, text: "text-3xl", sub: "text-sm" },
  };

  const currentSize = sizeMap[size];

  const noteTextColor =
    theme === "white" ? "text-white" : "text-slate-900";
  const billTextColor =
    theme === "white" ? "text-emerald-400" : "text-emerald-500";

  if (!showWordmark) {
    return (
      <LogoEmblem
        size={currentSize.icon}
        theme={theme}
        className={className}
      />
    );
  }

  if (orientation === "vertical") {
    return (
      <div
        className={`flex flex-col items-center text-center gap-2 ${className}`}
      >
        <LogoEmblem size={currentSize.icon} theme={theme} />
        <div className="flex items-center gap-1.5 font-bold tracking-tight">
          <span className={`${currentSize.text} ${noteTextColor}`}>note</span>
          <span className={`${currentSize.text} ${billTextColor}`}>bill</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoEmblem size={currentSize.icon} theme={theme} />
      <div className="flex items-baseline gap-1.5 leading-none">
        <span className={`font-extrabold tracking-tight ${currentSize.text} ${noteTextColor}`}>
          note
        </span>
        <span className={`font-extrabold tracking-tight ${currentSize.text} ${billTextColor}`}>
          bill
        </span>
      </div>
    </div>
  );
};

export default Logo;

