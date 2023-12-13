const express = require("express");
const fileUpload = require("express-fileupload");
const bodyParser = require("body-parser");
const multer = require("multer");
const pino = require("pino");
const expressPino = require("express-pino-logger");
var cors = require("cors");
const {
  createSoloParentAccount,
  readSoloParentDataById,
  deleteSoloParentData,
  updateSoloParentData,
  readAllSoloParentData,
  userLogin,
} = require("./api");

const logger = pino();
const expressLogger = expressPino({ logger });

// Define storage for multer on disk
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Set the destination folder for uploaded files
    cb(null, path.join(__dirname, "uploads")); // Adjust the folder path as needed
  },
  filename: function (req, file, cb) {
    // Set the filename for uploaded files
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const { Pool } = require("pg");
const upload = multer({ storage: storage });

const PORT = 3001;
const app = express();
app.use(expressLogger);
app.use(cors());
app.use(fileUpload());
app.use(bodyParser.json());

//Index Page
app.get("/", (req, res) => {
  res.send("Force sent");
});

// app.use("/api", (req, res, next) => {
//   //middleware
// });

// Endpoint to create a user account

// Middleware for handling file uploads
// app.use("/api/create-solo-parent-account", (req, res, next) => {
//   if (!req.files || Object.keys(req.files).length === 0) {
//     return res.status(400).send("No files were uploaded.");
//   }
//   next();
// });

app.post("/api/create-solo-parent-account", createSoloParentAccount);

//Note: Finalize ko pa yung upload file na field. di ko pa alam nangyayari dito haha
// upload.fields([
//   { name: "voters", maxCount: 1 },
//   { name: "barangayCert", maxCount: 1 },
//   { name: "certOfEmployment", maxCount: 1 },
//   { name: "paySlip", maxCount: 1 },
//   { name: "nonFillingtr", maxCount: 1 },
//   { name: "businessPermit", maxCount: 1 },
//   { name: "affSoloParent", maxCount: 5 },
//   { name: "pbcc", maxCount: 1 },
//   { name: "pwdid", maxCount: 1 },
//   { name: "deathcert", maxCount: 1 },
//   { name: "picture", maxCount: 1 },
// ]),

//Endpoint for getting user data by ID
app.get("/api/read-solo-parent-account/:userId", async (req, res, next) => {
  const userId = req.params.userId;

  try {
    const userData = await readSoloParentDataById(userId);

    if (!userData) {
      res.status(404).send("User not found");
      return;
    }

    res.json(userData);
  } catch (error) {
    next(error);
  }
});

// Endpoint to read all user data
app.get("/api/read-all-solo-parent-data", async (req, res, next) => {
  try {
    const allData = await readAllSoloParentData();
    res.json(allData);
  } catch (error) {
    next(error);
  }
});

// Endpoint to delete user data by ID
app.delete(
  "/api/delete-solo-parent-account/:userId",
  async (req, res, next) => {
    const userId = req.params.userId;

    try {
      const deleted = await deleteSoloParentData(userId);
      if (!deleted) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ message: "User data deleted successfully" });
    } catch (error) {
      console.error("Error deleting user data:", error);
      res.status(500).send("Internal Server Error");
      next(error);
    }
  }
);

// Endpoint to update user data
app.put("/api/update-solo-parent-account/:userId", async (req, res, next) => {
  const userId = req.params.userId;
  const updatedData = req.body; // Updated data should be sent in the request body

  try {
    const success = await updateSoloParentData(userId, updatedData);
    if (success) {
      res.sendStatus(200); // Send a success response
    } else {
      res.status(500).send("Failed to update user data"); // Send an error response
    }
  } catch (error) {
    next(error);
  }
});

//Login
app.post("/api/login", userLogin);

app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
  console.log(`Server is running at http://localhost:${PORT}`);
});
