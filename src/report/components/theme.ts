/**
 * Shared design tokens for the College Decision Report.
 *
 * Every report component imports colors/fonts from here instead of hardcoding
 * hex values. The palette is a cream / navy / gold editorial system:
 *   - warm cream page backgrounds
 *   - deep navy for the cover, headers, and primary brand ink
 *   - a single muted gold accent for rules, badges, and highlight numerals
 *   - muted forest-green / brick-red for positive / risk states (never neon)
 */
export const theme = {
  color: {
    // Base surfaces
    pageBg: "#FBF8F1", // warm cream — page background
    panelBg: "#F4EFE3", // slightly deeper cream for card/panel backgrounds
    panelBgAlt: "#FFFFFF", // white panel for contrast within cream pages
    coverBg: "#152238", // deep navy — Cover page background

    // Text
    ink: "#20262F", // primary text
    inkMuted: "#5B6472", // secondary text
    inkFaint: "#8B93A1", // tertiary/footnote text

    // Brand
    navy: "#1B2A4A", // headers, primary brand ink
    navyDeep: "#101A30",
    gold: "#B08D2E", // accent — rules, badges, highlight numerals
    goldSoft: "#E8DCB8", // gold-tinted panel border/background

    // Semantic
    positive: "#3E6B4F", // muted forest green
    positiveBg: "#EEF3EC",
    warning: "#8A5A22", // muted amber/brown
    warningBg: "#F6EDDD",
    risk: "#8C3A32", // muted brick red
    riskBg: "#F5E9E7",

    hairline: "#DCD3BE", // borders/rules on cream
    hairlineOnNavy: "#33415C",

    white: "#FFFFFF",
  },
  font: {
    // Serif-leaning stack for headers/titles
    family: "Georgia, 'Times New Roman', system-ui, -apple-system, serif",
    // Sans stack for body/UI
    sans: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
};

export type Theme = typeof theme;
