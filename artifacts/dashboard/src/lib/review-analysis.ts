export type SentimentLabel = "positive" | "negative" | "neutral" | "sarcastic" | "ambiguous";

export interface AnalyzedReview {
  id: number;
  product_id: number;
  text: string;
  language: string;
  languages: string[];
  overall_sentiment: SentimentLabel;
  sentiment_score: number;
  is_spam: boolean;
  is_bot: boolean;
  is_duplicate: boolean;
  is_sarcastic: boolean;
  features: Array<{ feature: string; sentiment: SentimentLabel; confidence: number }>;
  created_at: string;
  review_date: string;
}

interface TermSet {
  positive: string[];
  negative: string[];
  sarcasm: string[];
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
  bn: "Bengali",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  kn: "Kannada",
  gu: "Gujarati",
  pa: "Punjabi",
  ur: "Urdu",
};

const SCRIPT_RANGES: Array<{ code: string; regex: RegExp }> = [
  { code: "hi", regex: /[\u0900-\u097F]/g },
  { code: "bn", regex: /[\u0980-\u09FF]/g },
  { code: "pa", regex: /[\u0A00-\u0A7F]/g },
  { code: "gu", regex: /[\u0A80-\u0AFF]/g },
  { code: "ta", regex: /[\u0B80-\u0BFF]/g },
  { code: "te", regex: /[\u0C00-\u0C7F]/g },
  { code: "kn", regex: /[\u0C80-\u0CFF]/g },
  { code: "ml", regex: /[\u0D00-\u0D7F]/g },
  { code: "ur", regex: /[\u0600-\u06FF]/g },
];

const ROMANIZED_LANGUAGE_HINTS: Record<string, string[]> = {
  hi: ["acha", "achha", "accha", "badhiya", "bekar", "kharab", "mast", "ghatiya", "bahut", "nahi", "paisa", "mehenga", "sasta"],
  mr: ["changla", "changli", "chhan", "vait", "khup", "nako", "mahag", "swasta"],
  bn: ["bhalo", "kharap", "onek", "baje", "darun", "valo", "dam"],
  ta: ["nalla", "mosam", "romba", "super", "kevalam", "pidikkala", "semma"],
  te: ["bagundi", "baagundi", "chetta", "chala", "nachindi", "baledu", "super"],
  ml: ["nalla", "mosham", "valare", "ishtapettu", "kollam", "porotta"],
  kn: ["chennagide", "chenna", "ketta", "tumba", "sakkath", "beda"],
  gu: ["saru", "kharab", "majanu", "bahu", "monghu", "sastu"],
  pa: ["vadhiya", "maada", "changa", "bahut", "ghaint", "bekar"],
  ur: ["acha", "zabardast", "bakwas", "kharab", "mehnga", "sasta", "bohat"],
};

const TERMS: TermSet = {
  positive: [
    "good", "great", "awesome", "excellent", "amazing", "perfect", "love", "loved", "best", "fantastic", "helpful",
    "recommend", "smooth", "reliable", "fast", "worth", "satisfied", "happy", "impressed", "durable",
    "acha", "achha", "accha", "badhiya", "mast", "shandar", "zabardast", "paisa vasool", "sahi", "badiya",
    "changla", "chhan", "bhalo", "valo", "darun", "nalla", "semma", "bagundi", "baagundi", "nachindi",
    "kollam", "ishtapettu", "chennagide", "sakkath", "saru", "vadhiya", "changa",
    "अच्छा", "बढ़िया", "शानदार", "मस्त", "सही", "पसंद", "उत्तम",
    "छान", "चांगला", "ভালো", "দারুণ", "நல்ல", "சூப்பர்", "బాగుంది", "నచ్చింది",
    "നല്ല", "കൊള്ളാം", "ಚೆನ್ನಾಗಿದೆ", "ಸಕ್ಕತ್", "સારું", "ਵਧੀਆ", "زبردست", "اچھا",
  ],
  negative: [
    "bad", "terrible", "awful", "poor", "worst", "hate", "hated", "disappointed", "useless", "wrong", "frustrating",
    "broken", "slow", "defective", "fake", "waste", "expensive", "overpriced", "problem", "issue", "refund",
    "bekar", "bakwas", "kharab", "ghatiya", "faltu", "mehenga", "nahi chahiye", "pareshan", "dhokha",
    "vait", "baje", "kharap", "mosam", "mosham", "kevalam", "pidikkala", "baledu", "chetta", "ketta", "maada", "monghu",
    "बेकार", "खराब", "घटिया", "महंगा", "नकली", "समस्या", "निराश",
    "वाईट", "খারাপ", "বাজে", "மோசம்", "பிடிக்கவில்லை", "బాలేదు", "చెత్త",
    "മോശം", "ಕೆಟ್ಟ", "ખરાબ", "ਮਾੜਾ", "بکواس", "خراب", "مہنگا",
  ],
  sarcasm: [
    "sarcastic", "yeah right", "sure", "as if", "joke", "kidding", "whatever", "obviously", "thanks for nothing",
    "great job", "nice work", "wah", "waah", "kya baat", "bas yahi chahiye tha", "sure sure",
    "वाह", "क्या बात", "मज़ाक", "நன்றி வேணாம்", "అద్భుతం మరి", "വളരെ നന്നായി",
  ],
};

