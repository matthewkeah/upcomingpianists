import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Allows your Firebase web app to connect
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    // 1. Handle browser preflight CORS checks automatically
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // 2. Initialize the R2 Client using environment variables
    const s3Client = new S3Client({
      region: "auto",
      endpoint: "https://80079b1ffa8346c5807fa7cd70cdca90.r2.cloudflarestorage.com",
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY,
        secretAccessKey: env.R2_SECRET_KEY,
      },
      forcePathStyle: true,
    });

    try {
      // 3. Upload Route
      if (request.method === "POST" && url.pathname === "/upload") {
        const { fileName, fileType, uid } = await request.json();
        const uniqueKey = `uploads/${uid || "guest"}/${Date.now()}-${fileName}`;

        const command = new PutObjectCommand({
          Bucket: "kcpo-media",
          Key: uniqueKey,
          ContentType: fileType || "application/octet-stream",
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
        
        // Return both the secure PUT url and the internal key for Firestore
        return new Response(JSON.stringify({ uploadUrl, fileKey: uniqueKey }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 4. Download Route (For viewing secure PDFs later)
      if (request.method === "POST" && url.pathname === "/download") {
        const { fileKey } = await request.json();
        
        const command = new GetObjectCommand({
          Bucket: "kcpo-media",
          Key: fileKey,
        });

        const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
        
        return new Response(JSON.stringify({ downloadUrl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response("Endpoint not found", { status: 404, headers: corsHeaders });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};