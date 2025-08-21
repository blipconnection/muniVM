import { isTokenValid } from "../js/auth.js";

export function notAuthenticated() {
  const auth = localStorage.getItem("auth");

  // Obtener la página actual sin parámetros de URL
  const currentPage = window.location.pathname;

  // Permitir acceso libre a login.html y signup.html
  if (currentPage === "/login" || currentPage === "/signup") {
    return;
  }

  // Si el usuario no tiene sesión válida, redirigirlo a login
  if (!auth || !isTokenValid(auth)) {
    window.location.href = "/login";
  }
}
