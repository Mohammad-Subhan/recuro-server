import mongoose from "mongoose";

const videoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    description: {
        type: String,
        default: ""
    },
    videoUrl: {
        type: String,
        required: true
    },
    thumbnailUrl: {
        type: String,
        required: true
    },
    duration: {
        type: Number, // Duration in seconds
        default: 0
    },
    transcription: {
        type: String,
        default: ""
    },
    shareLink: {
        type: String,
        unique: true,
        sparse: true
    }
}, {
    timestamps: true
});

// Index for faster queries
videoSchema.index({ author: 1, createdAt: -1 });

const Video = mongoose.model("Video", videoSchema);

export default Video;
