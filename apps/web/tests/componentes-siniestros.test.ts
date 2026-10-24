import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { CampoAreaTexto, CampoSeleccion, EstadoOperador, MigasDePan } from '../src/components/ui'

const stubsRouter = { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } }

describe('MigasDePan · varios niveles', () => {
  it('enlaza Inicio y los niveles intermedios; el último es la página actual', () => {
    const migas = mount(MigasDePan, {
      props: {
        aInicio: '/operador',
        niveles: [{ texto: 'Siniestros', to: '/operador/siniestros' }, { texto: 'Detalle #SIN-1' }],
      },
      global: { stubs: stubsRouter },
    })
    const enlaces = migas.findAll('a')
    expect(enlaces.map((a) => [a.text(), a.attributes('href')])).toEqual([
      ['Inicio', '/operador'],
      ['Siniestros', '/operador/siniestros'],
    ])
    const actual = migas.get('[aria-current="page"]')
    expect(actual.text()).toBe('Detalle #SIN-1')
    expect(migas.findAll('li[aria-hidden="true"]')).toHaveLength(2)
  })

  it('sigue funcionando con seccion (retrocompatible) y gana niveles si llegan ambos', () => {
    const solo = mount(MigasDePan, {
      props: { aInicio: '/inicio', seccion: 'Nueva cotización' },
      global: { stubs: stubsRouter },
    })
    expect(solo.findAll('a')).toHaveLength(1)
    expect(solo.get('[aria-current="page"]').text()).toBe('Nueva cotización')

    const ambos = mount(MigasDePan, {
      props: { aInicio: '/inicio', seccion: 'X', niveles: [{ texto: 'Y' }] },
      global: { stubs: stubsRouter },
    })
    expect(ambos.get('[aria-current="page"]').text()).toBe('Y')
  })

  it('pinta el slot #derecha', () => {
    const migas = mount(MigasDePan, {
      props: { aInicio: '/operador', seccion: 'Siniestros' },
      slots: { derecha: EstadoOperador },
      global: { stubs: stubsRouter },
    })
    expect(migas.text()).toContain('Operador de back-office activo')
  })
})

describe('EstadoOperador', () => {
  it('comunica el estado con texto; el punto es decorativo', () => {
    const p = mount(EstadoOperador)
    expect(p.text()).toBe('Operador de back-office activo')
    expect(p.get('span[aria-hidden="true"]').text()).toBe('')
    expect(p.attributes('role')).toBeUndefined()
  })
})

describe('CampoSeleccion', () => {
  const opciones = [
    { valor: 'per-01', texto: 'Peritajes Andes' },
    { valor: 'per-02', texto: 'Avalúos del Caribe' },
  ]

  it('asocia la etiqueta, muestra la opción vacía deshabilitada y emite el valor elegido', async () => {
    const campo = mount(CampoSeleccion, {
      props: { modelValue: '', label: 'Perito', placeholder: 'Selecciona un perito', opciones, hint: 'Ayuda' },
    })
    const select = campo.get('select')
    expect(campo.get('label').attributes('for')).toBe(select.attributes('id'))
    const vacia = campo.get('option[value=""]')
    expect(vacia.attributes('disabled')).toBeDefined()
    expect(vacia.text()).toBe('Selecciona un perito')
    expect(select.attributes('aria-describedby')).toBe(campo.get('p').attributes('id'))
    await select.setValue('per-02')
    expect(campo.emitted('update:modelValue')?.[0]).toEqual(['per-02'])
  })

  it('en error marca aria-invalid y anuncia el mensaje', () => {
    const campo = mount(CampoSeleccion, { props: { modelValue: '', label: 'Motivo', opciones, error: 'Elige uno' } })
    expect(campo.get('select').attributes('aria-invalid')).toBe('true')
    expect(campo.get('[role="alert"]').text()).toContain('Elige uno')
  })

  it('se puede deshabilitar', () => {
    const campo = mount(CampoSeleccion, { props: { modelValue: 'per-01', label: 'Perito', opciones, disabled: true } })
    expect(campo.get('select').attributes('disabled')).toBeDefined()
  })
})

describe('CampoAreaTexto', () => {
  it('cuenta caracteres, limita con maxlength y enlaza el contador', async () => {
    const campo = mount(CampoAreaTexto, { props: { modelValue: 'hola', label: 'Instrucciones (opcional)' } })
    const area = campo.get('textarea')
    expect(area.attributes('maxlength')).toBe('500')
    const contador = campo.get('[data-contador]')
    expect(contador.text()).toBe('4 / 500 caracteres')
    expect(area.attributes('aria-describedby')).toContain(contador.attributes('id'))
    expect(contador.attributes('aria-live')).toBeUndefined()
    await area.setValue('hola mundo')
    expect(campo.emitted('update:modelValue')?.[0]).toEqual(['hola mundo'])
  })

  it('anuncia desde el 90 % y al llegar al límite lo dice con texto', () => {
    const cerca = mount(CampoAreaTexto, { props: { modelValue: 'x'.repeat(9), label: 'C', maxlength: 10 } })
    expect(cerca.get('[data-contador]').attributes('aria-live')).toBe('polite')
    expect(cerca.text()).not.toContain('Límite alcanzado')

    const lleno = mount(CampoAreaTexto, { props: { modelValue: 'x'.repeat(10), label: 'C', maxlength: 10 } })
    expect(lleno.get('[data-contador]').text()).toContain('10 / 10 caracteres')
    expect(lleno.get('[data-contador]').text()).toContain('Límite alcanzado')
  })

  it('muestra el error con role="alert" y aria-invalid', () => {
    const campo = mount(CampoAreaTexto, { props: { modelValue: '', label: 'C', error: 'Demasiado largo' } })
    expect(campo.get('textarea').attributes('aria-invalid')).toBe('true')
    expect(campo.get('[role="alert"]').text()).toContain('Demasiado largo')
  })
})
