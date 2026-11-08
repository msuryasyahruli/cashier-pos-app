import React from "react";
import notebillHorizontal from "../assets/logo-icons/notebill-1-icon-text-horizontal.svg";
import notebillHorizontalDark from "../assets/logo-icons/notebill-1-icon-text-horizontal-dark.svg";
import notebillHorizontalWhite from "../assets/logo-icons/notebill-4-icon-text-horizontal-white.svg";
import notebillStacked from "../assets/logo-icons/notebill-2-icon-text-stacked.svg";
import notebillStackedDark from "../assets/logo-icons/notebill-2-icon-text-stacked-dark.svg";
import notebillStackedWhite from "../assets/logo-icons/notebill-5-icon-text-stacked-white.svg";
import notebillIconGradient from "../assets/logo-icons/notebill-3-icon-only-gradient.svg";
import notebillIconWhite from "../assets/logo-icons/notebill-6-icon-only-white.svg";

export interface LogoProps {
  /** Size variant or icon/logo height preset */
  size?: "sm" | "md" | "lg" | "xl";
  /** Optional custom height in pixels or CSS value (e.g. 36 or "2.25rem") */
  height?: number | string;
  /** Whether to show "notebill" wordmark alongside the emblem */
  showWordmark?: boolean;
  /** Layout direction when wordmark is enabled: "horizontal" or "vertical" */
  orientation?: "horizontal" | "vertical";
  /** Color theme:
   * - "gradient" (default brand gradient, automatically adapts to light/dark container)
   * - "white" (brand gradient with white text for dark containers like the sidebar)
   * - "dark" (brand gradient with dark text for light containers)
   * - "monochrome" (pure monochrome white logo)
   */
  theme?: "gradient" | "white" | "dark" | "monochrome";
  className?: string;
  alt?: string;
}

export interface LogoEmblemProps {
  size?: number | string | "sm" | "md" | "lg" | "xl";
  theme?: "gradient" | "white" | "dark" | "monochrome";
  className?: string;
  alt?: string;
}

export const LogoEmblem: React.FC<LogoEmblemProps> = ({
  size = 36,
  theme = "gradient",
  className = "",
  alt = "Notebill Emblem",
}) => {
  const sizeMap: Record<"sm" | "md" | "lg" | "xl", number> = {
    sm: 28,
    md: 36,
    lg: 48,
    xl: 60,
  };

  const resolvedHeight =
    typeof size === "string" && size in sizeMap
      ? `${sizeMap[size as keyof typeof sizeMap]}px`
      : typeof size === "number"
      ? `${size}px`
      : size;

  const isMonochrome = theme === "white" || theme === "monochrome";
  const iconSrc = isMonochrome ? notebillIconWhite : notebillIconGradient;

  return (
    <img
      src={iconSrc}
      alt={alt}
      style={{ height: resolvedHeight, width: "auto" }}
      className={`shrink-0 select-none object-contain ${className}`}
      draggable={false}
    />
  );
};

export const Logo: React.FC<LogoProps> = ({
  size = "md",
  height,
  showWordmark = true,
  orientation = "horizontal",
  theme = "gradient",
  className = "",
  alt = "Notebill POS",
}) => {
  if (!showWordmark) {
    return (
      <LogoEmblem
        size={height ?? size}
        theme={theme}
        className={className}
        alt={alt}
      />
    );
  }

  const horizontalSizeMap = {
    sm: 28,
    md: 36,
    lg: 44,
    xl: 56,
  };

  const verticalSizeMap = {
    sm: 64,
    md: 88,
    lg: 112,
    xl: 144,
  };

  const resolvedHeight =
    height !== undefined
      ? typeof height === "number"
        ? `${height}px`
        : height
      : orientation === "vertical"
      ? `${verticalSizeMap[size]}px`
      : `${horizontalSizeMap[size]}px`;

  // Monochrome pure white variant
  if (theme === "monochrome") {
    const src =
      orientation === "vertical" ? notebillStackedWhite : notebillHorizontalWhite;
    return (
      <img
        src={src}
        alt={alt}
        style={{ height: resolvedHeight, width: "auto" }}
        className={`shrink-0 select-none object-contain ${className}`}
        draggable={false}
      />
    );
  }

  // White text variant (specifically for dark containers like Sidebar)
  if (theme === "white") {
    const src =
      orientation === "vertical" ? notebillStacked : notebillHorizontal;
    return (
      <img
        src={src}
        alt={alt}
        style={{ height: resolvedHeight, width: "auto" }}
        className={`shrink-0 select-none object-contain ${className}`}
        draggable={false}
      />
    );
  }

  // Dark text variant (specifically for light containers like LoginPage card)
  if (theme === "dark") {
    const src =
      orientation === "vertical" ? notebillStackedDark : notebillHorizontalDark;
    return (
      <img
        src={src}
        alt={alt}
        style={{ height: resolvedHeight, width: "auto" }}
        className={`shrink-0 select-none object-contain ${className}`}
        draggable={false}
      />
    );
  }

  // Default "gradient": adapts to light/dark theme automatically
  const lightSrc =
    orientation === "vertical" ? notebillStackedDark : notebillHorizontalDark;
  const darkSrc =
    orientation === "vertical" ? notebillStacked : notebillHorizontal;

  return (
    <div className={`inline-flex shrink-0 items-center justify-center ${className}`}>
      {/* Light mode: dark wordmark for light surfaces */}
      <img
        src={lightSrc}
        alt={alt}
        style={{ height: resolvedHeight, width: "auto" }}
        className="dark:hidden shrink-0 select-none object-contain"
        draggable={false}
      />
      {/* Dark mode: white wordmark for dark surfaces */}
      <img
        src={darkSrc}
        alt={alt}
        style={{ height: resolvedHeight, width: "auto" }}
        className="hidden dark:block shrink-0 select-none object-contain"
        draggable={false}
      />
    </div>
  );
};

export default Logo;
