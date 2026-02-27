import { Request, Response, NextFunction } from "express"
import AppError from "../utils/AppError.js"
import multer from "multer"

const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    // Handle Multer-specific errors
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "File too large. Maximum size is 5MB" });
        }
        return res.status(400).json({ message: err.message });
    }

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            message: err.message
        });
    }

    console.log(`[ERROR]: ${err.message}`);

    return res.status(500).json({
        message: "Internal Server Error"
    });
}

export default errorHandler;