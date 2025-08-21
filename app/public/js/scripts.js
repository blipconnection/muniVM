document.addEventListener("DOMContentLoaded", () => {
  const profilePhoto = document.getElementById("profilePhoto");
  const savedPhotoUrl = localStorage.getItem("profilePhoto");
  profilePhoto.src = savedPhotoUrl;

});

// 1. Menú hamburguesa
export function toggleMenu() {
  const menu = document.getElementById('menu');
  const hamburger = document.getElementById('hamburger');
  menu.classList.toggle('active');
  hamburger.classList.toggle('open');
  hamburger.textContent = hamburger.classList.contains('open') ? '✖' : '☰';
}

// 2. Modal para imágenes
export function openModal(imgContainerSelector, modalSelector, modalImgSelector, blurSelector) {
  const modal = document.getElementById(modalSelector);
  const img = document.querySelector(imgContainerSelector + " img");
  const modalImg = document.getElementById(modalImgSelector);

  modal.style.display = "block";
  modalImg.src = img.src;

  // Aplica el efecto de difuminado (si existe ese contenedor)
  if (blurSelector) {
    document.querySelector(blurSelector)?.classList.add("blur-background");
  }
}

export function closeModal(modalSelector, blurSelector) {
  const modal = document.getElementById(modalSelector);
  modal.style.display = "none";

  if (blurSelector) {
    document.querySelector(blurSelector)?.classList.remove("blur-background");
  }
}
