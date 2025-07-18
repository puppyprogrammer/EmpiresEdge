/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'w-8',
    'h-8',
    'bg-green-500',
    'bg-green-700',
    'bg-gray-600',
    'bg-gray-800',
    'bg-blue-500',
    'bg-yellow-600',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