const SPAM_PATTERNS = [
  /https?:\/\//i,
  /\b(?:buy now|free money|promo code|discount code|click here|whatsapp me)\b/i,
  /(.)\1{8,}/,
];

function countMatches(text: string, terms: string[]) {
  return terms.reduce((count, term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = /^[a-z0-9 ]+$/i.test(term)
      ? new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "gi")
      : new RegExp(escaped, "g");
    return count + (text.match(pattern)?.length ?? 0);
  }, 0);
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

export function detectLanguages(text: string) {
  const normalized = text.toLowerCase();
  const languages: string[] = [];

  SCRIPT_RANGES.forEach(({ code, regex }) => {
    if ((text.match(regex)?.length ?? 0) > 0) {
      languages.push(code);
    }
  });

  if (/[a-z]/i.test(text)) {
    languages.push("en");
  }

  Object.entries(ROMANIZED_LANGUAGE_HINTS).forEach(([code, hints]) => {
    if (hints.some((hint) => new RegExp(`(^|[^a-z])${hint}([^a-z]|$)`, "i").test(normalized))) {
      languages.push(code);
    }
  });

  return unique(languages).sort((a, b) => {
    if (a === "en") return 1;
    if (b === "en") return -1;
    return a.localeCompare(b);
  });
}

export function getLanguageLabel(languages: string[] | string | undefined) {
  const codes = Array.isArray(languages)
    ? languages
    : typeof languages === "string"
      ? languages.split(/[,+/]/).map((item) => item.trim()).filter(Boolean)
      : [];

  return codes.map((code) => LANGUAGE_NAMES[code] ?? code.toUpperCase()).join(", ") || "Unknown";
}

export function analyzeReviewText(text: string): Pick<AnalyzedReview, "language" | "languages" | "overall_sentiment" | "sentiment_score" | "is_spam" | "is_bot" | "is_sarcastic" | "features"> {
  const normalized = text.toLowerCase();
  const languages = detectLanguages(text);
  const positive = countMatches(normalized, TERMS.positive);
  const negative = countMatches(normalized, TERMS.negative);
  const sarcasm = countMatches(normalized, TERMS.sarcasm);
  const mixedSignals = positive > 0 && negative > 0;
  const is_sarcastic = sarcasm > 0 || (mixedSignals && /\b(?:wow|wah|waah|great|nice|super|thanks)\b/i.test(text));
  const sentiment_score = positive - negative;
  const is_spam = SPAM_PATTERNS.some((pattern) => pattern.test(text));
  const is_bot = is_spam || text.trim().split(/\s+/).length <= 3 || /(.{8,})\1{2,}/i.test(text);

  let overall_sentiment: SentimentLabel = "neutral";
  if (is_sarcastic) {
    overall_sentiment = "sarcastic";
  } else if (positive > negative) {
    overall_sentiment = "positive";
  } else if (negative > positive) {
    overall_sentiment = "negative";
  } else if (mixedSignals) {
    overall_sentiment = "ambiguous";
  }

  return {
    language: languages.join(",") || "unknown",
    languages: languages.length ? languages : ["unknown"],
    overall_sentiment,
    sentiment_score,
    is_spam,
    is_bot,
    is_sarcastic,
    features: [{ feature: "General Quality", sentiment: overall_sentiment, confidence: positive || negative || sarcasm ? 0.86 : 0.55 }],
  };
}

export function analyzeReviews(lines: string[]) {
  const normalizedLines = lines.map((line) => line.trim()).filter(Boolean);
  const seen = new Map<string, number>();

  const reviews: AnalyzedReview[] = normalizedLines.map((line, index) => {
    const key = line.toLowerCase().replace(/\s+/g, " ");
    const duplicateCount = seen.get(key) ?? 0;
    seen.set(key, duplicateCount + 1);
    const analysis = analyzeReviewText(line);
    const now = new Date().toISOString();

    return {
      id: index + 1,
      product_id: 1,
      text: line,
      ...analysis,
      is_duplicate: duplicateCount > 0,
      created_at: now,
      review_date: now,
    };
  });

  const total = reviews.length || 1;
  const count = (predicate: (review: AnalyzedReview) => boolean) => reviews.filter(predicate).length;

  return {
    p: Math.round((count((review) => review.overall_sentiment === "positive") / total) * 100),
    n: Math.round((count((review) => review.overall_sentiment === "negative") / total) * 100),
    s: Math.round((count((review) => review.is_sarcastic) / total) * 100),
    neutral: Math.round((count((review) => review.overall_sentiment === "neutral") / total) * 100),
    reviews,
  };
}

export function buildLanguageBreakdown(reviews: Array<Pick<AnalyzedReview, "languages">>) {
  return reviews.reduce<Record<string, number>>((acc, review) => {
    review.languages.forEach((language) => {
      acc[language] = (acc[language] ?? 0) + 1;
    });
    return acc;
  }, {});
}

export function extractReviewTextItems(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map(extractReviewTextItems).flat();
  }

  if (input && typeof input === "object") {
    const record = input as Record<string, unknown>;
    const textValue = record.review ?? record.text ?? record.comment ?? record.content ?? record.body ?? record.message ?? record.title;
    if (typeof textValue === "string") {
      return [textValue];
    }
    return [JSON.stringify(input)];
  }

  return typeof input === "string" ? [input] : [];
}
