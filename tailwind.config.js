/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: "480px", // custom extra-small breakpoint for fine-grained mobile control
      },
      colors: {
        canvas: "rgb(var(--bg-canvas) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--bg-surface) / <alpha-value>)",
          hover: "rgb(var(--bg-surface-hover) / <alpha-value>)",
        },
        divider: "rgb(var(--border-default) / <alpha-value>)",
        ink: {
          primary: "rgb(var(--text-primary) / <alpha-value>)",
          secondary: "rgb(var(--text-secondary) / <alpha-value>)",
          onPrimary: "rgb(var(--text-on-primary) / <alpha-value>)",
        },
        brand: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          500: "#059669",
          600: "#059669",
          700: "#047857",
          DEFAULT: "rgb(var(--brand-primary) / <alpha-value>)",
          hover: "rgb(var(--brand-hover) / <alpha-value>)",
          tint: "rgb(var(--brand-tint) / <alpha-value>)",
          tintText: "rgb(var(--brand-tint-text) / <alpha-value>)",
          ring: "rgb(var(--brand-ring) / <alpha-value>)",
        },
        action: {
          danger: "rgb(var(--action-danger) / <alpha-value>)",
          dangerHover: "rgb(var(--action-danger-hover) / <alpha-value>)",
        },
        status: {
          successBg: "rgb(var(--status-success-bg) / <alpha-value>)",
          successText: "rgb(var(--status-success-text) / <alpha-value>)",
          warningBg: "rgb(var(--status-warning-bg) / <alpha-value>)",
          warningText: "rgb(var(--status-warning-text) / <alpha-value>)",
          dangerBg: "rgb(var(--status-danger-bg) / <alpha-value>)",
          dangerText: "rgb(var(--status-danger-text) / <alpha-value>)",
          infoBg: "rgb(var(--status-info-bg) / <alpha-value>)",
          infoText: "rgb(var(--status-info-text) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [
    // scrollbar-none utility
    function ({ addUtilities }) {
      addUtilities({
        ".scrollbar-none": {
          "-ms-overflow-style": "none",
          "scrollbar-width": "none",
          "&::-webkit-scrollbar": { display: "none" },
        },
      });
    },
  ],
};
