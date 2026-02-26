import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { initDB } from "./config/db";

const PORT = process.env.PORT || 3000;

async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
