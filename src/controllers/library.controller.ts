import { Request, Response } from "express";
import Video from "../models/Video.js";
import AppError from "../utils/AppError.js";
import crypto from "crypto";

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
                { description: { $regex: search, $options: "i" } }
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
            count: videos.length
        });
    } catch (error) {
        throw new AppError("Failed to retrieve videos", 500);
    }
};

// Upload a new video
const uploadVideo = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            throw new AppError("Unauthorized", 401);
        }

        const { title, description, videoUrl, thumbnailUrl, duration } = req.body;

        if (!title || !videoUrl || !thumbnailUrl) {
            throw new AppError("Title, video, and thumbnail are required", 400);
        }

        // Generate unique share link
        const shareLink = crypto.randomBytes(16).toString("hex");

        const newVideo = await Video.create({
            title,
            description: description || "",
            videoUrl,
            thumbnailUrl,
            duration: duration || 0,
            author: req.user._id,
            shareLink
        });

        const populatedVideo = await Video.findById(newVideo._id)
            .populate("author", "fullName email");

        res.status(201).json({
            message: "Video uploaded successfully",
            data: populatedVideo
        });
    } catch (error) {
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
            thumbnailUrl,
            duration: duration || 0,
            author: req.user._id,
            shareLink
        });

        const populatedVideo = await Video.findById(newVideo._id)
            .populate("author", "fullName email");

        res.status(201).json({
            message: "Recorded video uploaded successfully",
            data: populatedVideo
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

        const video = await Video.findOne({ _id: id, author: req.user._id })
            .populate("author", "fullName email");

        if (!video) {
            throw new AppError("Video not found", 404);
        }

        res.status(200).json({
            message: "Video retrieved successfully",
            data: video
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

        const updatedVideo = await Video.findById(video._id)
            .populate("author", "fullName email");

        res.status(200).json({
            message: "Video updated successfully",
            data: updatedVideo
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

        const video = await Video.findOneAndDelete({ _id: id, author: req.user._id });

        if (!video) {
            throw new AppError("Video not found", 404);
        }

        res.status(200).json({
            message: "Video deleted successfully",
            data: video
        });
    } catch (error) {
        throw new AppError("Failed to delete video", 500);
    }
};

// Get video by share link (public access)
const getVideoByShareLink = async (req: Request, res: Response) => {
    try {
        const { shareLink } = req.params;

        const video = await Video.findOne({ shareLink })
            .populate("author", "fullName");

        if (!video) {
            throw new AppError("Video not found or not accessible", 404);
        }

        res.status(200).json({
            message: "Video retrieved successfully",
            data: video
        });
    } catch (error) {
        throw new AppError("Failed to retrieve video", 500);
    }
};

export {
    getAllVideos,
    uploadVideo,
    uploadRecordedVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    getVideoByShareLink
};
