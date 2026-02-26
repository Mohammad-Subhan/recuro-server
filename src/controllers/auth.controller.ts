import User from "../models/User.js"
import { Request, Response } from "express"
import AppError from "../utils/AppError.js"
import bcrypt from "bcrypt"
import crypto from "crypto"
import { sendVerificationOTP } from "../services/email.service.js"
import VerificationOTP from "../models/VerificationOTP.js"
import jwt from "jsonwebtoken"
import type { StringValue } from "ms"

// Helper function to generate JWT token
const generateToken = (userId: string, expiresIn: StringValue | number = "7d") => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET as string,
        { expiresIn }
    );
}

// Register new user
const registerUser = async (req: Request, res: Response) => {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
        throw new AppError("All fields are required", 400);
    }

    if (password.length < 8) {
        throw new AppError("Password must be at least 8 characters long", 400);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new AppError("User already exists", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ fullName, email, password: hashedPassword });

    // Send verification OTP to email
    await sendVerificationOTP(email, newUser._id.toString(), "EMAIL_VERIFY");

    res.status(201).json({
        message: "Registration successful. Please verify your email.",
    });
}

// Verify email with OTP
const verifyEmail = async (req: Request, res: Response) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        throw new AppError("Email and OTP are required", 400);
    }

    const user = await User.findOne({ email });

    if (!user) {
        throw new AppError("User not found", 404);
    }

    if (user.emailVerified) {
        throw new AppError("Email is already verified", 400);
    }

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    const verificationRecord = await VerificationOTP.findOne({
        user: user._id,
        otpHash,
        type: "EMAIL_VERIFY",
        used: false,
        expiresAt: { $gt: new Date() }
    });

    if (!verificationRecord) {
        throw new AppError("Invalid or expired OTP", 400);
    }

    user.emailVerified = true;
    await user.save();

    verificationRecord.used = true;
    await verificationRecord.save();

    res.status(200).json({
        message: "Email verified successfully",
    });
}

// Resend verification OTP
const resendVerificationOTP = async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
        throw new AppError("Email is required", 400);
    }

    const user = await User.findOne({ email });

    if (!user) {
        throw new AppError("User not found", 404);
    }

    if (user.emailVerified) {
        throw new AppError("Email is already verified", 400);
    }

    // Rate limit: 1 OTP per minute
    const lastOTP = await VerificationOTP.findOne(
        { user: user._id, type: "EMAIL_VERIFY" }
    ).sort({ createdAt: -1 });

    if (lastOTP) {
        const timeSinceLastOTP = Date.now() - new Date(lastOTP.createdAt).getTime();
        const cooldownMs = 60 * 1000; // 1 minute

        if (timeSinceLastOTP < cooldownMs) {
            const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastOTP) / 1000);
            throw new AppError(`Please wait ${remainingSeconds} seconds before requesting a new OTP`, 429);
        }
    }

    // Invalidate all existing unused OTPs
    await VerificationOTP.updateMany(
        { user: user._id, type: "EMAIL_VERIFY", used: false },
        { used: true }
    );

    await sendVerificationOTP(email, user._id.toString(), "EMAIL_VERIFY");

    res.status(200).json({
        message: "Verification OTP resent to email",
    });
}

// Login user
const loginUser = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new AppError("Email and password are required", 400);
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new AppError("Invalid credentials", 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new AppError("Invalid credentials", 401);
    }

    if (!user.emailVerified) {
        throw new AppError("Email not verified", 403);
    }

    const token = generateToken(user._id.toString());

    return res.status(200).json({
        message: "Login successful",
        data: {
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
            },
            token
        },
    });
}

// Forgot password
const forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
        throw new AppError("Email is required", 400);
    }

    const user = await User.findOne({ email });

    if (!user) {
        throw new AppError("User not found", 404);
    }

    // Rate limit: 1 OTP per minute
    const lastOTP = await VerificationOTP.findOne(
        { user: user._id, type: "PASSWORD_RESET" }
    ).sort({ createdAt: -1 });

    if (lastOTP) {
        const timeSinceLastOTP = Date.now() - new Date(lastOTP.createdAt).getTime();
        const cooldownMs = 60 * 1000; // 1 minute

        if (timeSinceLastOTP < cooldownMs) {
            const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastOTP) / 1000);
            throw new AppError(`Please wait ${remainingSeconds} seconds before requesting a new OTP`, 429);
        }
    }

    await sendVerificationOTP(email, user._id.toString(), "PASSWORD_RESET");

    res.status(200).json({
        message: "Password reset OTP sent to email",
    });
}

// Reset password
const resetPassword = async (req: Request, res: Response) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        throw new AppError("Email, OTP and new password are required", 400);
    }

    if (newPassword.length < 8) {
        throw new AppError("Password must be at least 8 characters long", 400);
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new AppError("User not found", 404);
    }

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    const verificationRecord = await VerificationOTP.findOne({
        user: user._id,
        otpHash,
        type: "PASSWORD_RESET",
        used: false,
        expiresAt: { $gt: new Date() }
    });

    if (!verificationRecord) {
        throw new AppError("Invalid or expired OTP", 400);
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    verificationRecord.used = true;
    await verificationRecord.save();

    res.status(200).json({
        message: "Password reset successful",
    });
}

export { registerUser, verifyEmail, resendVerificationOTP, loginUser, forgotPassword, resetPassword };