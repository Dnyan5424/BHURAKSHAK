export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        g1: "#1B4332",
        g2: "#2D6A4F",
        accent: "#74C69D",
        gov: "#1D3557",
        red: "#9B2226",
        amber: "#D97706",
        paper: "#F7F5F0",
        card: "#FFFFFF",
        line: "#D8D3C8",
        ink: "#1F2937",
        mute: "#647067",
      },
      borderRadius: {
        card: "8px",
        btn: "8px",
      },
      fontFamily: {
        head: ["Segoe UI", "Aptos", "Arial", "sans-serif"],
        sans: ["Segoe UI", "Aptos", "Arial", "sans-serif"],
        mono: ["Cascadia Code", "Consolas", "monospace"],
      },
    },
  },
};
