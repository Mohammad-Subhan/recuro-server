import express from "express"
import { getUser, updateUser, updateProfileImage, removeProfileImage, changePassword } from "../controllers/user.controller.js"
import authenticateUser from "../middlewares/auth.handler.js"
import { uploadProfileImage } from "../config/cloudinary.config.js"

const router = express.Router();

// Protected routes - require authentication
router.get("/me", authenticateUser, getUser);
router.patch("/me", authenticateUser, updateUser);
router.patch("/me/profile-image", authenticateUser, uploadProfileImage.single("profileImage"), updateProfileImage);
router.delete("/me/profile-image", authenticateUser, removeProfileImage);
router.patch("/me/password", authenticateUser, changePassword);

export default router;