import { v2 as cloudinary } from "cloudinary"
import { CloudinaryStorage } from "multer-storage-cloudinary"
import multer from "multer"
import { Request } from "express"

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer with Cloudinary storage for profile images
const profileImageStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "recura/profile-images",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
    } as any,
});

export const uploadProfileImage = multer({
    storage: profileImageStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (_req, file, cb) => {
        const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
        }
    }
});

// Configure Multer with Cloudinary storage for video uploads
const videoStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "recura/videos",
        resource_type: "video",
        allowed_formats: ["mp4", "mov", "webm"],
    } as any,
});

export const uploadVideo = multer({
    storage: videoStorage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
    fileFilter: (_req, file, cb) => {
        console.log("Files:", file);
        console.log("File mimetype:", file.mimetype);
        const allowed = ["video/mp4", "video/quicktime", "video/webm"];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only MP4 and MOV video files are allowed"));
        }
    }
});

// Configure Multer with Cloudinary storage for thumbnails
const thumbnailStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "recura/thumbnails",
        allowed_formats: ["jpg", "jpeg", "png"],
        transformation: [{ width: 1200, height: 1600, crop: "fill" }], // 3:4 aspect ratio
    } as any,
});

export const uploadThumbnail = multer({
    storage: thumbnailStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (_req, file, cb) => {
        const allowed = ["image/jpeg", "image/jpg", "image/png"];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPEG and PNG images are allowed"));
        }
    }
});

// Combined storage that routes each field to the correct Cloudinary destination
const combinedVideoThumbnailStorage = new CloudinaryStorage({
    cloudinary,
    params: async (_req: Request, file: Express.Multer.File) => {
        if (file.fieldname === "video") {
            return {
                folder: "recura/videos",
                resource_type: "video",
                allowed_formats: ["mp4", "mov", "webm"],
            };
        }
        // thumbnail
        return {
            folder: "recura/thumbnails",
            allowed_formats: ["jpg", "jpeg", "png"],
            transformation: [{ width: 1600, height: 1200, crop: "fill" }],
        };
    },
} as any);

// Single multer instance that handles both fields in one stream pass
export const uploadVideoAndThumbnail = multer({
    storage: combinedVideoThumbnailStorage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB (20MB video + 5MB thumbnail)
    fileFilter: (_req, file, cb) => {
        const allowedVideo = ["video/mp4", "video/quicktime", "video/webm"];
        const allowedImage = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

        if (file.fieldname === "video" && allowedVideo.includes(file.mimetype)) {
            cb(null, true);
        } else if (file.fieldname === "thumbnail" && allowedImage.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type for field "${file.fieldname}"`));
        }
    },
});

export { cloudinary };
