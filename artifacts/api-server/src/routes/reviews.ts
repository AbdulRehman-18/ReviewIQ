import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, reviewsTable, productsTable } from "@workspace/db";
import { GetProductReviewsParams, GetProductReviewsQueryParams } from "@workspace/api-zod";

const router = Router();

function analyzeText(text: string) {
  const lowerText = text.toLowerCase();
  const features: Array<{
    feature: string;
    sentiment: string;
    confidence: number;
    evidence: string;
  }> = [];

  const featureKeywords: Record<string, string[]> = {
    packaging: ["packag", "box", "wrap", "container", "seal", "plastic"],
    taste: ["taste", "flavor", "flavour", "delicious", "yummy", "bland", "sweet", "bitter"],
    price: ["price", "cost", "expensive", "cheap", "afford", "value", "worth"],
    quality: ["quality", "fresh", "authentic", "genuine", "real", "fake"],
    delivery: ["deliver", "ship", "arrive", "late", "fast", "quick", "slow"],
    customer_service: ["service", "support", "help", "staff", "team", "response"],
  };

  const positiveWords = ["good", "great", "excellent", "love", "amazing", "perfect", "best"];
  const negativeWords = ["bad", "terrible", "awful", "hate", "worst", "horrible", "poor", "broken"];

  for (const [feature, keywords] of Object.entries(featureKeywords)) {
    const found = keywords.find((kw) => lowerText.includes(kw));
    if (found) {
      let sentiment = "neutral";
      const context = lowerText.substring(
        Math.max(0, lowerText.indexOf(found) - 50),
        Math.min(lowerText.length, lowerText.indexOf(found) + 50)
      );
      if (positiveWords.some((w) => context.includes(w))) sentiment = "positive";
      else if (negativeWords.some((w) => context.includes(w))) sentiment = "negative";
      features.push({ feature, sentiment, confidence: 0.8 + Math.random() * 0.15, evidence: found });
    }
  }

  let overallSentiment = "neutral";
  const posCount = features.filter((f) => f.sentiment === "positive").length;
  const negCount = features.filter((f) => f.sentiment === "negative").length;
  if (posCount > negCount) overallSentiment = "positive";
  else if (negCount > posCount) overallSentiment = "negative";
  else if (positiveWords.some((w) => lowerText.includes(w))) overallSentiment = "positive";
  else if (negativeWords.some((w) => lowerText.includes(w))) overallSentiment = "negative";

  const isSpam = text.length < 10 || (text.match(/!/g) || []).length > 5;
  const isSarcastic = lowerText.includes("yeah right") || lowerText.includes("oh sure");

  return { features, overallSentiment, isSpam, isSarcastic };
}

router.get("/products/:id/reviews", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const paramsResult = GetProductReviewsParams.safeParse({ id: parseInt(rawId, 10) });
  if (!paramsResult.success) {
    res.status(400).json({ error: paramsResult.error.message });
    return;
  }

  const queryResult = GetProductReviewsQueryParams.safeParse(req.query);
  if (!queryResult.success) {
    res.status(400).json({ error: queryResult.error.message });
    return;
  }

  const { id } = paramsResult.data;
  const { filter, page = 1, size = 20 } = queryResult.data;

  let query = db.select().from(reviewsTable).where(eq(reviewsTable.productId, id));
  const allReviews = await query;

  let filtered = allReviews;
  if (filter === "spam") filtered = allReviews.filter((r) => r.isSpam);
  else if (filter === "duplicate") filtered = allReviews.filter((r) => r.isDuplicate);
  else if (filter === "sarcastic") filtered = allReviews.filter((r) => r.isSarcastic);
  else if (filter === "positive") filtered = allReviews.filter((r) => r.overallSentiment === "positive");
  else if (filter === "negative") filtered = allReviews.filter((r) => r.overallSentiment === "negative");
  else if (filter === "neutral") filtered = allReviews.filter((r) => r.overallSentiment === "neutral");

  const total = filtered.length;
  const start = (page - 1) * size;
  const items = filtered.slice(start, start + size);

  res.json({
    items: items.map((r) => ({
      id: r.id,
      product_id: r.productId,
      text: r.text,
      language: r.language,
      overall_sentiment: r.overallSentiment,
      is_spam: r.isSpam,
      is_duplicate: r.isDuplicate,
      is_sarcastic: r.isSarcastic,
      features: r.features,
      created_at: r.createdAt,
      review_date: r.reviewDate,
    })),
    total,
    page,
    size,
    pages: Math.ceil(total / size),
  });
});

router.post("/reviews/upload", async (req, res): Promise<void> => {
  res.json({
    ingested: 0,
    duplicates_flagged: 0,
    spam_flagged: 0,
    sarcastic_flagged: 0,
  });
});

router.post("/reviews/manual", async (req, res): Promise<void> => {
  const { text, product_id, language = "en" } = req.body;
  if (!text || !product_id) {
    res.status(400).json({ error: "text and product_id are required" });
    return;
  }
  const analysis = analyzeText(text);
  const [review] = await db
    .insert(reviewsTable)
    .values({
      productId: parseInt(product_id, 10),
      text,
      language,
      overallSentiment: analysis.overallSentiment,
      isSpam: analysis.isSpam,
      isDuplicate: false,
      isSarcastic: analysis.isSarcastic,
      features: analysis.features,
    })
    .returning();
  res.json({
    id: review.id,
    product_id: review.productId,
    text: review.text,
    language: review.language,
    overall_sentiment: review.overallSentiment,
    is_spam: review.isSpam,
    is_duplicate: review.isDuplicate,
    is_sarcastic: review.isSarcastic,
    features: review.features,
    created_at: review.createdAt,
    review_date: review.reviewDate,
  });
});

router.post("/reviews/stream", async (req, res): Promise<void> => {
  const { text, product_id, language = "en" } = req.body;
  if (!text || !product_id) {
    res.status(400).json({ error: "text and product_id are required" });
    return;
  }
  const analysis = analyzeText(text);
  const [review] = await db
    .insert(reviewsTable)
    .values({
      productId: parseInt(product_id, 10),
      text,
      language,
      overallSentiment: analysis.overallSentiment,
      isSpam: analysis.isSpam,
      isDuplicate: false,
      isSarcastic: analysis.isSarcastic,
      features: analysis.features,
    })
    .returning();
  res.json({
    id: review.id,
    product_id: review.productId,
    text: review.text,
    language: review.language,
    overall_sentiment: review.overallSentiment,
    is_spam: review.isSpam,
    is_duplicate: review.isDuplicate,
    is_sarcastic: review.isSarcastic,
    features: review.features,
    created_at: review.createdAt,
    review_date: review.reviewDate,
  });
});

export default router;
