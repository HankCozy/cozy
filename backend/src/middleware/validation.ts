import { Request, Response, NextFunction } from 'express';

/**
 * Sanitize string input to prevent XSS and injection attacks
 * SECURITY: Removes null bytes, trims whitespace, limits length
 */
export const sanitizeString = (value: any, maxLength: number = 10000): string => {
  if (typeof value !== 'string') return '';

  // Remove null bytes (can cause issues with C-based backends)
  let sanitized = value.replace(/\0/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length to prevent buffer overflow
  return sanitized.substring(0, maxLength);
};

/**
 * Middleware to validate and sanitize profile input
 * Applied to user profile update endpoints
 */
export const validateProfileInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body.firstName) {
    req.body.firstName = sanitizeString(req.body.firstName, 100);

    // Additional validation - no empty strings
    if (req.body.firstName.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'First name cannot be empty'
      });
    }
  }

  if (req.body.lastName) {
    req.body.lastName = sanitizeString(req.body.lastName, 100);

    if (req.body.lastName.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Last name cannot be empty'
      });
    }
  }

  if (req.body.profileSummary) {
    req.body.profileSummary = sanitizeString(req.body.profileSummary, 10000);
  }

  next();
};

/**
 * Middleware to validate registration input
 * Applied to auth registration endpoint
 */
export const validateRegistrationInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body.firstName) {
    req.body.firstName = sanitizeString(req.body.firstName, 100);
  }

  if (req.body.lastName) {
    req.body.lastName = sanitizeString(req.body.lastName, 100);
  }

  if (req.body.email) {
    // Sanitize and normalize email
    req.body.email = sanitizeString(req.body.email, 254).toLowerCase();
  }

  if (req.body.invitationCode) {
    // Sanitize invitation code
    req.body.invitationCode = sanitizeString(req.body.invitationCode, 50).toUpperCase();
  }

  next();
};
