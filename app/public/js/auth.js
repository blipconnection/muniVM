export async function Tokenvalidation() {

  const token = JSON.parse(localStorage.getItem("auth")).token;

  try {
    const response = await fetch("http://localhost:3001/api/authentication", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`, // Incluye el token en el header
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error("Token inválido o expirado. Redirigiendo al login...");
        localStorage.removeItem("auth"); // Elimina el token inválido
        localStorage.removeItem("profilePhoto"); // Elimina el token inválido
        window.location.href = "/login"; // Redirige al login
      }
      throw new Error("Error en la solicitud GET");
    }

    const data = await response.json();
    //console.log("GET Response:", data);
  } catch (error) {
    console.error("Error en GET:", error.message);
  }
}

function decodeBase64(str) {
  return decodeURIComponent(
    Array.prototype.map.call(atob(str), (c) =>
      "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
    ).join("")
  );
}

// Función para mostrar notificaciones flotantes
function showNotification(message, type = "error") {
  const container = document.getElementById("notification-container");

  // Crear la notificación
  const notification = document.createElement("div");
  notification.classList.add("notification");
  if (type === "success") notification.classList.add("success");

  notification.innerHTML = `
      <span>${message}</span>
      <button class="close-btn" onclick="this.parentElement.remove()">✖</button>
  `;

  container.appendChild(notification);

  // Ocultar la notificación después de 4 segundos
  setTimeout(() => {
      notification.style.animation = "fadeOut 0.5s ease-in-out";
      setTimeout(() => notification.remove(), 500);
  }, 4000);
}



export function isTokenValid(auth) {

  const token = JSON.parse(auth).token;
  const storeData = JSON.parse(auth).userData;

  try {
    const base64Url = token.split(".")[1];
    const base64 = decodeBase64(base64Url.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(base64);

    const now = Math.floor(Date.now() / 1000); // Tiempo actual en segundos

    if (payload.exp < now) {
      //console.log("El token ha expirado");
      return false;
    }

    if (JSON.stringify(storeData) !== JSON.stringify(payload.userData)) {
      //console.log("userData modificado");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error al verificar el token:", error);
    return false;
  }
}

// Manejar el cierre de sesión
  export function handleLogout() {
    const logoutButton = document.getElementById("logout");
    if (logoutButton) {
      logoutButton.addEventListener("click", () => {
        // Eliminar el token del almacenamiento local
        localStorage.removeItem("auth");
        localStorage.removeItem("profilePhoto");
        // Redirigir al login
        window.location.href = "/login";
      });
    }
  }


async function loginUser(email, password) {
  try {
    const response = await fetch("http://localhost:3001/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {

      if(data.message){
        showNotification(data.message);
        return;
      }
  
      if(response.status == 403){
        showNotification("Debes verificar tu correo antes de iniciar sesión.");
        return;
      }
      throw new Error("Login failed");
    }

    

  
    const auth = {
      token: data.token,
      userData: data.userData,
    };
 
   
    localStorage.setItem("auth", JSON.stringify(auth)); // Guarda el token
    showNotification("Inicio de sesión exitoso", "success");
    
    try {
      const response = await fetch(`http://localhost:3001/api/get-photo/${auth.userData.user_id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
        cache: 'no-store' // Evitar el caché del service worker
      });
  
      if (response.status === 200) {
        const imageBlob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          localStorage.setItem("profilePhoto", reader.result);
          // Esperar a que la imagen se guarde antes de redirigir
          setTimeout(() => {
            window.location.href = "/"; // Redirige al usuario autenticado
          }, 100);
        };
        reader.readAsDataURL(imageBlob);
      } else {
        console.error("Error al obtener la foto:", response.statusText);
        setTimeout(() => {
          window.location.href = "/"; // Redirige al usuario autenticado incluso si hay error
        }, 1000);
      }
    } catch (error) {
      console.error("Error al obtener la foto:", error);
      setTimeout(() => {
        window.location.href = "/"; // Redirige al usuario autenticado incluso si hay error
      }, 1000);
    }
  } catch (error) {
    console.error(error);
    showNotification("Credenciales incorrectas");
  }
}

