const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

async function initDB() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS files (
      id          VARCHAR(36) PRIMARY KEY,
      filename    VARCHAR(255) NOT NULL,
      size        BIGINT DEFAULT 0,
      s3_url      VARCHAR(1024) NOT NULL,
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      description VARCHAR(500) DEFAULT ''
    )
  `);
}

module.exports = { pool, initDB };
