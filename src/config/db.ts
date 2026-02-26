import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      phoneNumber VARCHAR(255) DEFAULT NULL,
      email VARCHAR(255) DEFAULT NULL,
      linkedId INT DEFAULT NULL,
      linkPrecedence ENUM('primary', 'secondary') NOT NULL DEFAULT 'primary',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deletedAt DATETIME DEFAULT NULL
    )
  `);
}

export default pool;
