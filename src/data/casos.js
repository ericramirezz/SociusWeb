// Casos con cifras y marcas del "Brief para el prototipo web" de Socius (v1.0, 1 oct 2026).
// Regla del brief: las cifras se citan tal como están; no se suman, no se redondean
// y no se derivan cifras nuevas.
// Pendiente del brief ("Por confirmar"): permiso de uso público de cada caso y cada marca.
export const casos = [
  {
    cliente: 'Grupo Jai / Sahai',
    lugar: 'San Miguel de Allende',
    antes: '13 ventas en todo el año',
    despues: '8 cierres en 3 meses',
    traduccion: { en: { antes: '13 sales in the whole year', despues: '8 closings in 3 months' } },
  },
  {
    cliente: 'GH Master Brokers',
    lugar: 'Mérida',
    antes: 'Respuesta de 1 a 3 horas; 8 % de prospecto a cita',
    despues: 'Respuesta en 47 segundos; 15 % de prospecto a cita',
    traduccion: {
      en: {
        antes: 'Response in 1 to 3 hours; 8 % lead-to-appointment',
        despues: 'Response in 47 seconds; 15 % lead-to-appointment',
      },
    },
  },
  {
    cliente: 'Coldwell Banker',
    lugar: 'Tijuana',
    antes: 'Más de 5,000 prospectos descartados',
    despues: '10 % de los descartados a cita; más de 8 MDP recuperados',
    traduccion: {
      en: {
        antes: 'More than 5,000 discarded leads',
        despues: '10 % of the discarded leads booked; more than 8M MXN recovered',
      },
    },
  },
  {
    cliente: 'Aliah Lomas Verdes',
    lugar: 'Estado de México',
    antes: '30 MDP al mes',
    despues: '44 MDP al mes en 3 meses',
    traduccion: { en: { lugar: 'State of Mexico', antes: '30M MXN per month', despues: '44M MXN per month in 3 months' } },
  },
  {
    cliente: 'Fractional',
    lugar: 'Jalisco',
    antes: 'Más de $90,000 MXN en marketing sin resultados',
    despues: 'Más de 20 MDP vendidos con $200,000 MXN en 6 meses',
    traduccion: {
      en: {
        antes: 'More than $90,000 MXN in marketing with no results',
        despues: 'More than 20M MXN sold with $200,000 MXN in 6 months',
      },
    },
  },
  {
    cliente: 'Torre Mítikah',
    lugar: 'CDMX',
    antes: '43 MDP al mes; 20 visitas al mes',
    despues: 'Promedio de 55 MDP al mes; mejor mes histórico de más de 100 MDP',
    traduccion: {
      en: {
        lugar: 'Mexico City',
        antes: '43M MXN per month; 20 visits per month',
        despues: 'Average of 55M MXN per month; best month ever, above 100M MXN',
      },
    },
  },
]

// "Marcas que ya confían" (prueba social oficial del brief).
export const marcas = ['JLL', 'Coldwell Banker', 'Engel & Völkers', 'Be Grand', 'FUNO', 'Mítikah']
