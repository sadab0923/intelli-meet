const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI;

  // Temporary diagnostic logging — does NOT expose the password.
  if (!uri) {
    console.error("[db] MONGO_URI is undefined — the env var is not set on this service.");
  } else {
    const safePreview = uri.slice(0, 12) + "..." + uri.slice(-20);
    console.log(`[db] MONGO_URI length: ${uri.length}`);
    console.log(`[db] MONGO_URI preview: ${safePreview}`);
    console.log(`[db] MONGO_URI starts with quote?: ${uri.startsWith('"') || uri.startsWith("'")}`);
    console.log(`[db] MONGO_URI has whitespace?: ${/\s/.test(uri)}`);
  }

  try {
    await mongoose.connect(uri);
    console.log("[db] MongoDB connected");
  } catch (err) {
    console.error("[db] MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
