import nodemailer from "nodemailer"
import crypto from "crypto"
import AppError from "../utils/AppError.js"
import VerificationOTP from "../models/VerificationOTP.js";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
});

interface MailOptions {
    from: string;
    to: string;
    subject: string;
    text: string;
}

const sendEmail = async (mailOptions: MailOptions) => {
    try {
        // send email using nodemailer
        await transporter.sendMail(mailOptions);
    } catch (error) {
        throw new AppError("Failed to send email", 500);
    }
}

const sendVerificationOTP = async (to: string, userId: string, type: "EMAIL_VERIFY" | "PASSWORD_RESET") => {
    try {
        const otp = crypto.randomInt(100000, 1000000).toString();
        const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

        const verificationOTP = await VerificationOTP.create({
            user: userId,
            otpHash: otpHash,
            type: type,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000) // OTP valid for 10 minutes
        })

        const mailOptions = {
            from: process.env.EMAIL_USER!,
            to,
            subject: type === "EMAIL_VERIFY" ? "Email Verification OTP" : "Password Reset OTP",
            text: `Your OTP is: ${otp}`
        };

        await sendEmail(mailOptions);
    } catch (error) {
        throw new AppError("Failed to send email", 500);
    }
}

export { sendVerificationOTP };