const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = "gemini-2.5-flash";

export interface RegionalLanguageInsight {
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  sample_count: number;
  common_themes: string[];
}

export interface LanguageAnalysisResult {
  language_breakdown: Record<string, number>;
  languages_detected: string[];
  regional_insights: Record<string, RegionalLanguageInsight>;
}

function buildPrompt(reviews: string[], total: number): string {
  const sample = reviews.map((r, i) => `${i + 1}. ${r}`).join("\n");
  return `Analyze these ${reviews.length} customer product reviews for language detection and regional sentiment insights. The full dataset has ${total} reviews total.

Return a JSON object with:
1. "language_breakdown": map of ISO 639-1 language codes to estimated review counts (extrapolate from sample to ${total} total)
2. "languages_detected": array of language codes found in the sample
3. "regional_insights": map of language codes to:
   - "sentiment": "positive" | "negative" | "neutral" | "mixed"
   - "sample_count": number of reviews in this language from the sample
   - "common_themes": array of 2–3 common product themes/keywords mentioned

Supported language codes: en (English), hi (Hindi), mr (Marathi), bn (Bengali), ta (Tamil), te (Telugu), ml (Malayalam), kn (Kannada), gu (Gujarati), pa (Punjabi), ur (Urdu), ar (Arabic), fr (French), de (German), es (Spanish), zh (Chinese), ja (Japanese), ko (Korean), pt (Portuguese), ru (Russian).

For code-mixed text (e.g., Hinglish = Hindi + English), identify the dominant regional language.

Return ONLY valid JSON. No markdown, no explanation.

Reviews:
${sample}`;
}

function parseResponse(content: string, totalReviews: number): LanguageAnalysisResult {
  const fallback: LanguageAnalysisResult = {
    language_breakdown: { en: totalReviews },
    languages_detected: ["en"],
    regional_insights: {
      en: { sentiment: "neutral", sample_count: totalReviews, common_themes: ["general feedback"] },
    },
  };

  try {
    let jsonStr = content;
    const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) jsonStr = codeBlock[1].trim();
    else {
      const objMatch = content.match(/\{[\s\S]*\}/);
      if (objMatch) jsonStr = objMatch[0];
    }

    const parsed = JSON.parse(jsonStr) as Partial<LanguageAnalysisResult>;
    return {
      language_breakdown: parsed.language_breakdown ?? fallback.language_breakdown,
      languages_detected: parsed.languages_detected ?? fallback.languages_detected,
      regional_insights: parsed.regional_insights ?? {},
    };
  } catch {
    return fallback;
  }
}

export async function analyzeRegionalLanguages(
  reviews: string[],
  apiKey: string
): Promise<LanguageAnalysisResult> {
  // Send at most 60 reviews as a sample to keep the request small
  const sample = reviews.slice(0, 60);
  const prompt = buildPrompt(sample, reviews.length);

  const response = await fetch(
    `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1200,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const content: string =
    data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  return parseResponse(content, reviews.length);
}
