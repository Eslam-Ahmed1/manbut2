import express from 'express';
import multer from 'multer';
import Authorization from '../middlewares/authMiddleware.js';
import { analyzePlantImageController, getScanHistoryController, getScanHistoryByPlantIdController } from '../controllers/scan.js';
const router = express.Router();
// Use memory storage so we get the file as a Buffer (req.file.buffer)
// fileFilter: reject non-image uploads at the multer layer (cheapest defense)
// limits: 10 MB max file size
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error(`Unsupported file type "${file.mimetype}". Only JPEG, PNG, and WebP images are allowed.`));
        }
    },
});
// planetImage this is the name like name of file input of html form
router.post('/', Authorization, upload.single('plantImage'), analyzePlantImageController);
router.get('/', Authorization, getScanHistoryController);
router.get('/:id', Authorization, getScanHistoryByPlantIdController);
export default router;
