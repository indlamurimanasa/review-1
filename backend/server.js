const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const Pet = require("./models/Pet");
const Adoption = require("./models/Adoption");
const User = require("./models/User");

const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from .env");
}

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
}

function requireUser(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/, "");
    if (!token) {
      return res.status(401).json({ message: "Please login first." });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "user") {
      return res.status(403).json({ message: "User access required." });
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({
      message: "Your session expired. Please login again."
    });
  }
}

function requireAdmin(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/, "");
    if (!token) {
      return res.status(401).json({ message: "Please login as admin." });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Admin access required." });
    }

    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({
      message: "Admin session expired. Please login again."
    });
  }
}

app.get("/", (req, res) => {
  res.send("PawPal API is running!");
});

// USER SIGN UP
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message: "Please fill in all fields."
      });
    }

    if (name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({
        message: "Name must be between 2 and 100 characters."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters."
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists. Please login."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword
    });

    res.status(201).json({
      message: "Account created successfully! Please login."
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This email is already registered. Please login."
      });
    }

    console.error("Signup error:", error);
    res.status(500).json({ message: "Unable to create account." });
  }
});

// USER LOGIN
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: "Please enter your email and password."
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const token = createToken({
      id: user._id.toString(),
      role: "user"
    });

    res.json({
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("User login error:", error);
    res.status(500).json({ message: "Unable to login." });
  }
});

// Verify saved user session
app.get("/api/auth/me", requireUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("name email");

    if (!user) {
      return res.status(401).json({ message: "Account not found." });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to verify account." });
  }
});

// ADMIN LOGIN
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (
    !process.env.ADMIN_USERNAME ||
    !process.env.ADMIN_PASSWORD ||
    username !== process.env.ADMIN_USERNAME ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({
      message: "Invalid admin username or password."
    });
  }

  const token = createToken({
    id: crypto.randomUUID(),
    role: "admin"
  });

  res.json({ message: "Admin login successful!", token });
});

// PUBLIC PET LIST
app.get("/api/pets", async (req, res) => {
  try {
    const pets = await Pet.find();
    res.json(pets);
  } catch (error) {
    console.error("Fetch pets error:", error);
    res.status(500).json({ message: "Unable to fetch pets." });
  }
});

// ADD PET (ADMIN ONLY)
app.post("/api/pets", requireAdmin, async (req, res) => {
  try {
    const pet = await Pet.create(req.body);
    res.status(201).json(pet);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// SUBMIT ADOPTION REQUEST (LOGGED-IN USER)
app.post("/api/adoptions", requireUser, async (req, res) => {
  try {
    const { petId, fullName, email, reason } = req.body;

    if (!petId || !fullName?.trim() || !email?.trim() || !reason?.trim()) {
      return res.status(400).json({
        message: "Please fill in all required fields."
      });
    }

    if (!mongoose.isValidObjectId(petId)) {
      return res.status(400).json({ message: "Invalid pet ID." });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: "Please enter a valid email." });
    }

    const pet = await Pet.findById(petId);

    if (!pet) {
      return res.status(404).json({ message: "Pet not found." });
    }

    if (pet.adopted) {
      return res.status(400).json({
        message: "This pet is no longer available."
      });
    }

    const adoption = await Adoption.create({
      pet: pet._id,
      petName: pet.name,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      reason: reason.trim()
    });

    res.status(201).json({
      message: "Adoption request submitted successfully!",
      adoption
    });
  } catch (error) {
    console.error("Adoption request error:", error);
    res.status(500).json({
      message: "Unable to submit the request. Please try again."
    });
  }
});

// VIEW ADOPTION REQUESTS (ADMIN ONLY)
app.get("/api/adoptions", requireAdmin, async (req, res) => {
  try {
    const adoptions = await Adoption.find().sort({ createdAt: -1 });
    res.json(adoptions);
  } catch (error) {
    console.error("Fetch adoptions error:", error);
    res.status(500).json({
      message: "Unable to fetch adoption requests."
    });
  }
});

// UPDATE ADOPTION STATUS (ADMIN ONLY)
app.patch("/api/adoptions/:id", requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["Pending", "Approved", "Rejected"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid adoption status." });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid adoption request ID."
      });
    }

    const adoption = await Adoption.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!adoption) {
      return res.status(404).json({
        message: "Adoption request not found."
      });
    }

    res.json({
      message: "Status updated successfully!",
      adoption
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ message: "Unable to update status." });
  }
});

// START SERVER
async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected!");

    const port = process.env.PORT || 5000;

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

startServer();