import type { Config } from "tailwindcss"

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:"#f0f8f4",100:"#d9f0e5",200:"#b3e1cb",300:"#86cfae",400:"#56b78e",
          500:"#3c9e77",600:"#2f7e5f",700:"#26664f",800:"#1f5241",900:"#1a4436"
        }
      },
      boxShadow: { soft: "0 8px 24px rgba(0,0,0,0.08)" }
    }
  },
  plugins: []
} satisfies Config
