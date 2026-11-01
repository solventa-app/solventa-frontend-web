// Pantallas de HU-W03 (W03-01 con el modal del asesor, W03-02 a W03-04 y el retorno de la pasarela) y la validación
// previa de la imagen de firma (utils/firma.ts). El flujo de datos y el token se prueban en w03-suscripcion.test.ts.
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import RevisarOfertaAceptada from '../src/views/RevisarOfertaAceptada.vue'
import FirmaElectronica from '../src/views/FirmaElectronica.vue'
import FirmaConfirmada from '../src/views/FirmaConfirmada.vue'
import PolizaEmitida from '../src/views/PolizaEmitida.vue'
import RetornoPago from '../src/views/RetornoPago.vue'
import { useCotizacion } from '../src/composables/useCotizacion'
import { olvidarEnlace } from '../src/composables/useEnlaceFirma'
import { useSesion } from '../src/composables/useSesion'
import { cambiarMoneda, moneda, usarConversor } from '../src/composables/useMoneda'
import { useSuscripcion } from '../src/composables/useSuscripcion'
import { crearRutas } from '../src/router'
import { servidor } from '../src/mocks/node'
import { CODIGO_DEMO, restablecerSuscripcionDePrueba } from '../src/mocks/suscripcion'
import { bordeLimpio, revisarArchivoFirma, revisarImagenFirma, tipoRealImagen } from '../src/utils/firma'

const fetchPrueba: typeof fetch = (url, init) => fetch(new URL(String(url), 'http://localhost'), init)
// Las vistas usan el `fetch` global: en jsdom las rutas relativas no resuelven, así que se le da un origen. Se envuelve
// DESPUÉS de `listen()`, para envolver el fetch que ya intercepta MSW.
let fetchOriginal: typeof fetch
beforeAll(() => {
  servidor.listen({ onUnhandledFrame: 'error' })
  fetchOriginal = globalThis.fetch
  globalThis.fetch = ((url: RequestInfo | URL, init?: RequestInit) =>
    fetchOriginal(
      typeof url === 'string' && url.startsWith('/') ? new URL(url, 'http://localhost') : url,
      init,
    )) as typeof fetch
})
afterAll(() => {
  globalThis.fetch = fetchOriginal
  servidor.close()
})

const montados: VueWrapper[] = []
beforeEach(() => {
  restablecerSuscripcionDePrueba()
  olvidarEnlace()
  useSuscripcion().reiniciar()
})
afterEach(() => {
  montados.splice(0).forEach((w) => w.unmount())
  servidor.resetHandlers()
  useSesion(fetchPrueba).cerrarSesion()
})

async function montar(
  componente: Parameters<typeof mount>[0],
  ruta: string,
): Promise<{ w: VueWrapper; router: Router }> {
  const router = createRouter({ history: createMemoryHistory(), routes: crearRutas() })
  await router.push(ruta)
  await router.isReady()
  const w = mount(componente, { global: { plugins: [router] }, attachTo: document.body })
  montados.push(w)
  await flushPromises()
  return { w, router }
}

/** Espera a que las peticiones (que pasan por MSW, no solo por promesas) terminen y aparezca algo en pantalla. */
async function esperar(condicion: () => boolean, intentos = 50) {
  for (let i = 0; i < intentos && !condicion(); i++) {
    await flushPromises()
    await new Promise((r) => setTimeout(r, 10))
  }
}
const hay = (w: VueWrapper, prueba: string) => () => w.find(`[data-prueba="${prueba}"]`).exists()
async function boton(w: VueWrapper, prueba: string) {
  await esperar(hay(w, prueba))
  return w.get(`[data-prueba="${prueba}"]`)
}

