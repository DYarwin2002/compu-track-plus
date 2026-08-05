/** Traduce los errores de autenticación a mensajes claros para el modal. */
export function authErrorMessage(raw: string): { title: string; description: string } {
  const m = raw.toLowerCase();
  if (m.includes("invalid login credentials"))
    return {
      title: "Credenciales incorrectas",
      description: "El correo o la contraseña no son válidos. Verifícalos e intenta nuevamente.",
    };
  if (m.includes("email not confirmed"))
    return {
      title: "Correo sin confirmar",
      description: "Debes confirmar tu correo antes de ingresar. Revisa tu bandeja de entrada.",
    };
  if (m.includes("too many") || m.includes("rate limit"))
    return {
      title: "Demasiados intentos",
      description: "Has intentado ingresar muchas veces. Espera unos minutos y vuelve a probar.",
    };
  if (m.includes("network") || m.includes("fetch"))
    return {
      title: "Sin conexión",
      description: "No pudimos conectar con el servidor. Revisa tu internet e intenta otra vez.",
    };
  return { title: "No se pudo iniciar sesión", description: raw };
}