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
  fetchUserTickets,
  createUserTickets,
  ticketNotif,
} = require("./api");

const logger = pino();
const expressLogger = expressPino({ logger });

const storage = multer.memoryStorage(); // Use memory storage to store files in memory
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const { Pool } = require("pg");

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

app.post("/api/upload", function (req, res) {
  console.log(req.files);
  res.json(req.files);
  res.send("UPLOADED!!!");
});

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

app.get("/api/solo-parent/tickets/:ticketNumber", async (req, res, next) => {
  const ticketNumber = req.params.ticketNumber;

  try {
    const userTickets = await fetchUserTickets(ticketNumber);

    if (!userTickets) {
      res.status(404).send("User not found");
      return;
    }

    res.json(userTickets);
  } catch (error) {
    next(error);
  }
});

app.post("/api/solo-parent/create-user-ticket", createUserTickets);

app.post("/api/solo-parent/ticket-notification", ticketNotif);

//Login
app.post("/api/login", userLogin);

app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
  console.log(`Server is running at http://localhost:${PORT}`);
});
