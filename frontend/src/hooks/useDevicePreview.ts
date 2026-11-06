/**
 * La app es responsive y se adapta sola al ancho de la pantalla (celular, tablet o PC).
 * Solo para presentaciones: `?vista=telefono` en la URL dibuja la app dentro de un marco de celular.
 * No se guarda: al quitar el parámetro vuelve la vista normal.
 */
const framed = new URLSearchParams(location.search).get('vista') === 'telefono'

// Limpia la preferencia que guardaba el antiguo botón "Vista teléfono", para que nadie quede dentro del marco
try {
  localStorage.removeItem('paty-device-preview')
} catch {
  /* almacenamiento bloqueado: no hay nada que limpiar */
}

export function useDevicePreview() {
  return { framed }
}
