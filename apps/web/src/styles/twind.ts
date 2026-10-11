// Twind: motor de utilidades tipo Tailwind sin paso de build aparte (resuelve D-F1, antes "solo CSS
// base"). Observa el DOM e inyecta solo el CSS de las clases que aparecen, sin tocar el build de Vite.
// Los tokens de color y tipografía salen literalmente de "SG-01 · Guía de estilos" en Figma: no se
// inventan. Si un valor cambia allá, cambia aquí.
import { twind, cssom, observe } from '@twind/core'
import presetAutoprefix from '@twind/preset-autoprefix'
import presetTailwind from '@twind/preset-tailwind'

const tw = twind(
  {
    presets: [presetAutoprefix(), presetTailwind()],
    theme: {
      extend: {
        colors: {
          // Marca e interacción
          primario: '#1e4680',
          enlace: '#2b5aa3',
          // Texto y superficie
          tinta: '#333333',
          'tinta-suave': '#6e6e6e',
          superficie: '#ffffff',
          fondo: '#f5f5f5',
          borde: '#d9d9d9',
          // Estados (siempre con texto o icono, nunca solo color)
          exito: '#2e7c56',
          'exito-fondo': '#e8f6f1',
          alerta: '#8d651e',
          'alerta-fondo': '#fdf1e4',
          error: '#994d4d',
          'error-fondo': '#fdecec',
          info: '#2b5aa3',
          'info-fondo': '#e8eff9',
        },
        fontFamily: {
          sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        },
        // Escala tipográfica de "SG-01 · Guía de estilos": 6 pasos documentados en Figma, aquí
        // reducidos a 5 clases (cuerpo y cuerpo-destacado comparten tamaño/interlineado, el peso
        // -regular vs. semibold- sigue siendo una clase font-* aparte). Forma [tamaño, interlineado]
        // únicamente: la forma extendida con fontWeight no está confirmada como soportada por
        // @twind/preset-tailwind, así que el peso se mantiene como utilidad separada en cada uso.
        fontSize: {
          titulo: ['22px', '28px'],
          subtitulo: ['16px', '22px'],
          cuerpo: ['13px', '18px'],
          etiqueta: ['12px', '16px'],
          nota: ['11px', '14px'],
        },
      },
    },
  },
  cssom(),
)

observe(tw)

export { tw }
