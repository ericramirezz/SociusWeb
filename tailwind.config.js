/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Identidad Socius (Brief para el prototipo web, v1.0). No se usan colores fuera de esta paleta;
      // los tonos intermedios salen de estos cuatro con opacidad (p. ej. text-negro/70).
      colors: {
        violeta: '#5348CF', // Violeta Estratégico: color primario
        cian: '#659FFB', // Cian Tecnológico: acento de IA
        lavanda: '#EFECFD', // Lavanda: superficie de apoyo
        negro: '#111021', // Negro Autoridad: texto
      },
      fontFamily: {
        sans: ['"Outfit Variable"', 'Outfit', 'sans-serif'], // Cuerpo
        display: ['"Space Grotesk Variable"', '"Space Grotesk"', 'sans-serif'], // Titulares, en mayúsculas
      },
      letterSpacing: {
        titular: '-0.02em',
        subtitular: '-0.01em',
      },
      backgroundImage: {
        // Degradado de marca: siempre violeta a cian, solo en fondos y formas, nunca en texto.
        degradado: 'linear-gradient(135deg, #5348CF 0%, #659FFB 100%)',
        'degradado-horizontal': 'linear-gradient(90deg, #5348CF 0%, #659FFB 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        aparece: 'aparece 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
        entra: 'entra 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(30px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        aparece: { '0%': { opacity: '0', transform: 'translateY(-4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        entra: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
