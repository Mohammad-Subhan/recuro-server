import User from "../models/User.js"
import AppError from "../utils/AppError.js"
import { Request, Response } from "express"
import { cloudinary } from "../config/cloudinary.config.js"
import bcrypt from "bcrypt"

// Get current user profile
const getUser = async (req: Request, res: Response) => {
    if (!req.user) {
        throw new AppError("Unauthorized", 401);
    }

    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
        throw new AppError("User not found", 404);
    }

    res.status(200).json({
        message: "User retrieved successfully",
        data: { user }
    });
}

// Update current user's name
const updateUser = async (req: Request, res: Response) => {
    if (!req.user) {
        throw new AppError("Unauthorized", 401);
    }

    const { fullName } = req.body;

    if (!fullName || typeof fullName !== "string" || fullName.trim().length === 0) {
        throw new AppError("Full name is required", 400);
    }

    const user = await User.findById(req.user._id).select("-password -__v");

    if (!user) {
        throw new AppError("User not found", 404);
    }

    user.fullName = fullName.trim();
    await user.save();

    res.status(200).json({
        message: "User updated successfully",
        data: { user }
    });
}

// Upload or update profile image
const updateProfileImage = async (req: Request, res: Response) => {
    if (!req.user) {
        throw new AppError("Unauthorized", 401);
    }

    if (!req.file) {
        throw new AppError("No image file provided", 400);
    }

    const user = await User.findById(req.user._id).select("-password -__v");

    if (!user) {
        throw new AppError("User not found", 404);
    }

    // Delete old Cloudinary image if one exists
    if (user.profileImage) {
        try {
            // Extract public_id from the URL: recura/profile-images/<public_id>
            const urlParts = user.profileImage.split("/");
            const publicId = `recura/profile-images/${urlParts[urlParts.length - 1].split(".")[0]}`;
            await cloudinary.uploader.destroy(publicId);
        } catch {
            // Non-fatal: log but continue even if old image deletion fails
            console.warn("[WARN] Failed to delete old profile image from Cloudinary");
        }
    }

    // The uploaded file URL is attached by multer-storage-cloudinary
    user.profileImage = (req.file as any).path;
    await user.save();

    res.status(200).json({
        message: "Profile image updated successfully",
        data: { user }
    });
}

// Remove profile image
const removeProfileImage = async (req: Request, res: Response) => {
    if (!req.user) {
        throw new AppError("Unauthorized", 401);
    }

    const user = await User.findById(req.user._id).select("-password -__v");

    if (!user) {
        throw new AppError("User not found", 404);
    }

    if (!user.profileImage) {
        throw new AppError("No profile image to remove", 400);
    }

    // Delete from Cloudinary
    try {
        const urlParts = user.profileImage.split("/");
        const publicId = `recura/profile-images/${urlParts[urlParts.length - 1].split(".")[0]}`;
        await cloudinary.uploader.destroy(publicId);
    } catch {
        console.warn("[WARN] Failed to delete profile image from Cloudinary");
    }

    user.profileImage = null as any;
    await user.save();

    res.status(200).json({
        message: "Profile image removed successfully",
        data: { user }
    });
}

// Change password (authenticated)
const changePassword = async (req: Request, res: Response) => {
    if (!req.user) {
        throw new AppError("Unauthorized", 401);
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        throw new AppError("Current password and new password are required", 400);
    }

    if (newPassword.length < 8) {
        throw new AppError("New password must be at least 8 characters long", 400);
    }

    // Fetch user with password
    const user = await User.findById(req.user._id);

    if (!user) {
        throw new AppError("User not found", 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
        throw new AppError("Current password is incorrect", 400);
    }

    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
        throw new AppError("New password must be different from current password", 400);
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
}

export { getUser, updateUser, updateProfileImage, removeProfileImage, changePassword };