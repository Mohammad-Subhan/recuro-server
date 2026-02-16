import { Request, Response, NextFunction } from "express"
import AppError from "../utils/AppError.js"

const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
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