import { Router, Request, Response } from "express";
import { identify } from "../services/contact.service";

const router = Router();

router.post("/identify", async (req: Request, res: Response) => {
  try {
    const result = await identify(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
