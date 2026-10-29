const mongoose = require("mongoose");
require("dotenv").config();

const Pet = require("./models/Pet");

const pets = [
  {
    name: "Buddy",
    type: "Dog",
    age: "2 years",
    location: "Vijayawada",
    image: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=600",
    description: "Friendly and playful dog looking for a loving family."
  },
  {
    name: "Luna",
    type: "Cat",
    age: "1 year",
    location: "Guntur",
    image: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=600",
    description: "Calm and affectionate cat who loves attention."
  },
  {
    name: "Max",
    type: "Dog",
    age: "3 years",
    location: "Hyderabad",
    image: "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=600",
    description: "Active and energetic dog who loves playing outdoors."
  },
  {
    name: "Milo",
    type: "Cat",
    age: "2 years",
    location: "Vijayawada",
    image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600",
    description: "Sweet and gentle cat suitable for a caring home."
  },
  {
    name: "Coco",
    type: "Dog",
    age: "1.5 years",
    location: "Amaravati",
    image: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600",
    description: "Cute and friendly dog who enjoys being around people."
  },
  {
    name: "Snowy",
    type: "Rabbit",
    age: "1 year",
    location: "Guntur",
    image: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=600",
    description: "Quiet and adorable rabbit looking for a safe home."
  }
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Connected!");

    await Pet.deleteMany();

    await Pet.insertMany(pets);

    console.log("6 pets added successfully!");

    await mongoose.connection.close();

    console.log("Database connection closed.");
  } catch (error) {
    console.error("Error:", error.message);
  }
}

seedDatabase();