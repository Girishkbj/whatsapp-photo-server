import express from "express";
import multer from "multer";
import qrcode from "qrcode-terminal";
import fs from "fs";
import pkg from "whatsapp-web.js";
const { Client, LocalAuth, MessageMedia } = pkg;

const app = express();
const upload = multer({ dest: "uploads/" });

// ----- CONFIG -----
const SECRET_KEY = "Girish7952";              // Your secret key
const DATA_PATH = "./wwebjs_auth";            // ✅ Safe storage path
const CLIENT_ID = "ESP32CAM";                 // Unique client ID
const RECEIVER = "91XXXXXXXXXX@c.us";         // ← replace with your WhatsApp number
// -------------------

// WhatsApp Client Setup
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: CLIENT_ID,
    dataPath: DATA_PATH
  }),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// QR EVENT
client.on("qr", (qr) => {
  console.log("\n📱 Scan QR on secret URL only:");
  console.log(`🔐 Open: /qr?key=${SECRET_KEY}`);
  qrcode.generate(qr, { small: true });
});

// READY EVENT
client.on("ready", () => {
  console.log("✅ WhatsApp is Ready!");
});

// ERROR EVENT
client.on("auth_failure", () => {
  console.log("❌ Auth Failure. Scan QR again.");
});

// INIT
client.initialize();

// ✅ Secret QR Page
app.get("/qr", (req, res) => {
  if (req.query.key !== SECRET_KEY) return res.status(403).send("❌ Unauthorized");

  res.send(`
    <h2>🔐 Secure QR Login</h2>
    <p>Scan this QR in WhatsApp App → Linked Devices</p>
    <script>
      const eventSource = new EventSource('/qr-stream?key=${SECRET_KEY}');
      eventSource.onmessage = (e) => {
        document.body.innerHTML = "<img src='" + e.data + "' />";
      };
    </script>
  `);
});

// ✅ QR Stream (Image)
app.get("/qr-stream", (req, res) => {
  if (req.query.key !== SECRET_KEY) return res.status(403).send("Unauthorized");

  res.setHeader("Content-Type", "text/event-stream");

  client.on("qr", async (qr) => {
    const qrImage = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + qr;
    res.write(`data: ${qrImage}\n\n`);
  });
});

// ✅ ESP32 Upload API
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const imagePath = req.file.path;
    const media = MessageMedia.fromFilePath(imagePath);

    console.log(`📸 Photo received: ${imagePath}`);

    await client.sendMessage(RECEIVER, media, {
      caption: "⚠️ Motion Detected!",
    });

    fs.unlinkSync(imagePath); // Delete after send
    res.send("✅ Image Sent on WhatsApp");
  } catch (err) {
    console.error("❌ Error sending image:", err);
    res.status(500).send("Error");
  }
});

// ------------------- RUN SERVER -------------------
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
