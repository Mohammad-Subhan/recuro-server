import "dotenv/config"
import express from "express"
import cors from "cors"
import morgan from "morgan"
import { connectDB } from "./config/database.config.js"
import authRouter from "./routes/auth.router.js"
import userRouter from "./routes/user.router.js"
import libraryRouter from "./routes/library.router.js"
import { verifyEnvVars } from "./config/env.config.js"
import errorHandler from "./middlewares/error.handler.js";

// Verify environment variables
verifyEnvVars();

const app = express();
const PORT = process.env.PORT || 8000;

// Connect to db
await connectDB();

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use Morgan middleware
app.use(morgan('dev'));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/library", libraryRouter);

app.get("/", (req, res) => {
    res.send("Hello from Server!");
});

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`[SUCCESS] Server running at http://localhost:${PORT}`);
});
