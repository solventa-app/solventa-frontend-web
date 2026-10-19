// Cerrar sesión con confirmación (G-04, Figma 2001:861): los homes y "Mi perfil" abren el modal en vez de
// cerrar de una; al confirmar se cierra la sesión y se vuelve al login.
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSesion } from './useSesion'

export function useCierreDeSesion() {
  const router = useRouter()
  const { cerrarSesion } = useSesion()
  const modalAbierto = ref(false)

  function pedirCierre() {
    modalAbierto.value = true
  }

  function cancelarCierre() {
    modalAbierto.value = false
  }

  function confirmarCierre() {
    modalAbierto.value = false
    cerrarSesion()
    router.push('/login')
  }

  return { modalAbierto, pedirCierre, cancelarCierre, confirmarCierre }
}
