import { Router } from 'express';
import multer from 'multer';
import { transcribeAudioBuffer } from '../services/transcription';

const router = Router();

// Configure multer for memory storage (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit (AssemblyAI file size limit)
  },
  fileFilter: (_req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

/**
 * POST /api/transcribe
 * Upload audio file and get transcription
 */
router.post('/', upload.single('audio'), async (req, res) => {
  try {
    console.log('Transcribe request received');
    console.log('File:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'none');

    if (!req.file) {
      console.log('ERROR: No file in request');
      return res.status(400).json({
        success: false,
        error: 'No audio file provided',
      });
    }

    console.log('Starting transcription...');
    // Transcribe from memory buffer (no disk write)
    const transcript = await transcribeAudioBuffer(
      req.file.buffer,
      req.file.originalname
    );

    console.log('Transcription complete:', transcript.substring(0, 100));
    res.json({
      success: true,
      transcript,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to transcribe audio',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;