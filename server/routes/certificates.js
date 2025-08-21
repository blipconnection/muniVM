const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const plainAddPlaceholder = require("node-signpdf/dist/helpers/plainAddPlaceholder").default;
const { SignPdf } = require("node-signpdf");

const { checkAuth } = require("../middlewares/authentication");

router.get("/generate-qr", checkAuth, async (req, res) => {
  try {
    const userId = req.userData.user_id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Usuario no encontrado",
      });
    }
    const randomToken = crypto.randomBytes(16).toString("hex");
    user.data.verifier.token = randomToken;
    user.data.verifier.used = false;
    user.markModified("data");
    await user.save();
    const downloadUrl = `http://localhost:3001/api/download-pdf/${randomToken}`;
    return res.json({
      status: "success",
      downloadUrl,
    });
  } catch (error) {
    console.error("Error generando token de un solo uso:", error);
    return res.status(500).json({
      status: "error",
      message: "Error generando token de un solo uso",
    });
  }
});

router.get("/download-pdf/:token", async (req, res) => {
  try {
    // Validar token y marcarlo como usado
    const { token } = req.params;
    const user = await User.findOne({ "data.verifier.token": token });
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Este enlace no es válido o ya expiró.",
      });
    }
    if (user.data.verifier.used) {
      return res.redirect("http://localhost:3000/qr");
    }
    user.data.verifier.used = true;
    user.markModified("data");
    await user.save();

    // Crear el PDF con pdf-lib
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let id_name = "DNI";
    if (user.nationality !== "Argentina") {
      id_name = "PASAPORTE";
    }

    page.drawText("Constancia de Alumno Regular", {
      x: 170,
      y: 350,
      size: 16,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    page.drawText(
      `Se certifica que el/la estudiante ${user.name} ${user.lastname}, con ${id_name}: ${user.id},`,
      { x: 50, y: 320, size: 12, font: fontNormal }
    );
    page.drawText(
      `se encuentra registrado/a como alumno/a regular en la carrera de ${user.data.detail}.`,
      { x: 50, y: 300, size: 12, font: fontNormal }
    );
    page.drawText(
      `Esta constancia se emite a pedido del interesado/a para los fines que estime conveniente.`,
      { x: 50, y: 280, size: 12, font: fontNormal }
    );
    const fecha = new Date().toLocaleDateString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires"
    });
    page.drawText(`Fecha de emisión: ${fecha}`, {
      x: 50,
      y: 250,
      size: 12,
      font: fontNormal,
    });

    // Opcional: incluir imagen de firma y sello si existe
    const firmaSelloPath = path.join(__dirname, "../templates/firma_sello.png");
    if (fs.existsSync(firmaSelloPath)) {
      const firmaSelloBytes = fs.readFileSync(firmaSelloPath);
      const firmaSelloImage = await pdfDoc.embedPng(firmaSelloBytes);
      const firmaSelloDims = firmaSelloImage.scale(0.5);
      page.drawImage(firmaSelloImage, {
        x: 170,
        y: 110,
        width: firmaSelloDims.width,
        height: firmaSelloDims.height,
      });
    } else {
      console.error("❌ Archivo firma_sello.png no encontrado en:", firmaSelloPath);
    }

    page.drawText("______________________", { x: 200, y: 100, size: 12, font: fontNormal });
    page.drawText("Director de Carrera", { x: 230, y: 80, size: 12, font: fontNormal });

    // Guardar el PDF sin object streams para mayor compatibilidad con la firma
    const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
    let pdfBuffer = Buffer.from(pdfBytes);

    // Agregar placeholder para la firma
    pdfBuffer = plainAddPlaceholder({
      pdfBuffer,
      reason: "Firmado digitalmente por la UPC",
      signatureLength: 8192,
    });

    // Firmar el PDF usando el certificado (.p12)
    const p12Path = path.join(__dirname, "../templates/certificate.p12");
    const p12Buffer = fs.readFileSync(p12Path);
    const passphrase = "UPCi#lNw!ixGAkIj"; // Reemplaza con la contraseña de tu certificado

    const signer = new SignPdf();
    const signedPdfBuffer = signer.sign(pdfBuffer, p12Buffer, { passphrase });

    // Enviar el PDF firmado
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="constancia_alumno_regular.pdf"');
    res.setHeader("Content-Length", signedPdfBuffer.length);
    res.send(signedPdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al generar la constancia");
  }
});

module.exports = router;
