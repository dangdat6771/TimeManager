const express = require("express");
const authRoutes = require("./auth.routes");
const accountRoutes = require("./account.routes");
const categoryRoutes = require("./category.routes");
const tagRoutes = require("./tag.routes");
const taskRoutes = require("./task.routes");
const eventRoutes = require("./event.routes");
const habitRoutes = require("./habit.routes");
const focusRoutes = require("./focus.routes");
const notificationRoutes = require("./notification.routes");
const dashboardRoutes = require("./dashboard.routes");
const adminRoutes = require("./admin.routes");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/account", authenticate, accountRoutes);
router.use("/categories", authenticate, categoryRoutes);
router.use("/tags", authenticate, tagRoutes);
router.use("/tasks", authenticate, taskRoutes);
router.use("/events", authenticate, eventRoutes);
router.use("/habits", authenticate, habitRoutes);
router.use("/focus", authenticate, focusRoutes);
router.use("/notifications", authenticate, notificationRoutes);
router.use("/dashboard", authenticate, dashboardRoutes);
router.use("/admin", authenticate, adminRoutes);

module.exports = router;
