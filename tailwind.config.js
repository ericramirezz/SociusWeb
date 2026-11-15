/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Identidad Socius: blanco y azules. Cambiar aquí cambia toda la app.
      colors: {
        brand: {
          DEFAULT: '#1D4ED8', // azul principal: botones, enlaces, acentos
          dark: '#1E3A8A', // hover de botones
          light: '#3B82F6',
          soft: '#EFF6FF', // fondos suaves
        },
        navy: '#0B1F3A', // texto principal y pie de página
      },
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      animation: { 'fade-in': 'fadeIn 0.6s ease-out', 'slide-up': 'slideUp 0.6s ease-out' },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(30px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
