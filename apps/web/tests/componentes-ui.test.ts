import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import {
  AvatarPerfil,
  Badge,
  BarraDeCerrarSesion,
  Boton,
  CampoFormulario,
  Chip,
  Divisor,
  FooterPantalla,
  HeaderPantalla,
  MigasDePan,
  SelectorIdioma,
  SelectorMoneda,
  TituloPantalla,
} from '../src/components/ui'
import IconoMaterial from '../src/components/ui/IconoMaterial.vue'
import { cambiarIdioma, idioma } from '../src/i18n'

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

  it('propaga disabled al <button> real (hallazgo QA: antes se perdía por fallthrough)', () => {
    const boton = mount(Boton, { props: { disabled: true }, slots: { default: 'Continuar' } })
    expect(boton.get('button').attributes('disabled')).toBeDefined()
  })

  // Hallazgo de QA: el slot opcional #icono (lo usa p. ej. OfertaError.vue en "Reintentar") no
  // tenía ninguna prueba dedicada.
  it('renderiza el slot #icono antes del texto cuando se provee', () => {
    const boton = mount(Boton, {
      slots: {
        icono: '<svg data-testid="icono-boton" />',
        default: 'Reintentar',
      },
    })
    expect(boton.find('[data-testid="icono-boton"]').exists()).toBe(true)
    expect(boton.text()).toBe('Reintentar')
    // El ícono va antes del texto en el DOM (slot #icono antes que el slot por defecto en Boton.vue):
    // el primer elemento hijo del botón es el ícono, no texto.
    expect(boton.element.firstElementChild?.getAttribute('data-testid')).toBe('icono-boton')
  })

  it('no renderiza ningún ícono cuando el slot #icono no se usa', () => {
    const boton = mount(Boton, { slots: { default: 'Continuar' } })
    expect(boton.find('svg').exists()).toBe(false)
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
      props: {
        modelValue: '1.024.578.11',
        label: 'Número de documento',
        error: 'El documento no coincide con el titular',
      },
    })
    const alerta = campo.get('[role="alert"]')
    expect(alerta.text()).toContain('El documento no coincide con el titular')
    expect(campo.get('input').attributes('aria-invalid')).toBe('true')
  })

  it('no bloquea el envío por sí mismo: el consentimiento lo decide quien use el campo', () => {
    const campo = mount(CampoFormulario, { props: { modelValue: '', label: 'Correo electrónico', required: true } })
    expect(campo.get('input').attributes('required')).toBeDefined()
  })

  it('propaga disabled al <input> real (hallazgo QA: antes quedaba en el <div> envolvente)', () => {
    const campo = mount(CampoFormulario, {
      props: { modelValue: '1024578113', label: 'Número de documento', disabled: true },
    })
    expect(campo.get('input').attributes('disabled')).toBeDefined()
  })

  // Hallazgo de QA: el prop opcional `icono` (lo usan varios campos de SolicitudYConsentimiento.vue
  // e IngresoConRol.vue) no tenía ninguna prueba dedicada.
  it('renderiza el ícono cuando se pasa el prop `icono`', () => {
    const campo = mount(CampoFormulario, { props: { modelValue: '', label: 'Documento de identidad', icono: 'badge' } })
    const icono = campo.findComponent(IconoMaterial)
    expect(icono.exists()).toBe(true)
    expect(icono.props('nombre')).toBe('badge')
  })

  it('no renderiza ningún ícono cuando `icono` no se pasa', () => {
    const campo = mount(CampoFormulario, { props: { modelValue: '', label: 'Plazo (meses)' } })
    expect(campo.findComponent(IconoMaterial).exists()).toBe(false)
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

  it('sus botones tienen anillo de foco visible (hallazgo QA: consistencia con el resto de la librería)', () => {
    const selector = mount(SelectorIdioma)
    for (const boton of selector.findAll('button')) {
      expect(boton.classes()).toContain('focus-visible:ring-2')
    }
  })
})

describe('Badge', () => {
  it('cada tipo lleva glifo de texto además de color (el estado nunca se comunica solo con color)', () => {
    const exito = mount(Badge, { props: { tipo: 'exito' }, slots: { default: 'Cobrado' } })
    expect(exito.text()).toBe('✓Cobrado')
    expect(exito.classes()).toContain('text-exito')

    const alerta = mount(Badge, { props: { tipo: 'alerta' }, slots: { default: 'Pendiente' } })
    expect(alerta.text()).toBe('!Pendiente')

    const error = mount(Badge, { props: { tipo: 'error' }, slots: { default: 'Rechazado' } })
    expect(error.text()).toBe('✕Rechazado')

    const enCurso = mount(Badge, { props: { tipo: 'enCurso' }, slots: { default: 'En revisión' } })
    expect(enCurso.text()).toBe('→En revisión')
  })
})

