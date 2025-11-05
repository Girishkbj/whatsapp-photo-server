import express from "express";
import multer from "multer";
import qrcode from "qrcode-terminal";
import fs from "fs";
import pkg from "whatsapp-web.js";
const { Client, LocalAuth, MessageMedia } = pkg;

const app = express();
const upload = multer({ dest: "uploads/" });
const port = process.env.PORT || 3000;

// ✅ Lightweight LocalAuth – small session folder
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "ESP32CAM",   // unique session id
    dataPath: "./auth"      // small session folder (instead of 200MB cache)
  }),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  }
});

// 🔁 Show QR code if not logged in
client.on("qr", (qr) => {
  console.log("📱 Scan this QR code in your WhatsApp Web:");
  qrcode.generate(qr, { small: true });
});

// ✅ WhatsApp Ready
client.on("ready", () => {
  console.log("✅ WhatsApp client is ready!");
});

client.initialize();

// 📸 API: Receive & forward image from ESP32-CAM
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const receiver = "91XXXXXXXXXX@c.us"; // <--- यहाँ अपना WhatsApp नंबर डालें
    const imagePath = req.file.path;
    const media = MessageMedia.fromFilePath(imagePath);

    console.log(`📸 Photo received from ESP32: ${imagePath}`);

    await client.sendMessage(receiver, media, {
      caption: "⚠️ Motion detected! 📷"
    });

    res.send("✅ Photo sent to WhatsApp successfully");

    // remove file after sending
    fs.unlinkSync(imagePath);

  } catch (error) {
    console.error("❌ Error sending image:", error);
    res.status(500).send("Error sending image");
  }
});

// 🌍 Start Server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
