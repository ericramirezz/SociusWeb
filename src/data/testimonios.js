// Testimonios que se muestran en Inicio (sección #testimonios).
//
// Cómo agregar multimedia:
//   foto  → coloca la imagen en  public/testimonios/  y escribe la ruta desde la raíz:
//           foto: '/testimonios/ricardo.jpg'
//           (también acepta una URL completa: 'https://…/foto.jpg').
//           Si es null se muestran las iniciales del autor.
//   video → dos opciones:
//           1) Archivo propio: public/testimonios/ricardo.mp4  →  video: '/testimonios/ricardo.mp4'
//           2) YouTube / Vimeo: pega el enlace normal  →  video: 'https://youtu.be/XXXXXXXXXXX'
//           Si es null la tarjeta no muestra el botón "Ver video".
//   poster → (opcional) imagen de portada para el video; si falta se usa la foto.
//   traduccion.en → texto y cargo en inglés (se muestran al cambiar el idioma).
//
// Recomendaciones: fotos cuadradas de ~400×400 px en .jpg/.webp (< 200 KB);
// videos .mp4 (H.264) de menos de ~20 MB; si pesan más, súbelos a YouTube como "no listado".
export const testimonios = [
  {
    texto: 'Socius transformó completamente nuestra operación comercial. En menos de 3 meses ya teníamos un pipeline lleno de prospectos calificados.',
    autor: 'Ricardo Montoya',
    cargo: 'Director Comercial, Inmobiliaria RM',
    rating: 5,
    foto: null,
    video: null,
    poster: null,
    traduccion: {
      en: {
        texto: 'Socius completely transformed our sales operation. In less than 3 months we had a pipeline full of qualified leads.',
        cargo: 'Sales Director, Inmobiliaria RM',
      },
    },
  },
  {
    texto: 'El equipo de Socius no solo instaló la infraestructura — nos acompañó en todo el proceso. Los resultados hablan por sí solos.',
    autor: 'Valentina Cruz',
    cargo: 'CEO, Desarrolladora VC',
    rating: 5,
    foto: null,
    video: null,
    poster: null,
    traduccion: {
      en: {
        texto: "The Socius team didn't just install the infrastructure — they supported us through the entire process. The results speak for themselves.",
        cargo: 'CEO, Desarrolladora VC',
      },
    },
  },
  {
    texto: 'Probamos varios métodos antes de Socius. Nada se compara. En 4 meses logramos cerrar lo que en años anteriores tardaba más de un año.',
    autor: 'Alejandro Herrera',
    cargo: 'Socio, Grupo Herrera Bienes Raíces',
    rating: 5,
    foto: null,
    video: null,
    poster: null,
    traduccion: {
      en: {
        texto: 'We tried several approaches before Socius. Nothing compares. In 4 months we closed what used to take us more than a year.',
        cargo: 'Partner, Grupo Herrera Bienes Raíces',
      },
    },
  },
]
