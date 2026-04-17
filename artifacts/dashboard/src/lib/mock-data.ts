export const mockProducts = [
  {
    id: 1,
    name: "Oceanic Lotion",
    category: "Skincare",
    total_reviews: 1240,
    valid_reviews: 1100,
    positive_pct: 68,
    negative_pct: 12,
    neutral_pct: 20,
    languages: ["en", "es", "fr"],
    created_at: "2024-01-01T00:00:00Z"
  }
];

export const mockOverview = {
  total_reviews: 1240,
  valid_reviews: 1100,
  spam_count: 50,
  duplicate_count: 40,
  sarcastic_count: 50,
  emerging_issues_count: 3,
  languages_detected: ["en", "es", "fr"],
  language_breakdown: { en: 800, es: 200, fr: 100 },
  overall_sentiment: { positive: 68, neutral: 20, negative: 12, ambiguous: 0 }
};

export const mockFeatures = [
  { feature: "Fragrance", mention_count: 450, positive_pct: 80, neutral_pct: 10, negative_pct: 5, ambiguous_pct: 5 },
  { feature: "Texture", mention_count: 320, positive_pct: 60, neutral_pct: 20, negative_pct: 15, ambiguous_pct: 5 },
  { feature: "Packaging", mention_count: 200, positive_pct: 40, neutral_pct: 30, negative_pct: 25, ambiguous_pct: 5 }
];

export const mockEmergingIssues = [
  { feature: "Pump Dispenser", severity: "high" as const, from_pct: 5, to_pct: 15, is_systemic: true, review_count: 45, description: "Pump breaking after a few uses" },
  { feature: "Skin Irritation", severity: "critical" as const, from_pct: 2, to_pct: 8, is_systemic: false, review_count: 20, description: "Redness reported by sensitive skin users" }
];

export const mockReviews = {
  items: [
    { id: 1, product_id: 1, text: "Great lotion, smells amazing!", language: "en", overall_sentiment: "positive" as const, is_spam: false, is_duplicate: false, is_sarcastic: false, features: [{ feature: "Fragrance", sentiment: "positive" as const, confidence: 0.9 }], created_at: "2024-01-01T00:00:00Z", review_date: "2024-01-01T00:00:00Z" },
    { id: 2, product_id: 1, text: "The pump broke on the second day.", language: "en", overall_sentiment: "negative" as const, is_spam: false, is_duplicate: false, is_sarcastic: false, features: [{ feature: "Packaging", sentiment: "negative" as const, confidence: 0.95 }], created_at: "2024-01-02T00:00:00Z", review_date: "2024-01-02T00:00:00Z" },
  ],
  total: 2,
  page: 1,
  size: 10,
  pages: 1
};

export const mockTrends = [
  { index: 1, date: "2024-01-01", feature: "Fragrance", negative_pct: 5, positive_pct: 80, mention_count: 100 },
  { index: 2, date: "2024-01-02", feature: "Fragrance", negative_pct: 6, positive_pct: 79, mention_count: 110 },
  { index: 3, date: "2024-01-03", feature: "Fragrance", negative_pct: 4, positive_pct: 82, mention_count: 90 },
];