describe('W03-01 · Revisar oferta aceptada', () => {
  async function prepararAsesor() {
    await useSesion(fetchPrueba).iniciarSesion('asesor.demo', 'secreta123')
    const cotizacion = useCotizacion(fetchPrueba)
    cotizacion.reiniciar()
    Object.assign(cotizacion.captura, {
      nombreCliente: 'Carlos Restrepo Gómez',
      correoCliente: 'cliente@correo.com',
      documentoIdentidad: '1020304050',
      valorCredito: '185000000',
      plazoMeses: '60',
      direccionInmueble: 'Cra 45',
      consentimiento: true,
    })
    await cotizacion.solicitarOferta()
  }

  it('muestra la prima, la cobertura y el score de la oferta, sin la entidad acreedora que el contrato no trae', async () => {
    await prepararAsesor()
    const { w } = await montar(RevisarOfertaAceptada, '/suscripcion/oferta-completa')

    const tarjeta = (await boton(w, 'tarjeta-oferta')).text()
    expect(tarjeta).toContain('Oferta aprobada y lista para firma')
    expect(tarjeta).toMatch(/94\.680/)
    expect(tarjeta).toContain('780')
    expect(tarjeta).not.toContain('Entidad beneficiaria')
  })

  it('una oferta preliminar no se puede aceptar: ofrece volver a calcular (D-11)', async () => {
    await useSesion(fetchPrueba).iniciarSesion('asesor.demo', 'secreta123')
    useCotizacion(fetchPrueba).reiniciar()
    const { w } = await montar(RevisarOfertaAceptada, '/suscripcion/oferta-preliminar')

    expect((await boton(w, 'oferta-preliminar')).text()).toContain('Volver a calcular')
    expect(w.find('[data-prueba="aceptar"]').exists()).toBe(false)
  })

  it('la oferta se convierte a USD (se consulta) y el selector sigue activo', async () => {
    usarConversor(async (montos, destino) =>
      montos.map((m) => ({ valor: (Number(m.valor) / 4000).toFixed(2), moneda: destino })),
    )
    await prepararAsesor()
    await cambiarMoneda('USD')
    const { w } = await montar(RevisarOfertaAceptada, '/suscripcion/oferta-completa')
    await boton(w, 'tarjeta-oferta')
    await esperar(() => w.get('[data-prueba="tarjeta-oferta"]').text().includes('23,67'))

    expect(w.get('[data-prueba="tarjeta-oferta"]').text()).toMatch(/23,67/)
    expect(w.get('select').attributes('disabled')).toBeUndefined()
    usarConversor(null)
    moneda.value = 'COP'
  })

  it('las páginas del enlace dejan el selector deshabilitado en la moneda del documento', async () => {
    await cambiarMoneda('USD')
    window.location.hash = '#t=firmado'
    const { w } = await montar(FirmaConfirmada, '/firma/confirmada')
    await boton(w, 'pagar')

    const selector = w.get('select')
    expect(selector.attributes('disabled')).toBeDefined()
    expect((selector.element as HTMLSelectElement).value).toBe('COP')
    moneda.value = 'COP'
  })

  it('al recargar con la identidad ya verificada ofrece «Continuar con la emisión» y no pide otro código', async () => {
    await prepararAsesor()
    const suscripcion = useSuscripcion(fetchPrueba)
    await suscripcion.aceptar('oferta-completa')
    await suscripcion.enviarCodigo()
    await suscripcion.verificarCodigo(CODIGO_DEMO)
    suscripcion.reiniciar() // la recarga borra la memoria
    useCotizacion(fetchPrueba).reiniciar()

    const { w } = await montar(RevisarOfertaAceptada, '/suscripcion/oferta-completa')
    const continuar = await boton(w, 'continuar-emision')
    expect(continuar.text()).toContain('Continuar con la emisión')

    await continuar.trigger('click')
    await flushPromises()
    expect(w.find('[data-prueba="emitir"]').exists()).toBe(true)
    expect(w.find('[data-prueba="enviar-codigo"]').exists()).toBe(false)
    suscripcion.reiniciar() // la memoria es compartida: no se la dejamos a la siguiente prueba
  })

  it('modal: «Emitir» solo con el código válido, y al emitir muestra el correo enmascarado, nunca la URL', async () => {
    await prepararAsesor()
    const { w } = await montar(RevisarOfertaAceptada, '/suscripcion/oferta-completa')

    await (await boton(w, 'aceptar')).trigger('click')
    await flushPromises()
    expect((await boton(w, 'correo-enmascarado')).text()).toBe('c•••@correo.com')

    await (await boton(w, 'enviar-codigo')).trigger('click')
    await flushPromises()
    expect((await boton(w, 'verificar')).attributes('disabled')).toBeDefined()

    const campo = w.get('[data-componente="modal-verificacion-asesor"] input')
    await campo.setValue('111111')
    await (await boton(w, 'verificar')).trigger('click')
    await flushPromises()
    expect((await boton(w, 'error-modal')).text()).toContain('4 intentos')

    await campo.setValue(CODIGO_DEMO)
    await (await boton(w, 'verificar')).trigger('click')
    await flushPromises()
    expect((await boton(w, 'emitir')).attributes('disabled')).toBeUndefined()

    await (await boton(w, 'emitir')).trigger('click')
    await flushPromises()
    const enviado = (await boton(w, 'enlace-enviado')).text()
    expect(enviado).toContain('c•••@correo.com')
    expect(enviado).not.toContain('/firma')
  })

  it('modal: «Reenviar código» queda con cuenta regresiva de 60 s y se habilita al terminar (T23)', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    try {
      await prepararAsesor()
      const { w } = await montar(RevisarOfertaAceptada, '/suscripcion/oferta-completa')
      await (await boton(w, 'aceptar')).trigger('click')
      await flushPromises()
      await (await boton(w, 'enviar-codigo')).trigger('click')
      await flushPromises()

      const reenviar = await boton(w, 'reenviar-codigo')
      expect(reenviar.attributes('disabled')).toBeDefined()
      expect(reenviar.text()).toContain('1:00')

      vi.advanceTimersByTime(18_000)
      await flushPromises()
      expect((await boton(w, 'reenviar-codigo')).text()).toContain('0:42')

      vi.advanceTimersByTime(42_000)
      await flushPromises()
      const listo = await boton(w, 'reenviar-codigo')
      expect(listo.attributes('disabled')).toBeUndefined()
      expect(listo.text()).toBe('Enviar otro código')

      await listo.trigger('click')
      await flushPromises()
      expect((await boton(w, 'reenviar-codigo')).attributes('disabled')).toBeDefined()
      expect((await boton(w, 'codigo-nuevo')).text()).toContain('código nuevo')
    } finally {
      vi.useRealTimers()
      useSuscripcion().reiniciar()
    }
  })
})

