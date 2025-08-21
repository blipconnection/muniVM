const express = require("express");
const router = express.Router();
const multer = require("multer")
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { checkAuth } = require("../middlewares/authentication.js");

const User = require("../models/user.js");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "credencialdigital@upc.edu.ar", // Cambia esto por tu email
    pass: "wsbqrdmgapenxgmb", // Usa variables de entorno para mayor seguridad
  },
});

router.post("/set-photo", upload.single("photo"), async (req, res) => {
  try {
    
    const { user_id } = req.body; // Email del usuario para identificarlo

    const file = req.file; // Archivo de imagen recibido

    console.log("Archivo recibido:", file); // Agregar este log para ver si el archivo es recibido

    if (!file) {
      return res.status(400).json({ message: "No se ha subido ninguna imagen" });
    }
    const user = await User.findOne({ _id: user_id });
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    if(user.profileImage) {
      return res.status(400).json({ message: "El usuario ya tiene una foto" });
    }
    // Convertir la imagen en Buffer y actualizar el usuario en MongoDB
    const updatedUser = await User.findOneAndUpdate(
      { _id: user_id },
      { profileImage: file.buffer, imageType: file.mimetype },
      { new: true }
    );
    console.log(updatedUser);
    

    if (!updatedUser) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.status(200).json({ message: "Imagen guardada correctamente" });
  } catch (error) {
    console.error("Error al procesar la imagen", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});


router.get("/get-photo/:_id", async (req, res) => {
  try {
    const { _id } = req.params;

    const user = await User.findOne({ _id });

    if (!user || !user.profileImage) {
      return res.status(404).json({ message: "Imagen no encontrada" });
    };
    
    // Configurar los headers para mostrar la imagen
    res.set("Content-Type", user.imageType);
    res.send(user.profileImage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.post("/forgot-password", async (req, res) => {
  const { cuit_dni } = req.body;
  try {
    const user = await User.findOne({ id: cuit_dni });
    if (!user) {
      return res.status(404).json({ message: "No se puede recuperar la contraseña" });
    }
    
    if(user.email.split('@')[1] !== 'upc.edu.ar') {
      return res.status(403).json({ message: "Contacte a credencialdigital@upc.edu.ar para que le asignen un correo institucional" });
    }

    const mailOptions = {
      from: "credencialdigital@upc.edu.ar",
      to: user.email,
      subject: "Recuperación de contraseña",
      html: `
        <h3>Recuperación de contraseña</h3>
        <p>Su usuario es: ${user.email}</p>
        <p>Su contraseña es: ${user.id}</p>
        <p>Inicia sesión en: credencialdigital.upc.edu.ar</p>

      `,
    };    

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: `Hemos enviado sus credenciales al correo: ${user.email.split('@')[0].slice(0,3)}...@${user.email.split('@')[1]}`  });
  } catch (error) {
    console.error("Error al enviar el correo de verificación", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/////////////////////////////////////////////////////////////////////////////////////////////////////


// Ruta de login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {

    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ message: "Usuario o contraseña incorrectos" });
    }

    if (user.verificationToken != null) {
      console.log("Verificar usuario");
      return res.status(403).json({ message: "Debes verificar tu correo antes de iniciar sesión." });
    }
    console.log(user.data.verifier.expire);
    
    // Verificar si el certificado ha expirado
    const expireDate = user.data.verifier.expire;
    const [day, month, year] = expireDate.split('/');
    const expirationDate = new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day));
    const currentDate = new Date('2025-03-13T15:53:01-05:00');

    if (currentDate >= expirationDate) {
      console.log('Certificado expirado:', { expirationDate, currentDate });
      return res.status(403).json({ message: "Su credencial ha expirado, contacte a credencialdigital@upc.edu.ar." });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Usuario o contraseña incorrectos" });
    }

    const token = jwt.sign(
      { userData: {user_id: user._id, name: user.name, lastname: user.lastname, nationality: user.nationality, id: user.id, role: user.role, status: user.status, data: user.data}},
      process.env.JWT_SECRET, // Clave secreta almacenada en .env
      { expiresIn: "15m" } // Tiempo de expiración del token
    );

    const response = {
      status: "success",
      token: token,
      userData: { user_id: user._id, name: user.name, lastname: user.lastname, nationality: user.nationality, id: user.id, role: user.role, status: user.status, data: user.data } // datos del usuario sin encriptar para utilizar en el front
    };

    console.log("TOKEN GENERADO: " + token);
    console.log("Clave secreta en generación:", process.env.JWT_SECRET);

    console.log("Enviando respuesta: " + JSON.stringify(response))

    // Responde con el token
    res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.post("/signup", async (req, res) => {
  const { name,lastname,id_type,id_input,country,email,birthdate_api,password, facultad, carrera, yearIngreso } = req.body;

  console.log(name,lastname,id_type,id_input,country,email,birthdate_api,password, facultad, carrera, yearIngreso);

  try {

    const user = await User.findOne({ email });
  
    
    if (!user) {

        const encryptedPassword = bcrypt.hashSync(password, 10);
        const verificationToken = crypto.randomBytes(32).toString("hex");

        let data = {
          university: facultad,
          detail: carrera,
          enrollment: yearIngreso,
          verifier: {
            expire: "1/02/26",
            document: "Certificado de alumno regular",
            link: "https://drive.google.com/file/d/ID_UNICO_PERSONA/view",
            token: null,    
            used: false 
          }
        };
  
        const newUser = {
          name: name,
          lastname: lastname,
          id: id_input,
          nationality: country,
          email: email,
          password: encryptedPassword,
          role: "Estudiante",
          status: false,
          data: null,
          verificationToken: verificationToken
        };
  
        let user = await User.create(newUser);
        
        console.log("Usuario creado");

        const verificationLink = `http://localhost:3001/api/verify-email?token=${verificationToken}`;

        const mailOptions = {
          from: "<noreply@myserver.com>",
          to: email,
          subject: "Verifica tu correo electrónico",
          html: `
            <h3>Bienvenido a UPC</h3>
            <p>Haz clic en el siguiente enlace para verificar tu cuenta:</p>
            <a href="${verificationLink}">Verificar mi cuenta</a>
            http://localhost:3001/api/verify-email?token=${verificationToken}
            <p>Si no solicitaste esta verificación, ignora este mensaje.</p>
          `,
        };
  
        await transporter.sendMail(mailOptions);
  
      
    }

    const response = {
      status: "success",
      user: email
    };

    // Responde con el token
    res.status(200).json(response);

    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;

    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({ message: "Token inválido o expirado." });
    }

    // Activar cuenta
    user.status = true;
    user.verificationToken = null; // Eliminar el token después de la validación

    await user.save();

    res.redirect("http://localhost:3000/login"); // Redirigir al login después de activar la cuenta
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al verificar el correo." });
  }
});


router.get("/updatestatus", checkAuth, async (req, res) => {
  try {

    const response = {
      status: "success"
    };

    return res.json(response);


  } catch (error) {
    console.log(error);
  }
});

// Ruta GET protegida
router.get("/authentication", checkAuth, (req, res) => {
  res.status(200).json({
    message: "Token válido",
    user: req.userData, // Datos del token decodificado
  });
});

// Ruta POST protegida
router.post("/protected-post", checkAuth, (req, res) => {
  res.status(200).json({
    message: "POST: Ruta protegida accesible",
    data: req.body, // Datos enviados en el cuerpo de la solicitud
    user: req.userData,
  });
});

// Ruta PUT protegida
router.put("/protected-put", checkAuth, (req, res) => {
  res.status(200).json({
    message: "PUT: Ruta protegida accesible",
    data: req.body, // Datos enviados en el cuerpo de la solicitud
    user: req.userData,
  });
});

// Ruta DELETE protegida
router.delete("/protected-delete", checkAuth, (req, res) => {
  res.status(200).json({
    message: "DELETE: Ruta protegida accesible",
    user: req.userData,
  });
});


module.exports = router;



global.check_admin_user = async function checkAdminUser() {

    try {
  
      const admin_users = await User.find({ email: 'sistemas@upc.edu.ar' });
  
      //if no email
      if (admin_users.length > 0) {
        return console.log("Usuario administrador ya ha sido creado");
      }
      else {
  
        const password = "ad";
        const encryptedPassword = bcrypt.hashSync(password, 10);

        let data = {
          university: "UPC",
          detail: "Sistemas",
          enrollment: "01/02/24",
          verifier: {
            expire: "01/02/25",
            document: "Autorización sistemas",
            link: "https://drive.google.com/file/d/ID_UNICO_PERSONA/view",
            token: null,    
            used: false  
          }
        };
  
        const newUser = {
          name: "Usuario",
          lastname: "Administrador",
          id: "00000000000",
          nationality: "Argentina",
          email: "admin@vm.gob.ar",
          password: encryptedPassword,
          role: "vm",
          status: true,
          data: data,
          verificationToken: null
        };
  
        let user = await User.create(newUser);
        console.log("Usuario administrador creado");
      }
  
    } catch (error) {
      console.log("ERROR REGISTER USER ADMIN");
      console.log(error);
    }
  
  }

  global.check_test_users = async function checkTestUsers() {
    try {
      const password = "ad";
      const encryptedPassword = bcrypt.hashSync(password, 10);
  
      // 1. Definimos un array con todos los usuarios de prueba
      const testUsers = [
        {
          name: "Julieta",
          lastname: "Stone",
          id: "11111111111",
          nationality: "Argentina",
          email: "docente@upc.edu.ar",
          password: encryptedPassword,
          role: "Docente",
          status: true,
          data: {
            university: "Facultad de Turismo y Ambiente",
            detail: null,
            enrollment: "01/02/24",
            verifier: {
              expire: "01/02/25",
              document: "Autorización docente",
              link: "https://drive.google.com/file/d/ID_UNICO_PERSONA/view",
              token: null,    
              used: false 
            }
          },
          verificationToken: null
        },
        {
          name: "Franco",
          lastname: "Silver",
          id: "22222222222",
          nationality: "Argentina",
          email: "nodocente@upc.edu.ar",
          password: encryptedPassword,
          role: "No docente",
          status: true,
          data: {
            university: "Facultad de Arte y Diseño",
            detail: null,
            enrollment: "01/02/24",
            verifier: {
              expire: "01/02/25",
              document: "Autorización no docente",
              link: "https://drive.google.com/file/d/ID_UNICO_PERSONA/view",
              token: null,    
              used: false 
            }
          },
          verificationToken: null
        },
        {
          name: "Ernesto",
          lastname: "Pérez",
          id: "33333333333",
          nationality: "Argentina",
          email: "alumno@upc.edu.ar",
          password: encryptedPassword,
          role: "Estudiante",
          status: true,
          data: {
            university: "Facultad de Educación y Salud",
            detail: "Lic. en Administración",
            enrollment: "01/02/24",
            verifier: {
              expire: "01/02/25",
              document: "Certificado de alumno regular",
              link: "https://drive.google.com/file/d/ID_UNICO_PERSONA/view",
              token: null,    
              used: false 
            }
          },
          verificationToken: null
        },
        {
          name: "Camila",
          lastname: "Smith",
          id: "PS385647AN",
          nationality: "España",
          email: "student@upc.edu.ar",
          password: encryptedPassword,
          role: "Estudiante",
          status: true,
          data: {
            university: "Facultad de Arte y Diseño",
            detail: "Lic. en Diseño Gráfico",
            enrollment: "01/02/24",
            verifier: {
              expire: "01/02/25",
              document: "Certificado de alumno regular",
              link: "https://drive.google.com/file/d/ID_UNICO_PERSONA/view",
              token: null,    
              used: false 
            }
          },
          verificationToken: null
        },
        {
          name: "Martina",
          lastname: "Philips",
          id: "44444444444",
          nationality: "Argentina",
          email: "egresado@upc.edu.ar",
          password: encryptedPassword,
          role: "Egresado",
          status: true,
          data: {
            university: "Facultad de Arte y Diseño",
            detail: "Lic. en pinturas",
            enrollment: "01/02/20",
            verifier: {
              expire: "01/02/25",
              document: "Certificado de egreso",
              link: "https://drive.google.com/file/d/ID_UNICO_PERSONA/view",
              token: null,    
              used: false 
            }
          },
          verificationToken: null
        }
      ];
  
      // 2. Obtenemos todos los emails de los usuarios de prueba
      const testUserEmails = testUsers.map(u => u.email);
  
      // 3. Hacemos una sola consulta para saber qué usuarios ya existen
      const existingUsers = await User.find({ email: { $in: testUserEmails } });
  
      // 4. Creamos los usuarios que NO estén en la lista de existentes
      for (const candidate of testUsers) {
        const alreadyExists = existingUsers.find(u => u.email === candidate.email);
  
        if (alreadyExists) {
          console.log(`El usuario de prueba con email "${candidate.email}" ya existe.`);
        } else {
          await User.create(candidate);
          console.log(`El usuario de prueba con email "${candidate.email}" ha sido creado.`);
        }
      }
  
    } catch (error) {
      console.log("ERROR AL REGISTRAR USUARIOS DE PRUEBA");
      console.log(error);
    }
  };
  
  

module.exports = router;  