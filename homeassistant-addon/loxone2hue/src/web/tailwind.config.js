/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hue: {
          orange: '#FF9500',
          blue: '#007AFF',
        }
      }
    },
  },
  plugins: [],
}