describe('Páginas del enlace (sin sesión)', () => {
  it('W03-02 sin token muestra el estado vacío, sin botones', async () => {
    const { w } = await montar(FirmaElectronica, '/firma')
    expect(w.find('[data-pantalla="W03-02"]').exists()).toBe(true)
    expect(w.text()).toContain('Este enlace venció o ya no es válido')
    expect(w.findAll('main button')).toHaveLength(0)
  })

  it('W03-02 «Firmar» se habilita solo con firma y términos aceptados (sin marcar por defecto)', async () => {
    window.location.hash = '#t=demo'
    const { w, router } = await montar(FirmaElectronica, '/firma')
    expect(window.location.hash).toBe('')

    const terminos = await boton(w, 'acepta-terminos')
    expect((terminos.element as HTMLInputElement).checked).toBe(false)
    expect((await boton(w, 'firmar')).attributes('disabled')).toBeDefined()

    await (await boton(w, 'modo-NOMBRE')).trigger('click')
    await w.get('[data-componente="firma-tres-modos"] input').setValue('Carlos Restrepo Gómez')
    expect((await boton(w, 'firmar')).attributes('disabled')).toBeDefined()

    await terminos.setValue(true)
    expect((await boton(w, 'firmar')).attributes('disabled')).toBeUndefined()
    await (await boton(w, 'firmar')).trigger('click')
    await esperar(() => router.currentRoute.value.path === '/firma/confirmar')
    expect(router.currentRoute.value.path).toBe('/firma/confirmar')
  })

  it('W03-02 retoma donde iba: un enlace ya firmado lleva a W03-03', async () => {
    window.location.hash = '#t=firmado'
    const { router } = await montar(FirmaElectronica, '/firma')
    await esperar(() => router.currentRoute.value.path === '/firma/confirmada')
    expect(router.currentRoute.value.path).toBe('/firma/confirmada')
  })

  it('W03-03 muestra la evidencia de la firma y «Pagar», sin «validación biométrica»', async () => {
    window.location.hash = '#t=firmado'
    const { w } = await montar(FirmaConfirmada, '/firma/confirmada')
    expect((await boton(w, 'evidencia-firma')).text()).toContain('Firmado electrónicamente')
    expect((await boton(w, 'pagar')).text()).toContain('Pagar')
    expect(w.text()).not.toMatch(/biom[eé]trica|segundo plano/)
  })

  it('W03-04 muestra el número de la póliza y no tiene «Ir al inicio»', async () => {
    window.location.hash = '#t=emitido'
    const { w } = await montar(PolizaEmitida, '/firma/poliza')
    expect((await boton(w, 'numero-poliza')).text()).toMatch(/SOL-\d{4}-\d{6}/)
    expect(w.text()).not.toContain('Ir al inicio')
    expect(w.text()).not.toContain('Ver detalle de fuentes')
  })

  it('el retorno sin token ni puente pide abrir de nuevo el enlace', async () => {
    sessionStorage.clear()
    const { w } = await montar(RetornoPago, '/pago/retorno?sesion=ses-1')
    await esperar(() => w.text().includes('Abre de nuevo'))
    expect(w.text()).toContain('Abre de nuevo el enlace de tu correo')
  })
})

