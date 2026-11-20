import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TablaEsqueleto from '../src/components/ui/TablaEsqueleto.vue'

describe('TablaEsqueleto', () => {
  it('pinta las columnas y las filas pedidas (5 por defecto)', () => {
    const wrapper = mount(TablaEsqueleto, { props: { etiqueta: 'Cargando…', encabezados: ['A', 'B', 'C', 'D'] } })

    expect(wrapper.findAll('th')).toHaveLength(4)
    const filas = wrapper.findAll('[data-prueba="fila-esqueleto"]')
    expect(filas).toHaveLength(5)
    expect(filas[0].findAll('td')).toHaveLength(4)
  })

  it('respeta el número de filas', () => {
    const wrapper = mount(TablaEsqueleto, { props: { etiqueta: 'Cargando…', encabezados: ['A', 'B'], filas: 3 } })

    expect(wrapper.findAll('[data-prueba="fila-esqueleto"]')).toHaveLength(3)
  })

  it('para un lector de pantalla es un solo estado con el texto de carga; las barras son decorativas', () => {
    const wrapper = mount(TablaEsqueleto, {
      props: { etiqueta: 'Cargando pólizas…', encabezados: ['Póliza', 'Prima', 'Estado'] },
    })

    expect(wrapper.findAll('[role="status"]')).toHaveLength(1)
    expect(wrapper.get('[role="status"]').text()).toBe('Cargando pólizas…')
    expect(wrapper.get('[data-prueba="tabla-esqueleto"]').attributes('aria-busy')).toBe('true')
    expect(wrapper.get('table').element.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('el encabezado muestra las columnas reales y cada celda es un bloque con brillo', () => {
    const wrapper = mount(TablaEsqueleto, { props: { etiqueta: 'Cargando…', encabezados: ['Póliza', 'Prima'] } })

    expect(wrapper.findAll('th').map((th) => th.text())).toEqual(['Póliza', 'Prima'])
    // 5 filas: la primera columna con dos líneas (nombre y detalle) y la segunda con una.
    expect(wrapper.findAll('td .esqueleto')).toHaveLength(15)
  })
})
