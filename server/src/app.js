const express = require("express");
const cors = require("cors");
const { validateEnvironment } = require("./config/env");

validateEnvironment();

const authRoutes = require("./routes/auth");
const eventRoutes = require("./routes/events");
const photoRoutes = require("./routes/photos");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
  })
);
app.use(express.json());

app.use("/api/events", eventRoutes);
app.use("/api/photos", photoRoutes);
app.use("/api/auth", authRoutes);

module.exports = app;