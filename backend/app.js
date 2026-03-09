require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { pool, initDB } = require("./db");

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.S3_BUCKET_NAME;

// daftar semua file
app.get("/api/files", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM meta_data ORDER BY upload_date DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// upload file ke S3 + simpan metadata
app.post("/api/files/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "file is required" });

    const id = uuidv4();
    const filename = req.file.originalname;
    const s3Key = `uploads/${id}/${filename}`;
    const s3Url = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));

    await pool.execute(
      "INSERT INTO meta_data (id, filename, size, s3_url, description) VALUES (?, ?, ?, ?, ?)",
      [id, filename, req.file.size, s3Url, req.body.description || ""]
    );

    res.status(201).json({ id, filename, s3Url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// download — buat presigned GET url
app.get("/api/files/:id/download", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM meta_data WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "File not found" });

    const s3Key = `uploads/${rows[0].id}/${rows[0].filename}`;
    const downloadUrl = await getSignedUrl(s3, new GetObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
    }), { expiresIn: 300 });

    res.json({ downloadUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// hapus dari S3 + RDS
app.delete("/api/files/:id", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM meta_data WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "File not found" });

    const s3Key = `uploads/${rows[0].id}/${rows[0].filename}`;
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key }));
    await pool.execute("DELETE FROM meta_data WHERE id = ?", [req.params.id]);

    res.json({ message: "deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
initDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error("Failed to start:", err);
  process.exit(1);
});
