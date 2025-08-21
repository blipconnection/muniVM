const jwt = require("jsonwebtoken");

const checkAuth = (req, res, next) => {

  console.log("Verificando permisos");

  // Extrae el token del header Authorization o del header personalizado `token`

  let token = req.get("token") || (() => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new Error("El header Authorization no está presente");
      }
  
      // Verificar que el header sigue el formato 'Bearer token'
      const [scheme, token] = authHeader.split(' ');
      if (scheme !== 'Bearer' || !token) {
        throw new Error("Formato del token no es correcto");
      }
  
      return token;
    } catch (error) {
      console.error("Error extrayendo el token:", error.message);
      return null;
    }
  })();  
  
  if (!token) {
    return res.status(401).json({
      status: "error",
      message: "Token no proporcionado",
    });
  }
  
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    
    if (err || decoded == null) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          status: "error",
          message: "El token ha expirado",
        });
      }

      return res.status(401).json({
        status: "error",
        message: "Token inválido",
      });
    }

    req.userData = decoded.userData; // Adjunta los datos decodificados al objeto req
    next(); // Continúa al siguiente middleware o controlador
  });
};

module.exports = { checkAuth };
