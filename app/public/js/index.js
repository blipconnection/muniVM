import { toggleMenu, openModal, closeModal } from './scripts.js';

function generateQRCode(link) {
  const qr = qrcode(0, 'L');
  qr.addData(link);
  qr.make();
  document.getElementById('qrcode').innerHTML = qr.createImgTag(5);
}

async function generateDynamicQRCode(token) {
  try {
    const response = await fetch("http://localhost:3001/api/generate-qr", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (data.status === "success") {
      generateQRCode(data.downloadUrl);
    } else {
      console.error("Error generando QR:", data);
    }
  } catch (error) {
    console.error("Error generando QR dinámico:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // 1. Menú hamburguesa

  const profilePhoto = document.getElementById("profilePhoto");
  const savedPhotoUrl = localStorage.getItem("profilePhoto");
  profilePhoto.src = savedPhotoUrl

  document.getElementById('hamburger').addEventListener('click', () => {
    toggleMenu();
  });

  // 2. Modal de imagen
  document.querySelector('.img-container').addEventListener('click', () => {
    openModal('.img-container', 'imageModal', 'modalImage', '.credencial-container');
  });
  document.getElementById('imageModal').addEventListener('click', () => {
    closeModal('imageModal', '.credencial-container');
  });

  const editPhotoButton = document.getElementById("editPhotoButton");
  const profilePhotoInput = document.getElementById("profilePhotoInput");
  if (editPhotoButton) {
    editPhotoButton.addEventListener("click", (event) => {
      event.stopPropagation();
      profilePhotoInput.click();
      console.log("Cambiar foto (una sola vez)");
    });
  }

  // 3. Lógica de usuario y QR
  const auth = JSON.parse(localStorage.getItem("auth"));
  if (!auth || !auth.token) {
    console.error("No hay token de autenticación");
    window.location.href = "login.html";
    return;
  }

  const { userData, token } = auth;
  const user = userData || {};


  profilePhotoInput.addEventListener("change", async () => {
    console.log(user);
    
const {user_id} = user

    
    if (profilePhotoInput.files && profilePhotoInput.files[0]) {
      const file = profilePhotoInput.files[0];
      const formData = new FormData();
      // 'photo' es el nombre del campo que usaremos en Multer
      formData.append("photo", file);


     

      formData.set("user_id", user_id)
     
     
     try {
       // Ajusta la URL según la ruta que configures en el backend

  
       const response = await fetch("http://localhost:3001/api/set-photo", {
         method: "POST",
         headers: {
           Authorization: `Bearer ${token}`  // Aquí se envía el token
          },
       
          body: formData
        });
  
        const data = await response.json();
     
        
        if (response.status === 200) {
          try {
            const response = await fetch(`http://localhost:3001/api/get-photo/${user_id}`, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,  // Aquí se envía el token
              },
            });
        
            if (response.status === 200) {
              const imageBlob = await response.blob(); // Convertir la respuesta en un Blob
        
              // Crear una URL de objeto a partir del Blob
              const imageUrl = URL.createObjectURL(imageBlob);
        
              // Actualiza la imagen de perfil con la nueva URL de la imagen
              document.getElementById("profilePhoto").src = imageUrl;
        
              console.log("Foto obtenida con éxito:", imageUrl);
            } else {
              console.error("Error al obtener la foto:", response.statusText);
            }
          } catch (error) {
            console.error("Error en la petición:", error);
          }
        }
         else {
          console.error("Error al subir la foto:", data.message);
        }
      } catch (error) {
        console.error("Error en la petición:", error);
      }
    }
  });

  // Generar QR
  generateDynamicQRCode(token);

  const formatter = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric'
  });
  const year = formatter.format(new Date());

  // Asignar datos al HTML
  document.getElementById("name").textContent = `${user.name} ${user.lastname}`;
  document.getElementById("detail").textContent = user.data?.detail || "";
  document.getElementById("university").textContent = user.data?.university || "";
  document.getElementById("role").innerHTML = `<strong>${user.role}</strong> ${year}, ${user.nationality}`;
  document.getElementById("expire").innerHTML = `VTO: ${user.data?.verifier?.expire || ''}`;

   // Formateo de CUIL o Pasaporte
   const user_id = document.getElementById("id");
   function formatCUIL(cuil) {
     if (cuil.length === 11) {
       return `CUIL: ${cuil.substring(0, 2)}-${cuil.substring(2, 10)}-${cuil.substring(10)}`;
     }
     return `DNI: ${cuil}`;
   }
 
 const nationality = (user.nationality || "").toLowerCase();
 const isArgentina = (nationality === "argentina" || nationality === "arg");
 
 const identificador = isArgentina
   ? `${formatCUIL(user.id)}`
   : `PASAPORTE N°: ${user.id}`;
 
 user_id.innerHTML = `<strong>${identificador}</strong>`;
});
