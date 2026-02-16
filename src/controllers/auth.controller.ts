import User from "../models/User.js"
import { Request, Response } from "express"
import AppError from "../utils/AppError.js"
import bcrypt from "bcrypt"
import crypto from "crypto"
import { sendVerificationOTP } from "../services/email.service.js"
import VerificationOTP from "../models/VerificationOTP.js"
import jwt from "jsonwebtoken"

// Helper function to generate JWT token
const generateToken = (userId: string, expiresIn: string = "7d") => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET as string,
        { expiresIn }
    );
}

// Register new user
const registerUser = async (req: Request, res: Response) => {
    try {
        const { fullName, email, password } = req.body;

        if (!fullName || !email || !password) {
            throw new AppError("All fields are required", 400);
        }

        if (password.length < 8) {
            throw new AppError("Password must be at least 8 characters long", 400);
        }

        const user = await User.findOne({ email });
        if (user) {
            throw new AppError("User already exists", 400);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ fullName, email, password: hashedPassword });

        // Send verification OTP to email
        await sendVerificationOTP(email, newUser._id.toString(), "EMAIL_VERIFY");

        res.status(201).json({
            message: "User created successfully",
            data: newUser,
        });
    } catch (error) {
        throw new AppError("Internal Server Error", 500);
    }
}

const verifyEmail = async (req: Request, res: Response) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            throw new AppError("Email and OTP are required", 400);
        }

        const user = await User.findOne({ email });

        if (!user) {
            throw new AppError("User not found", 404);
        }

        const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

        const verificationRecord = await VerificationOTP.findOne({
            user: user._id,
            otpHash,
            type: "EMAIL_VERIFY",
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

    } catch (error) {
        throw new AppError("Internal Server Error", 500);
    }
}

// Login user
const loginUser = async (req: Request, res: Response) => {
    try {
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

        // Generate JWT token
        const token = generateToken(user._id.toString());

        return res.status(200).json({
            message: "Login successful",
            data: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                token
            },
        });
    } catch (error) {
        throw new AppError("Internal Server Error", 500);
    }
}

// Forgot password
const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            throw new AppError("Email is required", 400);
        }

        const user = await User.findOne({ email });

        if (!user) {
            throw new AppError("User not found", 404);
        }

        // Send password reset OTP to email
        await sendVerificationOTP(email, user._id.toString(), "PASSWORD_RESET");

        res.status(200).json({
            message: "Password reset OTP sent to email",
        });

    } catch (error) {
        throw new AppError("Internal Server Error", 500);
    }
}

// Reset password
const resetPassword = async (req: Request, res: Response) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            throw new AppError("Email, OTP and new password are required", 400);
        }

        // Validate new password strength
        if (newPassword.length < 8) {
            throw new AppError("Password must be at least 8 characters long", 400);
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            throw new AppError("User not found", 404);
        }

        // Hash the OTP to compare with stored hash
        const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

        // Find valid OTP record
        const verificationRecord = await VerificationOTP.findOne({
            user: user._id,
            otpHash,
            type: "PASSWORD_RESET",
            expiresAt: { $gt: new Date() }
        });

        if (!verificationRecord) {
            throw new AppError("Invalid or expired OTP", 400);
        }

        // Update password
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        // Mark OTP as used
        verificationRecord.used = true;
        await verificationRecord.save();

        res.status(200).json({
            message: "Password reset successful",
        });

    } catch (error) {
        throw new AppError("Internal Server Error", 500);
    }
}

export { registerUser, loginUser, forgotPassword, resetPassword };