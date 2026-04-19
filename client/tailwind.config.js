/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" }
        },
        "nav-drift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" }
        }
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out forwards",
        shimmer: "shimmer 2.5s linear infinite",
        "nav-drift": "nav-drift 18s ease-in-out infinite"
      },
      colors: {
        navy: {
          DEFAULT: "#1a237e",
          dark: "#283593"
        },
        brand: {
          DEFAULT: "#dc2626",
          dark: "#b91c1c",
          soft: "#fef2f2"
        }
      }
    }
  },
  plugins: []
};

