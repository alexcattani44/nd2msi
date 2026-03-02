import { default as maxAPI } from "max-api"; // import default as maxAPI from "max-api";
import cors from 'cors';
// It will post a message in the Max console
// when the script is run by the `node.script` object
// server/server.ts
import express from "express";
import multer from "multer";
import fs from "fs";
import readline from "readline";
import path from "path";
import maxApi from "max-api";

maxAPI.post("Hello from TypeScript!");


const app = express();
app.use(cors());
const upload = multer({ dest: "uploads/" });

app.use(express.static("public")); // Serve frontend

// Upload endpoint
app.post("/upload", upload.single("csv"), async (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded");

  const rl = readline.createInterface({
    input: fs.createReadStream(req.file.path),
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    const [index, timestamp, value] = line.split(",");
    
    const t = (new Date(timestamp.replace(/"/g, "")).getTime());
    const v = parseFloat(value);

    if (!isNaN(t) && !isNaN(v)) {
      maxApi.outlet(t, v);
    }
  }

  res.send("OK");
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
