import express from "express";
import {
    getAllVideos,
    uploadVideo,
    uploadRecordedVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    getVideoByShareLink
} from "../controllers/library.controller.js";
import authenticateUser from "../middlewares/auth.handler.js";

const router = express.Router();

// Public route - Get video by share link (no authentication required)
router.get("/share/:shareLink", getVideoByShareLink);

// Protected routes - require authentication
router.use(authenticateUser);

// Get all personal videos with filters
router.get("/", getAllVideos);

// Get single video by ID
router.get("/:id", getVideoById);

// Upload new video
router.post("/upload", uploadVideo);

// Upload recorded video
router.post("/upload-recorded", uploadRecordedVideo);

// Update video
router.put("/:id", updateVideo);
router.patch("/:id", updateVideo);

// Delete video
router.delete("/:id", deleteVideo);

export default router;
