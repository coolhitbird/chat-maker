/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wechat: {
          bg: '#f5f5f5',
          bubble_left: '#ffffff',
          bubble_right: '#95ec69',
          header: '#1e1e1e',
        },
        qq: {
          bg: '#ededed',
          bubble_left: '#ffffff',
          bubble_right: '#b2e866',
          header: '#2eafff',
        },
      },
    },
  },
  plugins: [],
}
