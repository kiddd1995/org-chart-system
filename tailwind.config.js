/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        apple: {
          bg: "#f5f5f7",
          text: "#1d1d1f",
          muted: "#6e6e73",
          blue: "#0071e3",
          line: "#d2d2d7"
        }
      },
      boxShadow: {
        soft: "0 18px 55px rgba(29, 29, 31, 0.08)",
        lift: "0 28px 70px rgba(29, 29, 31, 0.14)"
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Segoe UI",
          "Noto Sans TC",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
};
