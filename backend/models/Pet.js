const mongoose = require("mongoose");

const petSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  age: String,
  location: String,
  image: String,
  description: String,
  adopted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Pet", petSchema);