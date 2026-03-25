import express from "express";
import {
  getAllVideos,
  uploadVideoFile,
  uploadRecordedVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  getVideoByShareLink,
} from "../controllers/library.controller.js";
import authenticateUser from "../middlewares/auth.handler.js";
import {
  uploadVideoAndThumbnail,
} from "../config/cloudinary.config.js";

const router = express.Router();

// Public route - Get video by share link (no authentication required)
router.get("/share/:shareLink", getVideoByShareLink);

// Protected routes - require authentication
router.use(authenticateUser);

// Get all personal videos with filters
router.get("/", getAllVideos);

// Get single video by ID
router.get("/:id", getVideoById);

// Upload video files (with Cloudinary)
router.post(
  "/upload-file",
  uploadVideoAndThumbnail.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  uploadVideoFile,
);

// Upload recorded video
router.post("/upload-recorded", uploadRecordedVideo);

// Update video
router.put("/:id", updateVideo);
router.patch("/:id", updateVideo);

// Delete video
router.delete("/:id", deleteVideo);

export default router;
