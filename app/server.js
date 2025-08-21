const express = require("express");
const path = require("path");

require("dotenv").config();

const app = express();
const port = process.env.APP_PORT;

// Servir archivos estáticos desde la carpeta "public"
app.use(express.static(path.join(__dirname, "public")));

// Ruta explícita para "/login" que sirve "login.html"
app.get("/index", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/profile", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "profile.html"));
});

app.get("/qr", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "usedqr.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/forgotpassword", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "forgotpassword.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "signup.html"));
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`App is running on http://localhost:${port}`);
});
