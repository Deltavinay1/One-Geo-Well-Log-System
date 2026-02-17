import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import { interpretLogs } from "./interpret.js";
import { uploadToS3 } from "./s3Service.js";
import pool from "./db.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

// Multer config
const upload = multer({ dest: "uploads/" });

// UPLOAD + BACKGROUND PARSING
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  console.log("Upload started:", req.file.originalname);

  try {
    // Clear old data for fresh upload
    await pool.query("TRUNCATE TABLE logs RESTART IDENTITY CASCADE");
    await pool.query("TRUNCATE TABLE wells RESTART IDENTITY CASCADE");

    //Upload raw LAS to S3
    const s3Url = await uploadToS3(req.file.path, req.file.originalname);

    // Create well entry
    const wellResult = await pool.query(
      "INSERT INTO wells (filename, s3_url) VALUES ($1,$2) RETURNING id",
      [req.file.originalname, s3Url],
    );
    const wellId = wellResult.rows[0].id;
    res.json({
      message: "Upload successful",
      wellId,
    });

    //Background Processing
    setImmediate(() => parseAndInsertLAS(req.file.path, wellId));
  } catch (err) {
    console.error("Upload failed:", err);
    res.status(500).json({ message: "Upload failed" });
  }
});

//Background las parsing
async function parseAndInsertLAS(filePath, wellId) {
  try {
    console.log("Parsing started for well:", wellId);

    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    let curves = [];
    let asciiIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toUpperCase().includes("~CURVE")) {
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].startsWith("~")) break;
          if (lines[j].trim()) {
            curves.push(lines[j].trim().split(/\s+/)[0]);
          }
        }
      }

      if (lines[i].toUpperCase().includes("~ASCII")) {
        asciiIndex = i + 1;
        break;
      }
    }

    const depthCurve = curves.find((c) => {
  const lc = c.toLowerCase();
  return lc === "depth" || lc.startsWith("dept") || lc.includes("depth") || lc === "md";
});

if (!depthCurve) {
  console.error("❌ Depth curve not found. Curves:", curves);
  return;
}
    await pool.query(
      "UPDATE wells SET depth_curve = $1 WHERE id = $2",
      [depthCurve, wellId]
    );

    const BATCH_SIZE = 1000;
    let batch = [];

    for (let i = asciiIndex; i < lines.length; i++) {
      const row = lines[i].trim();
      if (!row) continue;

      const values = row.split(/\s+/);
      const depth = parseFloat(values[curves.indexOf(depthCurve)]);

      curves.forEach((curve, idx) => {
        if (curve === depthCurve) return;
        batch.push([wellId, depth, curve, parseFloat(values[idx])]);
      });

      if (batch.length >= BATCH_SIZE) {
        await insertBatch(batch);
        batch = [];
      }
    }

    if (batch.length) {
      await insertBatch(batch);
    }
    
    await pool.query(
      "UPDATE wells SET parsed = TRUE WHERE id = $1",
      [wellId]
    );

    console.log("Parsing complete for well:", wellId);

  } catch (err) {
    console.error("Background parsing failed:", err);

  } finally {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Failed to delete temp file:", err.message);
      } else {
        console.log("Temp file deleted:", filePath);
      }
    });
  }
}

async function insertBatch(batch) {
  const values = [];
  const placeholders = batch
    .map((row, i) => {
      const base = i * 4;
      values.push(...row);
      return `($${base + 1},$${base + 2},$${base + 3},$${base + 4})`;
    })
    .join(",");

  await pool.query(
    `INSERT INTO logs (well_id, depth, curve_name, value) VALUES ${placeholders}`,
    values,
  );
}

//Get Curves
app.get("/curves/:wellId", async (req, res) => {
  const { wellId } = req.params;

  const result = await pool.query(
    "SELECT DISTINCT curve_name FROM logs WHERE well_id = $1",
    [wellId],
  );

  res.json({ curves: result.rows.map((r) => r.curve_name) });
});

// Get logs
app.get("/logs", async (req, res) => {
  const { wellId, start, end, curves } = req.query;

  const result = await pool.query(
    `
    SELECT depth, curve_name, value
    FROM logs
    WHERE well_id = $1
      AND depth BETWEEN $2 AND $3
      AND curve_name = ANY($4)
    ORDER BY depth
    `,
    [wellId, start, end, curves.split(",")],
  );

  const map = {};
  result.rows.forEach((r) => {
    if (!map[r.depth]) map[r.depth] = { depth: r.depth };
    map[r.depth][r.curve_name] = r.value;
  });

  res.json({ logs: Object.values(map) });
});

// AI Interpretation
app.get("/interpret", (req, res) => {
  interpretLogs(pool, req, res);
});

// --------------------
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
