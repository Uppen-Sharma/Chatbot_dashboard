const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");
const usersController = require("../controllers/usersController");

// Dashboard Data Routes
router.get("/stats", dashboardController.getStats);
router.get("/peak-usage", dashboardController.getPeakUsage);
router.get("/faqs", dashboardController.getFaqs);

// User Data Routes
router.get("/users", usersController.getUsers);
router.delete("/users/:userId", usersController.deleteUser);
router.get("/users/:userId/chats", usersController.getUserChats);
router.get("/chats/:chatId/messages", usersController.getChatMessages);

module.exports = router;
