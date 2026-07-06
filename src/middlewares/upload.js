import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.baseUrl.split('/').pop(); // 'designs', 'dispatches', etc.
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const dir = path.join(__dirname, `../../uploads/${type}/${year}/${month}`);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  return cb(null, true);
};

export const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024, fieldSize: 100 * 1024 * 1024 }, // 500MB limit for files, 100MB for fields
  fileFilter
});
