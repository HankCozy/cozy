import { Router, Request, Response } from 'express';
import { generateProfileSummary, QuestionAnswer } from '../services/claude';

const router = Router();

/**
 * POST /api/profile/generate
 * Generate an AI profile summary from transcribed answers
 *
 * Body:
 * {
 *   answers: Array<{
 *     sectionId: string,
 *     question: string,
 *     transcript: string
 *   }>,
 *   firstName?: string,
 *   options?: {
 *     maxWords?: number,
 *     style?: 'professional' | 'casual' | 'narrative'
 *   }
 * }
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { answers, firstName, options } = req.body;

    // Validate request
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'answers array is required and must not be empty',
      });
    }

    // Validate each answer has required fields
    for (const answer of answers) {
      if (!answer.sectionId || !answer.question || !answer.transcript) {
        return res.status(400).json({
          success: false,
          error: 'Each answer must have sectionId, question, and transcript',
        });
      }
    }

    // Generate profile summary using Claude
    const summary = await generateProfileSummary(
      answers as QuestionAnswer[],
      firstName,
      options
    );

    return res.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('Profile generation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate profile summary',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
