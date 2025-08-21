const mongoose = require("mongoose"); // librería para utilizar mongo
const uniqueValidator = require("mongoose-unique-validator"); // se utiliza para generar datos unicos 

const Schema = mongoose.Schema; // se utiliza para contruir un esquema de mongoose para la base de datos

// se describe el objeto en formato json como se alamcenará en la base de datos
const userSchema = new Schema({
  name: { type: String, required: [true] },
  lastname: { type: String, required: [true] },
  id: { type: String, required: [true], unique: true },
  nationality: { type: String, required: [true] },
  email: { type: String, required: [true], unique: true },
  password: { type: String, required: [true] },
  role: { type: String, required: [true] },
  status: { type: Boolean, required: [true] },
  lastlogin: { type: String, default: "" },
  data: { type: Object, default: null },
  verificationToken: { type: String, default: null },
  profileImage: { type: Buffer }, 
  imageType: {type: String}
});

//Validator
userSchema.plugin(uniqueValidator, { message: 'Error, email/id already exists.' });


// convert to model
const User = mongoose.model('User', userSchema);

module.exports = User;