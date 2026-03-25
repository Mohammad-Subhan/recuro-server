import { Request, Response } from "express";
import Video from "../models/Video.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import crypto from "crypto";
import { cloudinary } from "../config/cloudinary.config.js";

// Helper to extract Cloudinary public ID natively based on our folder names
const extractPublicId = (url: string) => {
  if (!url) return null;
  // Matches "recura/..." and strips the file extension (.mp4, .png, etc)
  const match = url.match(/(recura\/.*?)(?=\.[^.]+$|$)/);
  return match ? match[1] : null;
};

// Get all personal videos with optional filters
const getAllVideos = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const { sortBy = "createdAt", order = "desc", search } = req.query;

    // Build query
    const query: any = { author: req.user._id };

    if (search && typeof search === "string") {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Build sort object
    const sortOrder = order === "asc" ? 1 : -1;
    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder;

    const videos = await Video.find(query)
      .sort(sortOptions)
      .populate("author", "fullName email");

    res.status(200).json({
      message: "Videos retrieved successfully",
      data: videos,
      count: videos.length,
    });
  } catch (error) {
    throw new AppError("Failed to retrieve videos", 500);
  }
};

// Upload video files to Cloudinary
const uploadVideoFile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files || !files.video || !files.thumbnail) {
      throw new AppError("Both video and thumbnail files are required", 400);
    }

    const { title, description } = req.body;

    if (!title) {
      throw new AppError("Title is required", 400);
    }

    const videoFile = files.video[0];
    const thumbnailFile = files.thumbnail[0];

    // Get video file size
    const videoSize = videoFile.size;

    // Check user's storage limit
    const user = await User.findById(req.user._id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const storageUsed = user.storageUsed || 0;
    const storageLimit = user.storageLimit || 1024 * 1024 * 1024; // 1GB default

    if (storageUsed + videoSize > storageLimit) {
      const remainingStorage = storageLimit - storageUsed;
      throw new AppError(
        `Insufficient storage. You have ${(remainingStorage / (1024 * 1024)).toFixed(2)} MB remaining, but the video is ${(videoSize / (1024 * 1024)).toFixed(2)} MB`,
        400,
      );
    }

    // Extract video duration from Cloudinary metadata
    let duration = 0;
    try {
      const resource = await cloudinary.api.resource(videoFile.filename, {
        resource_type: "video",
        image_metadata: true,
      });
      duration = Math.round(resource.duration || 0);
    } catch (error) {
      // Non-fatal — duration defaults to 0
    }

    // Generate unique share link
    const shareLink = crypto.randomBytes(16).toString("hex");

    // Create video record
    const newVideo = await Video.create({
      title,
      description: description || "",
      videoUrl: videoFile.path,
      videoPublicId: videoFile.filename, // We can just use the exact multers given filename!
      thumbnailUrl: thumbnailFile.path,
      thumbnailPublicId: thumbnailFile.filename,
      duration,
      size: videoSize,
      author: req.user._id,
      shareLink,
    });

    // Update user's storage
    user.storageUsed = storageUsed + videoSize;
    await user.save();

    const populatedVideo = await Video.findById(newVideo._id).populate(
      "author",
      "fullName email",
    );

    res.status(201).json({
      message: "Video uploaded successfully",
      data: populatedVideo,
      storageUsed: user.storageUsed,
      storageLimit: user.storageLimit,
      storageRemaining: user.storageLimit - user.storageUsed,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Failed to upload video", 500);
  }
};

// Upload recorded video
const uploadRecordedVideo = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const { title, videoUrl, thumbnailUrl, description, duration } = req.body;

    if (!title || !videoUrl || !thumbnailUrl) {
      throw new AppError("Title, video, and thumbnail are required", 400);
    }

    // Generate unique share link
    const shareLink = crypto.randomBytes(16).toString("hex");

    const newVideo = await Video.create({
      title,
      description: description || "",
      videoUrl,
      videoPublicId: extractPublicId(videoUrl),
      thumbnailUrl,
      thumbnailPublicId: extractPublicId(thumbnailUrl),
      duration: duration || 0,
      author: req.user._id,
      shareLink,
    });

    const populatedVideo = await Video.findById(newVideo._id).populate(
      "author",
      "fullName email",
    );

    res.status(201).json({
      message: "Recorded video uploaded successfully",
      data: populatedVideo,
    });
  } catch (error) {
    throw new AppError("Failed to upload recorded video", 500);
  }
};

