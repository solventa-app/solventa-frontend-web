<!--
  Swagger embebido de la documentación de la API (W07-03, plan-hu-w07-front.md 5.4 #2). Usa `swagger-ui-dist` en versión
  fija, empaquetado y sin CDN, cargado en diferido para que no pese en el resto de la web. Lee la copia del contrato de
  socios que trae la web (src/contrato/socios-v1.yaml, hoy el borrador) e inyecta en cada «Try it out» el token del
  entorno de la pestaña con `requestInterceptor`: el de pruebas o el de producción, pedido con la clave de ese entorno
  y renovado si venció. Su CSS se ajusta a la web (Inter, colores de la marca y de los métodos como las pastillas del
  prototipo, sin la barra superior ni el «Authorize» de Swagger): es la única excepción al «sin CSS propio» del plan.
-->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import urlContrato from '../../contrato/socios-v1.yaml?url'
import type { Entorno } from '../../api/socios'
import { usePanelSocio, type TokenGenerado } from '../../composables/usePanelSocio'
import { t } from '../../i18n'

const props = defineProps<{ entorno: Entorno }>()

const { estado, cargarCredenciales, generarToken } = usePanelSocio()
const contenedor = ref<HTMLElement | null>(null)
const fallo = ref(false)
let token: TokenGenerado | null = null

/** Token vigente del entorno (con un minuto de margen); `null` si no se pudo pedir. */
async function tokenVigente(): Promise<string | null> {
  if (token && token.expiraEn - Date.now() > 60_000) return token.token
  if (!estado.credenciales) await cargarCredenciales()
  const resultado = await generarToken(props.entorno)
  token = typeof resultado === 'string' ? null : resultado
  return token?.token ?? null
}

onMounted(async () => {
  try {
    const { default: SwaggerUIBundle } = await import('swagger-ui-dist/swagger-ui-es-bundle.js')
    await import('swagger-ui-dist/swagger-ui.css')
    if (!contenedor.value) return
    SwaggerUIBundle({
      domNode: contenedor.value,
      url: urlContrato,
      deepLinking: false,
      defaultModelsExpandDepth: -1,
      displayRequestDuration: true,
      requestInterceptor: async (peticion) => {
        // El contrato mismo se descarga sin token; las llamadas a la API llevan el del entorno.
        if (peticion.url.includes('/v1/')) {
          const vigente = await tokenVigente()
          if (vigente) peticion.headers.Authorization = `Bearer ${vigente}`
        }
        return peticion
      },
    })
  } catch {
    fallo.value = true
  }
})
</script>

<template>
  <div class="swagger-socios rounded-[8px] border border-borde bg-white" :data-entorno="entorno">
    <p v-if="fallo" role="alert" class="p-4 text-[13px] text-error">{{ t('socios.docs.swaggerFallo') }}</p>
    <div ref="contenedor" data-prueba="swagger" />
  </div>
</template>

<style>
/* Ajuste de Swagger UI a la web (excepción del plan, 5.4 #2). Todo cuelga de .swagger-socios para no tocar nada más. */
.swagger-socios .swagger-ui,
.swagger-socios .swagger-ui .info .title,
.swagger-socios .swagger-ui .opblock-tag,
.swagger-socios .swagger-ui .opblock .opblock-summary-description,
.swagger-socios .swagger-ui .btn,
.swagger-socios .swagger-ui table thead tr th,
.swagger-socios .swagger-ui .parameter__name,
.swagger-socios .swagger-ui .response-col_status {
  font-family: Inter, system-ui, sans-serif;
  color: #333333;
}
.swagger-socios .swagger-ui .topbar,
.swagger-socios .swagger-ui .scheme-container,
.swagger-socios .swagger-ui .info .link,
.swagger-socios .swagger-ui .info hgroup.main a {
  display: none;
}
.swagger-socios .swagger-ui .info {
  margin: 20px 0;
}
.swagger-socios .swagger-ui .info .title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.55px;
}
.swagger-socios .swagger-ui .info .title small,
.swagger-socios .swagger-ui .info .title small.version-stamp {
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  border-radius: 12px;
}
.swagger-socios .swagger-ui .info .title small pre,
.swagger-socios .swagger-ui .info .title small.version-stamp pre {
  color: #6e6e6e;
  font-family: Inter, system-ui, sans-serif;
  font-size: 11px;
}
.swagger-socios .swagger-ui .info .description,
.swagger-socios .swagger-ui .markdown p,
.swagger-socios .swagger-ui .renderedMarkdown p {
  font-size: 13px;
  line-height: 18px;
  color: #333333;
}
.swagger-socios .swagger-ui .markdown code,
.swagger-socios .swagger-ui .renderedMarkdown code {
  background: #f5f5f5;
  color: #333333;
  font-weight: 400;
}
.swagger-socios .swagger-ui .wrapper {
  padding: 0 16px;
}
.swagger-socios .swagger-ui a,
.swagger-socios .swagger-ui .info a {
  color: #2b5aa3;
}
.swagger-socios .swagger-ui .btn {
  border-radius: 4px;
}
.swagger-socios .swagger-ui .btn.execute {
  background: #1e4680;
  border-color: #1e4680;
  color: #ffffff;
}
.swagger-socios .swagger-ui .btn.try-out__btn {
  border-color: #1e4680;
  color: #1e4680;
}
.swagger-socios .swagger-ui .opblock {
  border-radius: 8px;
  box-shadow: none;
}
/* Métodos como las pastillas del prototipo (Figma 2001:3455): POST en verde y GET en azul. */
.swagger-socios .swagger-ui .opblock.opblock-post {
  background: #e8f6f1;
  border-color: #2e7c56;
}
.swagger-socios .swagger-ui .opblock.opblock-post .opblock-summary-method {
  background: #2e7c56;
}
.swagger-socios .swagger-ui .opblock.opblock-get {
  background: #e8eff9;
  border-color: #2b5aa3;
}
.swagger-socios .swagger-ui .opblock.opblock-get .opblock-summary-method {
  background: #2b5aa3;
}
.swagger-socios .swagger-ui .opblock .opblock-summary-method {
  border-radius: 12px;
  font-family: Inter, system-ui, sans-serif;
  font-size: 11px;
}
</style>
