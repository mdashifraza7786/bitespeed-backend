import express from "express";
import cors from "cors";
import contactRoute from "./routes/contact.route";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(contactRoute);

export default app;

