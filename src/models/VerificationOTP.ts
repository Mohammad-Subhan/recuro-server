import mongoose from "mongoose"

const verificationOTPSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    otpHash: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ["EMAIL_VERIFY", "PASSWORD_RESET"],
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    used: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const VerificationOTP = mongoose.model("VerificationOTP", verificationOTPSchema);

export default VerificationOTP;