import { toggleMenu, openModal, closeModal } from './scripts.js';

document.addEventListener("DOMContentLoaded", () => {
  // 1. Menú hamburguesa
  document.getElementById('hamburger').addEventListener('click', () => {
    toggleMenu();
  });

  // 2. Modal de imagen (similar al index)
  document.querySelector('.img-container').addEventListener('click', () => {
    openModal('.img-container', 'imageModal', 'modalImage', '.profile-container');
  });
  document.getElementById('imageModal').addEventListener('click', () => {
    closeModal('imageModal', '.profile-container');
  });

  // 3. Lógica de perfil
  const auth = JSON.parse(localStorage.getItem("auth"));
  if (!auth || !auth.userData) {
    window.location.href = "login.html";
    return;
  }

  const user = auth.userData;

  // Referencias a campos del formulario
  const nameInput = document.getElementById("name");
  const lastnameInput = document.getElementById("lastname");
  const roleInput = document.getElementById("role");
  const carreraInput = document.getElementById("detail");
  const facultadInput = document.getElementById("university");
  const promocionInput = document.getElementById("enrollment");
  const nationalityInput = document.getElementById("nationality");
  const idInput = document.getElementById("id");
  const editButton = document.getElementById("editButton");
  const saveButton = document.getElementById("saveButton");

  // Rellenar los campos
  nameInput.value = user.name || "";
  lastnameInput.value = user.lastname || "";
  roleInput.value = user.role || "";
  carreraInput.value = user.data?.detail || "";
  facultadInput.value = user.data?.university || "";
  promocionInput.value = user.data?.enrollment || "";
  nationalityInput.value = user.nationality || "";
  idInput.value = user.id || "";

  // Botón "Editar"
  editButton.addEventListener("click", () => {
    toggleFormFields(false);
    editButton.style.display = "none";
    saveButton.style.display = "inline-block";
  });

  // Botón "Guardar"
  saveButton.addEventListener("click", () => {
    // Actualiza en localStorage
    const updatedUser = {
      ...user,
      name: nameInput.value,
      lastname: lastnameInput.value,
      role: roleInput.value,
      nationality: nationalityInput.value,
      id: idInput.value,
      data: {
        ...user.data,
        carrera: carreraInput.value,
        facultad: facultadInput.value,
        promocion: promocionInput.value
      }
    };
    auth.userData = updatedUser;
    localStorage.setItem("auth", JSON.stringify(auth));

    toggleFormFields(true);
    editButton.style.display = "inline-block";
    saveButton.style.display = "none";
  });

  function toggleFormFields(disabled) {
    nameInput.disabled = disabled;
    lastnameInput.disabled = disabled;
    roleInput.disabled = disabled;
    carreraInput.disabled = disabled;
    facultadInput.disabled = disabled;
    promocionInput.disabled = disabled;
    nationalityInput.disabled = disabled;
    idInput.disabled = disabled;
  }
});
