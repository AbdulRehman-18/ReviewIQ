import { Router } from "express";
import { GetReportJsonParams, GetReportPdfParams } from "@workspace/api-zod";

const router = Router();

router.get("/reports/:product_id/json", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.product_id)
    ? req.params.product_id[0]
    : req.params.product_id;
  const parsed = GetReportJsonParams.safeParse({ product_id: parseInt(rawId, 10) });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  res.json({
    product_id: parsed.data.product_id,
    generated_at: new Date().toISOString(),
    overview: {
      total_reviews: 312,
      valid_reviews: 285,
      spam_count: 15,
      duplicate_count: 12,
      sarcastic_count: 8,
      emerging_issues_count: 2,
      languages_detected: ["en", "es", "fr"],
      language_breakdown: { en: 220, es: 58, fr: 34 },
      overall_sentiment: {
        positive: 0.58,
        neutral: 0.22,
        negative: 0.15,
        ambiguous: 0.05,
      },
    },
    features: [
      { feature: "packaging", mention_count: 120, positive_pct: 0.62, neutral_pct: 0.15, negative_pct: 0.18, ambiguous_pct: 0.05 },
      { feature: "taste", mention_count: 95, positive_pct: 0.72, neutral_pct: 0.12, negative_pct: 0.12, ambiguous_pct: 0.04 },
      { feature: "price", mention_count: 88, positive_pct: 0.40, neutral_pct: 0.20, negative_pct: 0.35, ambiguous_pct: 0.05 },
    ],
    emerging_issues: [
      {
        feature: "packaging",
        severity: "high",
        from_pct: 0.08,
        to_pct: 0.38,
        is_systemic: true,
        review_count: 47,
        description: "Packaging complaints surge detected",
      },
    ],
  });
});

router.get("/reports/:product_id/pdf", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.product_id)
    ? req.params.product_id[0]
    : req.params.product_id;
  const parsed = GetReportPdfParams.safeParse({ product_id: parseInt(rawId, 10) });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const content = `ReviewIQ Report - Product ${parsed.data.product_id}\nGenerated: ${new Date().toISOString()}`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="report-${parsed.data.product_id}.pdf"`
  );
  res.send(Buffer.from(content));
});

export default router;
