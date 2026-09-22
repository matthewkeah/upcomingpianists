const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const functions = require("firebase-functions");

// Initialize the Cloudflare R2 Client
const s3Client = new S3Client({
  region: "auto",
  // Your exact Cloudflare R2 jurisdiction endpoint
  endpoint: "https://80079b1ffa8346c5807fa7cd70cdca90.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
  forcePathStyle: true,
});

// 1. Secure Upload Endpoint
exports.generatePresignedUrl = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "You must be signed in to upload files.");
    }

    // Verify environment variables are loaded properly
    if (!process.env.R2_ACCESS_KEY || !process.env.R2_SECRET_KEY) {
      throw new Error("Missing R2 credentials. The .env file was not loaded correctly.");
    }

    const { fileName, fileType } = data;
    const uniqueKey = `uploads/${context.auth.uid}/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: "kcpo-media", 
      Key: uniqueKey,
      ContentType: fileType || "application/octet-stream",
    });

    // Generate a 15-minute upload ticket
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    
    // Return both the upload URL and the internal key for database storage
    return { uploadUrl, fileKey: uniqueKey };

  } catch (error) {
    console.error("Upload Ticket Error:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", error.message || "An unknown backend error occurred.");
  }
});

// 2. Secure Download/View Endpoint
exports.generatePresignedDownloadUrl = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "You must be signed in to view media.");
    }

    const { fileKey } = data;
    
    if (!fileKey) {
        throw new functions.https.HttpsError("invalid-argument", "Missing file key.");
    }

    const command = new GetObjectCommand({
      Bucket: "kcpo-media", 
      Key: fileKey, 
    });

    // Generate a 15-minute view/download ticket
    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    
    return { downloadUrl };

  } catch (error) {
    console.error("Download Ticket Error:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", error.message || "An unknown backend error occurred.");
  }
});