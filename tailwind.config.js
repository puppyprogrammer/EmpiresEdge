export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    "w-8", "h-8",
    "bg-green-500", "bg-green-700", "bg-gray-500",
    "text-3xl", "font-bold", "text-yellow-400", "text-lg",
    "text-red-400", "bg-red-950", "p-4", "rounded-xl", "border",
    "border-red-600", "max-w-lg", "text-green-300", "text-sm",
    "border-gray-700"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
