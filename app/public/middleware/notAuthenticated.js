import { isTokenValid } from "../js/auth.js";

export function alreadyAuthenticated() {
  const auth = localStorage.getItem("auth");
  
  if (auth && isTokenValid(auth)) {
    window.location.href = "/";
  }
}
  