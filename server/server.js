// api.js
const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cors = require("cors");
const colors = require("colors");

require("dotenv").config();

const app = express();
const port = process.env.API_PORT;

// Middleware de Express
app.use(morgan("tiny"));
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true
  })
);
app.use(cors());

app.use("/api", require("./routes/users.js"));
app.use("/api", require("./routes/certificates.js"));

module.exports = app;

// Iniciar servidor de la API
app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});

// Conectar a MongoDB
const mongoUserName = process.env.MONGO_USERNAME;
const mongoPassword = process.env.MONGO_PASSWORD;
const mongoHost = process.env.MONGO_HOST;
const mongoPort = process.env.MONGO_PORT;
const mongoDatabase = process.env.MONGO_DATABASE;

const uri = `mongodb://${mongoUserName}:${mongoPassword}@${mongoHost}:${mongoPort}/${mongoDatabase}`;

const options = {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  authSource: "admin",
};

mongoose.connect(uri, options).then(
  () => {
    console.log("\n");
    console.log("*******************************".green);
    console.log("✔ Mongo Successfully Connected!".green);
    console.log("*******************************".green);
    console.log("\n");
    global.check_admin_user();
    //global.check_test_users();
    
  },
  (err) => {
    console.log("\n");
    console.log("*******************************".red);
    console.log("    Mongo Connection Failed    ".red);
    console.log("*******************************".red);
    console.log("\n");
    console.log(err);
  }
);