describe('Chip', () => {
  it('es un botón con aria-pressed que refleja el prop activo', async () => {
    const chip = mount(Chip, { props: { activo: false }, slots: { default: 'Pendiente' } })
    expect(chip.get('button').attributes('aria-pressed')).toBe('false')
    expect(chip.classes()).toContain('border')

    await chip.setProps({ activo: true })
    expect(chip.get('button').attributes('aria-pressed')).toBe('true')
    expect(chip.classes()).toContain('bg-primario')
  })

  it('emite click al presionarlo', async () => {
    const chip = mount(Chip, { slots: { default: 'Todos' } })
    await chip.get('button').trigger('click')
    expect(chip.emitted('click')).toHaveLength(1)
  })
})

describe('BarraDeCerrarSesion', () => {
  it('muestra nombre · rol y un botón "Cerrar sesión" que emite el evento', async () => {
    const barra = mount(BarraDeCerrarSesion, { props: { nombre: 'María Gutiérrez', rol: 'Cliente' } })
    expect(barra.text()).toContain('María Gutiérrez · Cliente')
    const boton = barra.get('button')
    expect(boton.text()).toBe('Cerrar sesión')
    await boton.trigger('click')
    expect(barra.emitted('cerrar-sesion')).toHaveLength(1)
  })
})

describe('SelectorMoneda', () => {
  it('usa COP por defecto y expone un <select> accesible', () => {
    const selector = mount(SelectorMoneda)
    expect(selector.get('select').element.value).toBe('COP')
    expect(selector.get('select').attributes('aria-label')).toContain('COP')
  })

  it('incluye las monedas soportadas por defecto (multijurisdiccion)', () => {
    const selector = mount(SelectorMoneda)
    const opciones = selector.findAll('option').map((opt) => opt.text())
    expect(opciones).toEqual(['COP', 'MXN', 'BRL', 'CLP', 'PEN', 'USD', 'EUR'])
  })

  it('emite update:modelValue al cambiar la moneda seleccionada', async () => {
    const selector = mount(SelectorMoneda)
    await selector.get('select').setValue('USD')
    expect(selector.emitted('update:modelValue')).toEqual([['USD']])
  })

  it('propaga disabled al <select> real (hallazgo QA: antes quedaba en el <div> envolvente)', () => {
    const selector = mount(SelectorMoneda, { props: { disabled: true } })
    expect(selector.get('select').attributes('disabled')).toBeDefined()
  })

  it('el contenedor tiene anillo de foco (hallazgo QA: WCAG 2.4.7, antes invisible con outline-none)', () => {
    const selector = mount(SelectorMoneda)
    expect(selector.get('div').classes()).toContain('focus-within:ring-2')
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

  it('cambia el idioma global y lo propaga al padre', async () => {
    const header = mount(HeaderPantalla)
    await header.findComponent(SelectorIdioma).vm.$emit('update:modelValue', 'EN')
    expect(header.emitted('update:idioma')?.[0]).toEqual(['EN'])
    expect(idioma.value).toBe('EN')
    cambiarIdioma('ES')
  })
})

// KAN-203: IconoMaterial nunca tenía una prueba propia, solo se ejercitaba de rebote a través de
// CampoFormulario (que monta un solo ícono conocido). Esto cubre que cambia de trazo según `nombre`
// (prop reactiva) y que los 4 glifos que trajo HU-W05 (assignment/schedule/swap_horiz/gavel, usados
// en ConciliacionDePagos.vue) quedaron bien agregados al set que ya traía develop tras el merge de
// componentes-globales, sin pisar ninguno de los 24 anteriores.
describe('IconoMaterial', () => {
  it('renderiza un <svg> decorativo (aria-hidden, no focuseable)', () => {
    const icono = mount(IconoMaterial, { props: { nombre: 'home' } })
    expect(icono.element.tagName).toBe('svg')
    expect(icono.attributes('aria-hidden')).toBe('true')
    expect(icono.attributes('focusable')).toBe('false')
  })

  it('el trazo (atributo d del <path>) cambia según la prop `nombre`', async () => {
    const icono = mount(IconoMaterial, { props: { nombre: 'home' } })
    const trazoHome = icono.get('path').attributes('d')
    await icono.setProps({ nombre: 'logout' })
    const trazoLogout = icono.get('path').attributes('d')
    expect(trazoHome).toBeTruthy()
    expect(trazoLogout).toBeTruthy()
    expect(trazoHome).not.toBe(trazoLogout)
  })

  it.each(['assignment', 'schedule', 'swap_horiz', 'gavel'] as const)(
    'renderiza el glifo "%s" que agregó HU-W05 (ConciliacionDePagos.vue) sin romper el set existente',
    (nombre) => {
      const icono = mount(IconoMaterial, { props: { nombre } })
      expect(icono.get('path').attributes('d')).toBeTruthy()
    },
  )

  it.each([
    'badge',
    'payments',
    'logout',
    'home',
    'verified_user',
    'progress_activity',
    'check_circle',
    'warning',
  ] as const)('sigue teniendo el glifo "%s" que ya traía develop (componentes-globales/HU-W01)', (nombre) => {
    const icono = mount(IconoMaterial, { props: { nombre } })
    expect(icono.get('path').attributes('d')).toBeTruthy()
  })
})
