// Cliente único de Supabase (un solo objeto para toda la app).
// Las llaves vienen de .env.local (VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY);
// la llave publicable puede ir en el navegador: lo que protege los datos son las
// reglas de seguridad por fila de supabase/migrations/.
// Sin llaves, o durante las pruebas, vale null y la app funciona sin cuentas.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const llave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const enPruebas = import.meta.env.MODE === 'test'

export const supabase = url && llave && !enPruebas ? createClient(url, llave) : null
