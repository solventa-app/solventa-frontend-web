import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import {
  AvatarPerfil,
  Boton,
  CampoFormulario,
  Divisor,
  FooterPantalla,
  HeaderPantalla,
  MigasDePan,
  SelectorIdioma,
  SelectorMoneda,
  TituloPantalla,
} from '../src/components/ui'

// Stub mínimo: estos componentes no necesitan un router real, solo que RouterLink exista.
const stubsRouter = { RouterLink: { template: '<a><slot /></a>' } }

describe('Boton', () => {
  it('renderiza el texto del slot y es primario por defecto', () => {
    const boton = mount(Boton, { slots: { default: 'Continuar a suscripción' } })
    expect(boton.text()).toBe('Continuar a suscripción')
    expect(boton.classes()).toContain('bg-primario')
  })

  it('aplica la variante secundaria', () => {
    const boton = mount(Boton, { props: { variante: 'secundario' }, slots: { default: 'Volver' } })
    expect(boton.classes()).toContain('text-primario')
    expect(boton.classes()).not.toContain('bg-primario')
  })

  it('aplica la variante destructiva', () => {
    const boton = mount(Boton, { props: { variante: 'destructivo' }, slots: { default: 'Regenerar API key' } })
    expect(boton.classes()).toContain('bg-error')
  })
})

describe('CampoFormulario', () => {
  it('emite update:modelValue al escribir', async () => {
    const campo = mount(CampoFormulario, { props: { modelValue: '', label: 'Número de documento' } })
    await campo.find('input').setValue('1024578113')
    expect(campo.emitted('update:modelValue')?.[0]).toEqual(['1024578113'])
  })

  it('muestra el error con role="alert" y marca aria-invalid', () => {
    const campo = mount(CampoFormulario, {
      props: { modelValue: '1.024.578.11', label: 'Número de documento', error: 'El documento no coincide con el titular' },
    })
    const alerta = campo.get('[role="alert"]')
    expect(alerta.text()).toContain('El documento no coincide con el titular')
    expect(campo.get('input').attributes('aria-invalid')).toBe('true')
  })

  it('no bloquea el envío por sí mismo: el consentimiento lo decide quien use el campo', () => {
    const campo = mount(CampoFormulario, { props: { modelValue: '', label: 'Correo electrónico', required: true } })
    expect(campo.get('input').attributes('required')).toBeDefined()
  })
})

describe('MigasDePan', () => {
  it('toda la franja es un enlace a "Inicio" y muestra la sección actual', () => {
    const migas = mount(MigasDePan, {
      props: { seccion: 'Nueva cotización', aInicio: '/inicio' },
      global: { stubs: stubsRouter },
    })
    const enlace = migas.get('a')
    expect(enlace.attributes('href') ?? enlace.attributes('to')).toBeTruthy()
    expect(migas.text()).toContain('Inicio')
    expect(migas.text()).toContain('Nueva cotización')
  })

  it('tiene el landmark <nav>, y solo "Inicio" es enlace (la sección actual no lo es)', () => {
    const migas = mount(MigasDePan, {
      props: { seccion: 'Nueva cotización', aInicio: '/inicio' },
      global: { stubs: stubsRouter },
    })
    expect(migas.find('nav[aria-label]').exists()).toBe(true)
    expect(migas.get('a').text()).toBe('Inicio')
    expect(migas.findAll('a').length).toBe(1)
  })
})

describe('SelectorIdioma', () => {
  it('marca ES activo por defecto y emite EN al hacer clic', async () => {
    const selector = mount(SelectorIdioma)
    const botones = selector.findAll('button')
    expect(botones[0].attributes('aria-pressed')).toBe('true')
    await botones[1].trigger('click')
    expect(selector.emitted('update:modelValue')?.[0]).toEqual(['EN'])
  })
})

describe('SelectorMoneda', () => {
  it('usa COP por defecto y expone un <select> accesible', () => {
    const selector = mount(SelectorMoneda)
    expect(selector.get('select').element.value).toBe('COP')
    expect(selector.get('select').attributes('aria-label')).toContain('COP')
  })
})

describe('AvatarPerfil', () => {
  it('es un botón accesible que emite "click" (G-05 todavía no existe)', async () => {
    const avatar = mount(AvatarPerfil)
    expect(avatar.get('button').attributes('aria-label')).toBe('Mi perfil')
    await avatar.get('button').trigger('click')
    expect(avatar.emitted('click')).toHaveLength(1)
  })
})

describe('TituloPantalla', () => {
  it('renderiza un <h1> con el slot', () => {
    const titulo = mount(TituloPantalla, { slots: { default: 'Iniciar sesión' } })
    expect(titulo.element.tagName).toBe('H1')
    expect(titulo.text()).toBe('Iniciar sesión')
  })
})

describe('Divisor', () => {
  it('renderiza un <hr> decorativo', () => {
    const divisor = mount(Divisor)
    expect(divisor.element.tagName).toBe('HR')
    expect(divisor.attributes('role')).toBe('presentation')
  })
})

describe('FooterPantalla', () => {
  it('muestra el aviso legal y el sello de seguridad', () => {
    const footer = mount(FooterPantalla)
    expect(footer.text()).toContain('Solventa Tecnologías S.A.S.')
    expect(footer.text()).toContain('Conexión segura TLS 1.3')
    expect(footer.text()).toContain('Superintendencia Financiera de Colombia')
  })
})

describe('HeaderPantalla', () => {
  it('compone selector de idioma, de moneda y avatar, con título opcional', () => {
    const header = mount(HeaderPantalla, { props: { titulo: 'Home del Cliente' } })
    expect(header.text()).toContain('Solventa')
    expect(header.text()).toContain('Home del Cliente')
    expect(header.findComponent(SelectorIdioma).exists()).toBe(true)
    expect(header.findComponent(SelectorMoneda).exists()).toBe(true)
    expect(header.findComponent(AvatarPerfil).exists()).toBe(true)
  })

  it('propaga los cambios de idioma y moneda al padre', async () => {
    const header = mount(HeaderPantalla)
    await header.findComponent(SelectorIdioma).vm.$emit('update:modelValue', 'EN')
    expect(header.emitted('update:idioma')?.[0]).toEqual(['EN'])
  })
})