async function signupUser(name,lastname,id_type,id_input, country, email,birthdate_api,password, facultad, carrera, yearIngreso) {
  try {

    const response = await fetch("http://localhost:3001/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name,lastname,id_type,id_input,country,email,birthdate_api,password, facultad, carrera, yearIngreso }),
    });

    const data = await response.json();

    if (data.status === "success") {
      // Ocultar formulario y mostrar mensaje de verificación
      document.getElementById("signupForm").style.display = "none";
      document.getElementById("successMessage").style.display = "block";
    }
   
  } catch (error) {
    console.error(error);
    showNotification("Error al registrar usuario");
  }
}


  
  export function handleLoginForm() {
    const loginForm = document.getElementById("loginForm");
  
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        loginUser(email,password)
  
      });
    }
  }
export function handleForgotPasswordForm() { 
  const forgotpasswordForm = document.getElementById("forgotPasswordForm");

  if (forgotpasswordForm) {
      forgotpasswordForm.addEventListener("submit", async (e) => {
          e.preventDefault();

          const cuit_dni = document.getElementById("cuit_dni").value;
          const form = document.getElementById("forgotPasswordForm");
          const resultMessage = document.getElementById("resultMessage");
          const returnToLogin = document.getElementById("returnToLogin");

          try {
              const response = await fetch("http://localhost:3001/api/forgot-password", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ cuit_dni }),
              });

              const data = await response.json();
              form.style.display = "none";

              if (response.ok) {

                  resultMessage.innerText = data.message;
                  resultMessage.style.display = "block";
              } else {
                  resultMessage.innerText = data.message;
                  resultMessage.style.display = "block";
              }
          } catch (error) {
              console.error(error);
              resultMessage.innerText = "Error al recuperar contraseña";
              resultMessage.style.display = "block";
          } finally {
              // Mostrar el enlace para volver a inicio de sesión en todos los casos después de la respuesta
              returnToLogin.style.display = "block";
          }
      });
  }

}
  export function handleSignupForm() {
    const signupForm = document.getElementById("signupForm");
  
    if (signupForm) {
      signupForm.addEventListener("submit", (e) => {
        e.preventDefault();
  
        // --- 1) OBTENER TODOS LOS VALORES ---
        const name = document.getElementById("name").value.trim();
        const lastname = document.getElementById("lastname").value.trim();
        const id_type = document.getElementById("idType").value; 
        const id_input = document.getElementById("cuil-passport").value.trim();
        const country = document.getElementById("country").value.trim();
  
        const day = document.getElementById("day").value;
        const month = document.getElementById("month").value;
        const year = document.getElementById("year").value;
  
        const facultad = document.getElementById("facultad").value;
        const carrera = document.getElementById("carrera").value.trim();
        const yearIngreso = document.getElementById("yearIngreso").value.trim();
  
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();
        const confirm_password = document.getElementById("confirm-password").value.trim();
  
        // --- 2) VERIFICAR CAMPOS VACÍOS ---
        if (!name || !lastname || !id_input || !country || !day || !month || !year || !facultad || !carrera || !yearIngreso || !email || !password || !confirm_password) {
          showNotification("Por favor, completa todos los campos requeridos");
          return; // Detiene el envío
        }
  
        // --- 3) VERIFICAR EDAD ---
        const birthdate_api = day + "/" + month + "/" + year;
        const birthdate = new Date(year, month - 1, day);
        const today = new Date();
        let age = today.getFullYear() - birthdate.getFullYear();
        const monthDiff = today.getMonth() - birthdate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
          age--;
        }
        if (age < 18) {
          ageError.style.display = "block";
          return;
        } else {
          ageError.style.display = "none";
        }
  
        // --- 4) VALIDAR CORREO INSTITUCIONAL ---
        if (email.split("@")[1] != "upc.edu.ar") {
          showNotification("Ingrese un correo institucional (@upc.edu.ar)");
          return;
        }
  
        // --- 5) VALIDAR CONTRASEÑAS COINCIDENTES ---
        if (password !== confirm_password) {
          showNotification("Las contraseñas no coinciden");
          return;
        }
  
        // --- 6) LLAMAR A signupUser SI TODO ESTÁ BIEN ---
        signupUser(name, lastname, id_type, id_input, country, email, birthdate_api, password, facultad, carrera, yearIngreso);
      });
    }
  }
  

  