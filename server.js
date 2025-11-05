import express from "express";
import multer from "multer";
import qrcodeTerminal from "qrcode-terminal";
import fs from "fs";
import path from "path";
import pkg from "whatsapp-web.js";
const { Client, LocalAuth, MessageMedia } = pkg;

const app = express();
const upload = multer({ dest: "uploads/" });
const port = process.env.PORT || 3000;

// ----- CONFIG -----
const SECRET_KEY = "Girish7952";             // QR page access key
const DATA_PATH  = "/data/whatsapp_session"; // Render persistent path
const CLIENT_ID  = "ESP32CAM";               // unique session id
const RECEIVER   = "91XXXXXXXXXX@c.us";      // <- yahan apna WhatsApp no. dalo
// -------------------

// ensure /data path exists (Render)
try {
  fs.mkdirSync(DATA_PATH, { recursive: true });
} catch {}

// keep latest QR in memory for the web page
let latestQR = "";

// Lightweight LocalAuth + headless puppeteer (Render safe)
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: CLIENT_ID,
    dataPath: DATA_PATH,
  }),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// QR events
client.on("qr", (qr) => {
  latestQR = qr;
  console.log("📱 Scan this QR code in your WhatsApp Web:");
  qrcodeTerminal.generate(qr, { small: true }); // console fallback
});

client.on("ready", () => {
  console.log("✅ WhatsApp client is ready!");
});

client.on("auth_failure", (m) => {
  console.error("❌ Auth failure:", m);
});

client.initialize();

// ---------- WEB ROUTES ----------

// health/root
app.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`
    <h2>WhatsApp Photo Server</h2>
    <p>Status: running on port ${port}</p>
    <p>QR page (secret key required): <code>/qr?key=YOUR_SECRET</code></p>
  `);
});

// secure QR page: /qr?key=Girish7952
app.get("/qr", (req, res) => {
  const key = req.query.key;
  if (key !== SECRET_KEY) {
    return res.status(403).send("Forbidden: invalid or missing key.");
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // client-side QR renderer via CDN (no extra npm deps)
  res.end(`
<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>WhatsApp QR</title>
  <style>
    body { font-family: system-ui, sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; background:#0b1320; color:#fff; margin:0; }
    .card { background:#121a2b; padding:24px; border-radius:16px; box-shadow:0 10px 30px rgba(0,0,0,.35); text-align:center; width:min(92vw,420px); }
    #qrcode { background:#fff; padding:12px; border-radius:12px; }
    .muted { opacity:.8; font-size:14px; margin-top:10px; }
    button { margin-top:14px; padding:10px 14px; border:0; border-radius:8px; background:#1f6feb; color:#fff; cursor:pointer; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Scan this QR in WhatsApp</h2>
    <div id="qrcode"></div>
    <div class="muted">WhatsApp &gt; Linked devices &gt; Link a device</div>
    <button onclick="refresh()">Refresh QR</button>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <script>
    async function getQR() {
      const r = await fetch('/qr/raw?key=${SECRET_KEY}&t=' + Date.now());
      if (!r.ok) return null;
      return r.text();
    }
    async function render() {
      const qr = await getQR();
      const box = document.getElementById('qrcode');
      box.innerHTML = '';
      if (!qr || qr.trim()==='') {
        box.innerHTML = '<div style="padding:20px;color:#ffb4b4">QR not available. If already scanned, wait for "client ready".</div>';
        return;
      }
      new QRCode(box, { text: qr, width: 320, height: 320 });
    }
    function refresh(){ render(); }
    render();
  </script>
</body>
</html>
  `);
});

// raw QR string for the page (secured)
app.get("/qr/raw", (req, res) => {
  const key = req.query.key;
  if (key !== SECRET_KEY) return res.status(403).end();
  res.type("text/plain").send(latestQR || "");
});

// API to receive image from ESP32
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const imagePath = req.file?.path;
    if (!imagePath) return res.status(400).send("No image file received");
    const media = MessageMedia.fromFilePath(imagePath);

    console.log(`📸 Photo from ESP32: ${imagePath}`);
    await client.sendMessage(RECEIVER, media, { caption: "⚠️ Motion detected! 📷" });

    res.send("✅ Photo sent to WhatsApp successfully");
    fs.unlink(imagePath, () => {}); // cleanup
  } catch (err) {
    console.error("❌ Error sending image:", err);
    res.status(500).send("Error sending image");
  }
});

// start server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
