const requiredEnvVars = [
    "MONGODB_URI",
    "EMAIL_USER",
    "EMAIL_PASS",
    "JWT_SECRET",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
];

const verifyEnvVars = () => {
    const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

    if (missingVars.length > 0) {
        console.error(`[ERROR] Missing required environment variables:`);
        missingVars.forEach(varName => console.error(`- ${varName}`));
    }
}

export { verifyEnvVars };