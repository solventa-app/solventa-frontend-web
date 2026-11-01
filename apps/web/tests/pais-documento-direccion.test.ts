import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CampoDireccion from '../src/components/ui/CampoDireccion.vue'
import { cambiarPais, pais, tipoDocumento } from '../src/composables/usePais'
import { nombrePais, PAISES, tiposDocumento } from '../src/utils/documentos'

describe('T20 · países y tipos de documento', () => {
  it('tiene los siete países', () => expect(PAISES).toHaveLength(7))
  it('Colombia ofrece CC, CE y pasaporte; otro país, su documento y pasaporte', () => {
    expect(tiposDocumento('CO', 'ES').map((x) => x.codigo)).toEqual(['CC', 'CE', 'PAS'])
    expect(tiposDocumento('BR', 'EN').map((x) => x.codigo)).toEqual(['CPF', 'PAS'])
  })
  it('los nombres salen según el idioma', () => {
    expect(nombrePais('ES', 'EN')).toContain('Spain')
    expect(nombrePais('ES', 'ES')).toContain('España')
  })
  it('cambiar el país reinicia el tipo', () => {
    cambiarPais('MX')
    expect(pais.value).toBe('MX')
    expect(tipoDocumento.value).toBe('CURP')
  })
})

describe('T19 · CampoDireccion sin clave', () => {
  it('funciona como un campo de texto', async () => {
    const w = mount(CampoDireccion, { props: { modelValue: '', label: 'Dirección' } })
    await w.find('input').setValue('Calle 1 # 2-3')
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['Calle 1 # 2-3'])
  })
})
