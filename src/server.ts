import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { initDB } from "./config/db";

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await initDB();
    console.log("Database connected and table ready");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
