// Empaqueta src/core/webhooks/servidor.js (y todo lo que importa del núcleo)
// en un solo archivo dentro de supabase/functions/_shared/, que es lo único que
// Supabase publica junto con las Edge Functions.
// Uso: npm run build:funciones  (volver a correrlo cuando cambie src/core)
import { build } from 'esbuild'

await build({
  entryPoints: ['src/core/webhooks/servidor.js'],
  outfile: 'supabase/functions/_shared/webhooks.js',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  banner: { js: '// ARCHIVO GENERADO por `npm run build:funciones` desde src/core. No editar a mano.' },
  logLevel: 'info',
})
