import express from "express";
import multer from "multer";
import qrcode from "qrcode-terminal";
import fs from "fs";
import pkg from "whatsapp-web.js";
const { Client, LocalAuth, MessageMedia } = pkg;

const app = express();
const upload = multer({ dest: "uploads/" });
const port = process.env.PORT || 3000;

// WhatsApp client setup
const client = new Client({
  authStrategy: new LocalAuth(),
});

client.on("qr", (qr) => {
  console.log("📱 Scan this QR code in your WhatsApp Web:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ WhatsApp client is ready!");
});

client.initialize();

// API to receive image from ESP32
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const receiver = "91XXXXXXXXXX@c.us"; // ← yahan receiver number likhiye
    const imagePath = req.file.path;
    const media = MessageMedia.fromFilePath(imagePath);

    console.log(`📸 Photo received from ESP32: ${imagePath}`);

    await client.sendMessage(receiver, media, {
      caption: "⚠️ Motion detected! 📷",
    });

    res.send("✅ Photo sent to WhatsApp successfully");
    fs.unlinkSync(imagePath);
  } catch (error) {
    console.error("❌ Error sending image:", error);
    res.status(500).send("Error sending image");
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
