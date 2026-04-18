import type { SentimentLabel } from "./review-analysis";

const BASE_URL = "https://openrouter.ai/api/v1";

export interface OpenRouterAnalysisResult {
  overall_sentiment: SentimentLabel;
  sentiment_score: number;
  is_spam: boolean;
  is_bot: boolean;
  is_sarcastic: boolean;
  features: Array<{
    feature: string;
    sentiment: SentimentLabel;
    confidence: number;
  }>;
}

const VALID_SENTIMENTS = new Set<SentimentLabel>(["positive", "negative", "neutral", "sarcastic", "ambiguous"]);

function buildPrompt(reviews: string[]): string {
  const numbered = reviews.map((r, i) => `${i + 1}. ${r}`).join("\n");
  return `Analyze these ${reviews.length} customer product reviews. Return a JSON array with exactly one object per review, in order.

Each object must have:
- "overall_sentiment": "positive" | "negative" | "neutral" | "sarcastic" | "ambiguous"
- "sentiment_score": integer -10 (very negative) to 10 (very positive)
- "is_spam": boolean — true if promo links, buy-now phrases, or gibberish
- "is_bot": boolean — true if very short, repetitive, or clearly auto-generated
- "is_sarcastic": boolean
- "features": array of product aspects mentioned:
  - "feature": string (e.g. "Battery Life", "Build Quality", "Delivery", "Price", "Camera", "Display", "Performance", "Sound Quality", "Packaging", "Customer Service", "Comfort", "Design", "Software", "Durability")
  - "sentiment": "positive" | "negative" | "neutral"
  - "confidence": number 0.0–1.0

Return ONLY a valid JSON array. No markdown, no explanation, no extra text.

Reviews:
${numbered}`;
}

function parseResponse(content: string): unknown {
  try { return JSON.parse(content); } catch {}
  const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1].trim()); } catch {}
  }
  const arrMatch = content.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]); } catch {}
  }
  return null;
}

function sanitize(item: unknown): OpenRouterAnalysisResult {
  const obj = (item ?? {}) as Record<string, unknown>;
  const sentiment = VALID_SENTIMENTS.has(obj.overall_sentiment as SentimentLabel)
    ? (obj.overall_sentiment as SentimentLabel)
    : "neutral";

  const rawFeatures = Array.isArray(obj.features) ? obj.features : [];
  const features = rawFeatures.map((f: unknown) => {
    const fobj = (f ?? {}) as Record<string, unknown>;
    const fSentiment = VALID_SENTIMENTS.has(fobj.sentiment as SentimentLabel)
      ? (fobj.sentiment as SentimentLabel)
      : "neutral";
    return {
      feature: String(fobj.feature ?? "General"),
      sentiment: fSentiment,
      confidence: typeof fobj.confidence === "number" ? fobj.confidence : 0.7,
    };
  });

  return {
    overall_sentiment: sentiment,
    sentiment_score: typeof obj.sentiment_score === "number" ? obj.sentiment_score : 0,
    is_spam: Boolean(obj.is_spam),
    is_bot: Boolean(obj.is_bot),
    is_sarcastic: Boolean(obj.is_sarcastic),
    features,
  };
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export async function analyzeWithOpenRouter(
  reviews: string[],
  apiKey: string,
  model = "openai/gpt-4o-mini",
  onProgress?: (pct: number) => void
): Promise<Array<OpenRouterAnalysisResult | null>> {
  const BATCH = 12;
  const results: Array<OpenRouterAnalysisResult | null> = new Array(reviews.length).fill(null);

  for (let start = 0; start < reviews.length; start += BATCH) {
    const end = Math.min(start + BATCH, reviews.length);
    const batch = reviews.slice(start, end);

    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "Review Analytics Dashboard",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: buildPrompt(batch) }],
          temperature: 0.1,
          max_tokens: 3000,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenRouter ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const content: string = data.choices?.[0]?.message?.content ?? "[]";
      const parsed = parseResponse(content);

      if (Array.isArray(parsed)) {
        parsed.forEach((item, i) => {
          const idx = start + i;
          if (idx < reviews.length) {
            results[idx] = sanitize(item);
          }
        });
      }
    } catch (err) {
      console.warn(`OpenRouter batch [${start}–${end}] failed:`, err);
    }

    onProgress?.(Math.min(90, Math.round((end / reviews.length) * 85)));
    if (end < reviews.length) await sleep(200);
  }

  return results;
}
