import express from "express"
import { getUser } from "../controllers/user.controller.js"
import authenticateUser from "../middlewares/auth.handler.js"

const router = express.Router();

// Protected routes - require authentication
router.get("/me", authenticateUser, getUser);

export default router;
