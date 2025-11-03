import express from "express";
import multer from "multer";
import qrcode from "qrcode-terminal";
import { Client, LocalAuth } from "whatsapp-web.js";
import fs from "fs";

const app = express();
const upload = multer({ dest: "uploads/" });
const port = process.env.PORT || 3000;

// WhatsApp client setup
const client = new Client({
  authStrategy: new LocalAuth(),
});

client.on("qr", (qr) => {
  console.log("Scan this QR code in your WhatsApp Web:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ WhatsApp client is ready!");
});

client.initialize();

// API route to receive photo from ESP32
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const receiver = "91XXXXXXXXXX@c.us"; // ← Yahan receiver number daaliye (91 + mobile number)
    const imagePath = req.file.path;

    console.log(`📸 Photo received: ${imagePath}`);

    await client.sendMessage(receiver, fs.readFileSync(imagePath), {
      caption: "Motion detected! 📷",
    });

    res.send("Photo sent to WhatsApp successfully ✅");
    fs.unlinkSync(imagePath); // remove temp file
  } catch (error) {
    console.error("Error sending image:", error);
    res.status(500).send("Error sending image ❌");
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
