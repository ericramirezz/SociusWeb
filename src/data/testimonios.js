// Testimonios de la página /testimonios (tomados de sociusrealestate.com).
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
    texto: "Antes no sabíamos cómo filtrar ni dar seguimiento a los prospectos. Con Socius, automatizamos todo y logramos citas realmente calificadas. Hoy vendemos más y con total control del proceso comercial.",
    autor: "Andrea",
    cargo: "Directora, Terraviva",
    rating: 5,
    foto: null,
    video: null,
    poster: null,
    traduccion: {
      en: {
        texto: "We didn't know how to filter or follow up on leads. With Socius we automated everything and got truly qualified appointments. Today we sell more, with full control of the sales process.",
        cargo: "Director, Terraviva",
      },
    },
  },
  {
    texto: "Con Socius logramos resultados desde el primer mes. Ahora recibimos prospectos realmente interesados y agendamos citas sin esfuerzo. Es un cambio total en la forma de vender.",
    autor: "Mirian",
    cargo: "Directora, Vivenza",
    rating: 5,
    foto: null,
    video: null,
    poster: null,
    traduccion: {
      en: {
        texto: "With Socius we saw results from the very first month. Now we get genuinely interested leads and book appointments effortlessly. It completely changed the way we sell.",
        cargo: "Director, Vivenza",
      },
    },
  },
  {
    texto: "Socius nos dio el sistema que necesitábamos para escalar. Pasamos de improvisar a tener un proceso claro, automatizado y medible. Hoy nuestras citas llegan solas y con prospectos listos para comprar.",
    autor: "Global Inmuebles",
    cargo: "Equipo Comercial",
    rating: 5,
    foto: null,
    video: null,
    poster: null,
    traduccion: {
      en: {
        texto: "Socius gave us the system we needed to scale. We went from improvising to a clear, automated, measurable process. Today appointments come in on their own, with leads ready to buy.",
        cargo: "Sales Team",
      },
    },
  },
  {
    texto: "Socius nos ayudó a estructurar todo el proceso comercial de manera profesional. Automatizamos el seguimiento y logramos citas con prospectos realmente interesados. Hoy tenemos control total de nuestras ventas.",
    autor: "Dulce Melgoza",
    cargo: "Gerente Comercial, We Santa Fe",
    rating: 5,
    foto: null,
    video: null,
    poster: null,
    traduccion: {
      en: {
        texto: "Socius helped us structure our entire sales process professionally. We automated follow-up and got appointments with genuinely interested leads. Today we have full control of our sales.",
        cargo: "Sales Manager, We Santa Fe",
      },
    },
  },
  {
    texto: "Socius transformó por completo la manera en la que vendemos. Ahora todo está automatizado: el seguimiento, la calificación y las citas. Es una solución que realmente te da resultados.",
    autor: "Patricia Márquez",
    cargo: "Directora de Marketing, Sahai",
    rating: 5,
    foto: null,
    video: null,
    poster: null,
    traduccion: {
      en: {
        texto: "Socius completely transformed the way we sell. Everything is automated now: follow-up, qualification, and appointments. It's a solution that truly delivers results.",
        cargo: "Marketing Director, Sahai",
      },
    },
  },
  {
    texto: "Antes era complicado saber qué hacer con tantos prospectos. Con Socius, todo el proceso está ordenado y enfocado en cerrar. Hoy trabajamos menos, pero vendemos más y mejor.",
    autor: "Alfredo",
    cargo: "Director Comercial, Triángulo",
    rating: 5,
    foto: null,
    video: null,
    poster: null,
    traduccion: {
      en: {
        texto: "It used to be hard to know what to do with so many leads. With Socius the whole process is organized and focused on closing. Today we work less but sell more, and better.",
        cargo: "Sales Director, Triángulo",
      },
    },
  },
  {
    texto: "Gracias a Socius, pasamos de estar apagando fuegos a tener un sistema comercial que trabaja solo. Hoy generamos citas con clientes ideales todos los días. Es la mejor inversión que hemos hecho.",
    autor: "Esteban",
    cargo: "Director, Riga Bosques",
    rating: 5,
    foto: null,
    video: null,
    poster: null,
    traduccion: {
      en: {
        texto: "Thanks to Socius we went from putting out fires to having a sales system that runs on its own. We now book appointments with ideal clients every day. It's the best investment we've made.",
        cargo: "Director, Riga Bosques",
      },
    },
  },
  {
    texto: "Con Socius dejamos de depender de portales y empezamos a generar nuestros propios leads calificados. El sistema nos da seguimiento automático y estructura total. Hoy nuestro equipo vende con mucha más claridad.",
    autor: "Arely",
    cargo: "Coldwell Banker, Tijuana",
    rating: 5,
    foto: null,
    video: null,
    poster: null,
    traduccion: {
      en: {
        texto: "With Socius we stopped depending on listing portals and started generating our own qualified leads. The system gives us automatic follow-up and full structure. Our team now sells with much more clarity.",
        cargo: "Coldwell Banker, Tijuana",
      },
    },
  },
  {
    texto: "Implementar Socius fue un antes y un después. Pasamos de perseguir leads a tener una máquina que genera citas calificadas sola. Hoy vendemos con claridad, estructura y sin depender de portales.",
    autor: "Marcus",
    cargo: "CEO, Asia Puebla",
    rating: 5,
    foto: null,
    video: null,
    poster: null,
    traduccion: {
      en: {
        texto: "Implementing Socius was a turning point. We went from chasing leads to having a machine that generates qualified appointments by itself. Today we sell with clarity and structure, without depending on portals.",
        cargo: "CEO, Asia Puebla",
      },
    },
  },
  {
    texto: "Socius nos ayudó a profesionalizar todo el proceso comercial. Hoy nuestros leads ya vienen filtrados y listos para cerrar. Es una herramienta clave para cualquier desarrollador que quiera escalar.",
    autor: "Francisco",
    cargo: "Director, Urbano Town",
    rating: 5,
    foto: null,
    video: null,
    poster: null,
    traduccion: {
      en: {
        texto: "Socius helped us professionalize the entire sales process. Our leads now arrive filtered and ready to close. It's a key tool for any developer who wants to scale.",
        cargo: "Director, Urbano Town",
      },
    },
  },
]
