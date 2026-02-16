import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import User from "../models/User.js"
import AppError from "../utils/AppError.js";

// Extend Express Request type to include user property
declare global {
    namespace Express {
        interface Request {
            user?: {
                _id: string;
                email: string;
                fullName: string;
                emailVerified: boolean;
            };
        }
    }
}

const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new AppError("No token provided", 401);
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            throw new AppError("No token provided", 401);
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };

        // Get user from database
        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
            throw new AppError("User not found", 401);
        }

        // Add user to request
        req.user = {
            _id: user._id.toString(),
            email: user.email,
            fullName: user.fullName,
            emailVerified: user.emailVerified
        };

        next();
    } catch (error) {
        throw new AppError("Invalid or expired token", 401);
    }
}

export default authenticateUser;