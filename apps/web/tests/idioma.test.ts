// Soporte de inglés/español (KAN-209): el selector del header cambia el idioma de toda la interfaz, marca el
// idioma activo, lo recuerda y lo manda al BFF como Accept-Language.
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FooterPantalla, HeaderPantalla, SelectorIdioma } from '../src/components/ui'
import { ejecutar } from '../src/graphql/cliente'
import { cambiarIdioma, idioma, t } from '../src/i18n'
import { en } from '../src/i18n/en'
import { es } from '../src/i18n/es'
import { formatearFecha, formatearMonto } from '../src/utils/formato'
import { nombreFuente } from '../src/utils/nombres'

afterEach(() => cambiarIdioma('ES'))

function montarCromo() {
  return mount({
    components: { HeaderPantalla, FooterPantalla },
    template: '<div><HeaderPantalla titulo="x" sin-perfil /><FooterPantalla /></div>',
  })
}

describe('catálogos', () => {
  it('español e inglés tienen las mismas claves y ningún texto vacío', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort())
    expect(Object.entries(en).filter(([, texto]) => !texto.trim())).toEqual([])
  })

  it('reemplaza los parámetros del texto', () => {
    cambiarIdioma('EN')
    expect(t('home.hola', { nombre: 'Ana' })).toBe('Hi, Ana')
  })
})

describe('selector de idioma del header', () => {
  it('al elegir EN cambia los textos de la pantalla, mueve el resaltado y lo recuerda', async () => {
    const pagina = montarCromo()
    expect(pagina.text()).toContain('Idioma:')
    expect(pagina.text()).toContain('Vigilado por la Superintendencia Financiera de Colombia')

    const [botonEs, botonEn] = pagina.findComponent(SelectorIdioma).findAll('button')
    expect(botonEs.attributes('aria-pressed')).toBe('true')
    await botonEn.trigger('click')

    expect(idioma.value).toBe('EN')
    expect(pagina.text()).toContain('Language:')
    expect(pagina.text()).toContain('Supervised by the Financial Superintendence of Colombia')
    expect(botonEn.attributes('aria-pressed')).toBe('true')
    expect(botonEn.classes()).toContain('font-bold')
    expect(botonEs.attributes('aria-pressed')).toBe('false')
    expect(botonEs.classes()).not.toContain('font-bold')
    expect(localStorage.getItem('solventa.idioma')).toBe('EN')
    expect(document.documentElement.lang).toBe('en')
  })

  it('el idioma es global: otro header montado después ya sale en inglés', async () => {
    cambiarIdioma('EN')
    const otra = montarCromo()
    const [, botonEn] = otra.findComponent(SelectorIdioma).findAll('button')
    expect(botonEn.attributes('aria-pressed')).toBe('true')
    expect(otra.text()).toContain('Language:')
  })
})

describe('mensajes del BFF', () => {
  it('manda el idioma activo como Accept-Language', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ data: { ok: true } }), { status: 200 }))
    await ejecutar('{ ok }', {}, fetchFn as unknown as typeof fetch)
    cambiarIdioma('EN')
    await ejecutar('{ ok }', {}, fetchFn as unknown as typeof fetch)
    const cabeceras = fetchFn.mock.calls.map((llamada) => (llamada as unknown as [string, RequestInit])[1].headers)
    expect(cabeceras[0]).toMatchObject({ 'Accept-Language': 'es' })
    expect(cabeceras[1]).toMatchObject({ 'Accept-Language': 'en' })
  })
})

describe('formatos en inglés', () => {
  it('fecha, dinero y nombres de fuentes siguen el idioma', () => {
    expect(formatearFecha('2026-09-12T15:45:00Z')).toBe('12 sep 2026, 10:45 a. m.')
    expect(nombreFuente('historial-crediticio')).toBe('Historial crediticio')
    cambiarIdioma('EN')
    expect(formatearFecha('2026-09-12T15:45:00Z')).toBe('Sep 12, 2026, 10:45 AM')
    expect(formatearMonto({ valor: '48500.00', moneda: 'COP' }).replace(/\s/g, ' ')).toBe('COP 48,500')
    expect(nombreFuente('historial-crediticio')).toBe('Credit history')
    expect(nombreFuente('fuente-nueva')).toBe('fuente-nueva')
  })
})
