/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './frontend/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'accent-blue': '#0A84FF',
        'surface': '#FFFFFF',
        'background': '#F6F7F8',
        'text-primary': '#1C1C1E',
        'text-secondary': '#8E8E93',
      },
      boxShadow: {
        'card': '0 6px 20px rgba(0, 0, 0, 0.06)',
      },
      borderRadius: {
        '2xl': '12px',
      },
    },
  },
  plugins: [],
}
