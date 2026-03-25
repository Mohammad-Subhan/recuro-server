import mongoose from "mongoose"

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    fullName: {
        type: String,
        required: true
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    profileImage: {
        type: String,
        default: null
    },
    storageUsed: {
        type: Number,
        default: 0 // Storage in bytes
    },
    storageLimit: {
        type: Number,
        default: 1024 * 1024 * 1024 // 1GB in bytes
    }
});

const User = mongoose.model("User", userSchema);

export default User;