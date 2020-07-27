const express = require("express");

const router = express.Router();

const authController = require("../controllers/authController");

router.get("/isAuthenticated", authController.isAuthenticated)
  .post("/setSession", authController.setSession)
  .put("/unsetSession", authController.checkIfAuthenticated, authController.unsetSession);

module.exports = router;