// Get single video by ID
const getVideoById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const { id } = req.params;

    const video = await Video.findOne({
      _id: id,
      author: req.user._id,
    }).populate("author", "fullName email");

    if (!video) {
      throw new AppError("Video not found", 404);
    }

    res.status(200).json({
      message: "Video retrieved successfully",
      data: video,
    });
  } catch (error) {
    throw new AppError("Failed to retrieve video", 500);
  }
};

// Edit/Update a video
const updateVideo = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const { id } = req.params;
    const { title, description, thumbnailUrl, transcription } = req.body;

    const video = await Video.findOne({ _id: id, author: req.user._id });

    if (!video) {
      throw new AppError("Video not found", 404);
    }

    // Update fields if provided
    if (title) video.title = title;
    if (description !== undefined) video.description = description;
    if (thumbnailUrl) video.thumbnailUrl = thumbnailUrl;
    if (transcription !== undefined) video.transcription = transcription;

    await video.save();

    const updatedVideo = await Video.findById(video._id).populate(
      "author",
      "fullName email",
    );

    res.status(200).json({
      message: "Video updated successfully",
      data: updatedVideo,
    });
  } catch (error) {
    throw new AppError("Failed to update video", 500);
  }
};

// Delete a video
const deleteVideo = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const { id } = req.params;

    const video = await Video.findOneAndDelete({
      _id: id,
      author: req.user._id,
    });

    if (!video) {
      throw new AppError("Video not found", 404);
    }

    // Delete from Cloudinary to free physical storage
    try {
      // Use the pre-saved explicitly mapped IDs on the new models.
      // Fallback natively to parsing it live just in case it's an older video without these columns.
      const videoPublicId = video.videoPublicId || extractPublicId(video.videoUrl);
      const thumbPublicId = video.thumbnailPublicId || extractPublicId(video.thumbnailUrl);

      const deletePromises = [];

      if (videoPublicId) {
        deletePromises.push(
          cloudinary.uploader.destroy(videoPublicId, { resource_type: "video" })
        );
      }
      if (thumbPublicId) {
        deletePromises.push(
          cloudinary.uploader.destroy(thumbPublicId, { resource_type: "image" })
        );
      }

      // We use allSettled so that if one fails, it doesn't crash the request
      // and we still ensure the DB is cleaned up properly.
      await Promise.allSettled(deletePromises);
    } catch (err) {
      console.error("Error deleting resources from Cloudinary:", err);
    }

    // Update user's storage
    const user = await User.findById(req.user._id);
    if (user && video.size) {
      user.storageUsed = Math.max(0, (user.storageUsed || 0) - video.size);
      await user.save();
    }

    res.status(200).json({
      message: "Video deleted successfully",
      data: video,
    });
  } catch (error) {
    throw new AppError("Failed to delete video", 500);
  }
};

// Get video by share link (public access)
const getVideoByShareLink = async (req: Request, res: Response) => {
  try {
    const { shareLink } = req.params;

    const video = await Video.findOne({ shareLink }).populate(
      "author",
      "fullName",
    );

    if (!video) {
      throw new AppError("Video not found or not accessible", 404);
    }

    res.status(200).json({
      message: "Video retrieved successfully",
      data: video,
    });
  } catch (error) {
    throw new AppError("Failed to retrieve video", 500);
  }
};

export {
  getAllVideos,
  uploadVideoFile,
  uploadRecordedVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  getVideoByShareLink,
};
