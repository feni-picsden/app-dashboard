import express from "express";
import { upload } from "../middleware/upload.js";
import {
  createModDownload,
  updateModDownload
} from "../controller/modsController.js";

const router = express.Router();

router.post("/", upload.single("file"), createModDownload);
router.put("/:id", upload.single("file"), updateModDownload);

export default router;

