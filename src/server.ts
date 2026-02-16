import "dotenv/config"
import express from "express"
import morgan from "morgan"
import { connectDB } from "./config/database.config.js"
import authRouter from "./routes/auth.router.js"
import userRouter from "./routes/user.router.js"
import { verifyEnvVars } from "./config/env.config.js"

// Verify environment variables
verifyEnvVars();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to db
await connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use Morgan middleware
app.use(morgan('dev'));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);

app.get("/", (req, res) => {
    res.send("Hello from Server!");
});

app.listen(PORT, () => {
    console.log(`[SUCCESS] Server running at http://localhost:${PORT}`);
});
