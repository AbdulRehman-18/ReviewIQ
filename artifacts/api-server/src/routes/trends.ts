import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, reviewsTable } from "@workspace/db";
import {
  GetProductTrendsParams,
  GetProductTrendsQueryParams,
  GetEmergingIssuesParams,
  GetAnomaliesParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/products/:id/trends", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const paramsResult = GetProductTrendsParams.safeParse({ id: parseInt(rawId, 10) });
  if (!paramsResult.success) {
    res.status(400).json({ error: paramsResult.error.message });
    return;
  }

  const queryResult = GetProductTrendsQueryParams.safeParse(req.query);
  if (!queryResult.success) {
    res.status(400).json({ error: queryResult.error.message });
    return;
  }

  const features = ["packaging", "taste", "price"];
  const now = new Date();
  const snapshots: Array<{
    index: number;
    date: string;
    feature: string;
    negative_pct: number;
    positive_pct: number;
    mention_count: number;
  }> = [];

  for (let i = 0; i < 14; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (13 - i));
    const dateStr = date.toISOString().split("T")[0];

    for (const feature of features) {
      let baseNeg = feature === "packaging" ? 15 : feature === "price" ? 25 : 10;
      if (i > 10 && feature === "packaging") baseNeg = 38;
      snapshots.push({
        index: i,
        date: dateStr,
        feature,
        negative_pct: baseNeg + (Math.random() - 0.5) * 5,
        positive_pct: 60 - baseNeg + (Math.random() - 0.5) * 5,
        mention_count: Math.floor(20 + Math.random() * 30),
      });
    }
  }

  res.json(snapshots);
});

router.get("/products/:id/trends/emerging", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const paramsResult = GetEmergingIssuesParams.safeParse({ id: parseInt(rawId, 10) });
  if (!paramsResult.success) {
    res.status(400).json({ error: paramsResult.error.message });
    return;
  }

  res.json([
    {
      feature: "packaging",
      severity: "high",
      from_pct: 0.08,
      to_pct: 0.38,
      is_systemic: true,
      review_count: 47,
      description: "Packaging complaints have surged from 8% to 38% negative over the last 50 reviews. Multiple users report damaged boxes and poor sealing.",
    },
    {
      feature: "delivery",
      severity: "medium",
      from_pct: 0.12,
      to_pct: 0.24,
      is_systemic: false,
      review_count: 18,
      description: "Delivery delays mentioned more frequently, possibly related to a regional distribution issue.",
    },
  ]);
});

router.get("/products/:id/trends/anomalies", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const paramsResult = GetAnomaliesParams.safeParse({ id: parseInt(rawId, 10) });
  if (!paramsResult.success) {
    res.status(400).json({ error: paramsResult.error.message });
    return;
  }

  const now = new Date();
  const dates: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }

  res.json([
    {
      date: dates[11],
      feature: "packaging",
      delta: 0.23,
      description: "Packaging negative sentiment spiked +23pp — coincides with new supplier batch",
    },
    {
      date: dates[6],
      feature: "price",
      delta: 0.12,
      description: "Price complaints increased +12pp following recent price adjustment",
    },
  ]);
});

export default router;
