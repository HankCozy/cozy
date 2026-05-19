// Typography scale for Cozy Circle
//
// RULE: All Text components rendering dynamic API data (names, community names,
// section titles) MUST use maxFontSizeMultiplier={typography.maxMultiplier}.
// Headings with variable-length content MUST also add numberOfLines + adjustsFontSizeToFit.
// This prevents iOS Dynamic Type accessibility settings from breaking layouts.
//
// Do not add raw fontSize numbers to StyleSheets — use these constants.

export const typography = {
  // Titles & headings
  screenTitle: 28,      // Screen-level static titles (Login, Register)
  sectionHeader: 20,    // Card/section headings
  profileName: 26,      // User display names
  quote: 20,            // Pull-quote responses

  // Body & UI
  bodyLarge: 16,        // Primary body, input text, button text
  body: 15,             // Standard body, list items
  label: 14,            // Form labels, footer links
  small: 13,            // Tags, metadata, secondary labels
  hint: 12,             // Password requirements, counters, hint text
  tiny: 11,             // Badges, fine print

  // Buttons
  button: 16,           // Standard button text
  buttonLarge: 17,      // Primary CTA button text

  // Accessibility cap
  // Prevents iOS Dynamic Type from scaling titles/headings beyond this multiplier.
  // Without this cap, a 28px title becomes 84px at max accessibility settings,
  // pushing all content off screen. Apply to ALL Text components in heading roles
  // and any row that must fit on one line.
  maxMultiplier: 1.2,
} as const;
