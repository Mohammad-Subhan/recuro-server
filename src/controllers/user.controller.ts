import AppError from "../utils/AppError.js"
import { Request, Response } from "express"

const getUser = (req: Request, res: Response) => {
    try {
        
    } catch (error) {
        throw new AppError("Internal Server Error", 500);
    }
}

export { getUser };