describe('ruta de retorno de la pasarela', () => {
  it('acepta el retorno con el id de la propuesta (como lo manda el BFF) y sin él', () => {
    const rutas = crearRutas()
    const retorno = rutas.find((r) => r.name === 'W03-R')
    expect(retorno?.path).toBe('/pago/retorno/:propuestaId?')
    const router = createRouter({ history: createMemoryHistory(), routes: rutas })
    expect(router.resolve('/pago/retorno/p-1?sesion=ses-1').name).toBe('W03-R')
    expect(router.resolve('/pago/retorno?sesion=ses-1').name).toBe('W03-R')
  })
})

describe('validación previa de la imagen de firma', () => {
  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a])
  const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])

  it('reconoce PNG y JPG por su contenido, no por la extensión', () => {
    expect(tipoRealImagen(PNG)).toBe('image/png')
    expect(tipoRealImagen(JPG)).toBe('image/jpeg')
    expect(tipoRealImagen(new TextEncoder().encode('GIF89a'))).toBeNull()
    expect(revisarArchivoFirma(new TextEncoder().encode('<svg>'))).toBe('firma.imagen.errorTipo')
  })

  it('rechaza más de 500 KB y más de 1200 × 600 px', () => {
    const grande = new Uint8Array(500 * 1024 + 1)
    grande.set(PNG)
    expect(revisarArchivoFirma(grande)).toBe('firma.imagen.errorPeso')
    expect(revisarImagenFirma(1201, 300, null)).toBe('firma.imagen.errorTamano')
    expect(revisarImagenFirma(1200, 600, null)).toBeNull()
  })

  it('exige bordes blancos o transparentes', () => {
    const lienzo = (relleno: [number, number, number, number]) => {
      const datos = new Uint8ClampedArray(10 * 10 * 4)
      for (let i = 0; i < datos.length; i += 4) datos.set(relleno, i)
      return datos
    }
    expect(bordeLimpio(lienzo([255, 255, 255, 255]), 10, 10)).toBe(true)
    expect(bordeLimpio(lienzo([0, 0, 0, 0]), 10, 10)).toBe(true)
    expect(bordeLimpio(lienzo([120, 100, 80, 255]), 10, 10)).toBe(false)
  })
})
