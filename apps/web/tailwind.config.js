/** @type {import("tailwindcss").Config} */
const config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#101317",
        foreground: "#e6eaef",
        primary: {
          DEFAULT: "#c5d0db",
          foreground: "#101317"
        },
        secondary: {
          DEFAULT: "#232a33",
          foreground: "#e6eaef"
        },
        muted: {
          DEFAULT: "#1c2129",
          foreground: "rgba(230, 234, 239, 0.72)"
        },
        accent: {
          DEFAULT: "#2a313b",
          foreground: "#e6eaef"
        },
        destructive: {
          DEFAULT: "#ff6d8a",
          foreground: "#ffffff"
        },
        border: "rgba(255,255,255,0.14)",
        input: "rgba(255,255,255,0.18)",
        ring: "#c5d0db",
        "spektr-cyan-50": "#9ad6c5"
      }
    }
  },
  plugins: []
};

module.exports = config;
