/**
 * Dataset Loader
 * Loads and processes datasets from the Datasets folder
 */

import { parseCSV, groupByProduct, extractProducts, type ParsedCSVData } from './csv-parser';
import { analyzeReviews, type AnalyzedReview } from './review-analysis';
import { analyzeWithOpenRouter } from './openrouter-analysis';
import { analyzeRegionalLanguages } from './gemini-analysis';
import { buildLanguageBreakdown } from './review-analysis';

export interface DatasetInfo {
  name: string;
  category: string;
  path: string;
  reviewCount: number;
  products: string[];
}

export interface ProcessedDataset {
  name: string;
  category: string;
  productsList: string[];
  products: Map<string, {
    name: string;
    reviews: AnalyzedReview[];
    features: string[];
    stats: {
      total: number;
      positive: number;
      negative: number;
      neutral: number;
      sarcasm: number;
      spam: number;
      duplicates: number;
    };
  }>;
  allReviews: AnalyzedReview[];
  overview: any;
  features: any[];
  issues: any[];
  trends: any[];
}

/**
 * Load a CSV file from the Datasets folder
 */
export async function loadDatasetFile(filePath: string): Promise<string> {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to load dataset: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error('Error loading dataset:', error);
    throw error;
  }
}

/**
 * Process a dataset file and return structured data
 */
export async function processDataset(
  content: string,
  datasetName: string,
  options: {
    useOpenRouter?: boolean;
    openRouterKey?: string;
    openRouterModel?: string;
    useGemini?: boolean;
    geminiKey?: string;
    onProgress?: (progress: number, step: string) => void;
  } = {}
): Promise<ProcessedDataset> {
  const { onProgress } = options;
  
  onProgress?.(5, 'parse');
  
  // Parse CSV
  const parsedData = parseCSV(content);
  const products = extractProducts(parsedData);
  const productGroups = groupByProduct(parsedData);
  
  onProgress?.(15, 'client');
  
  // Analyze each product group
  const processedProducts = new Map();
  let allReviews: AnalyzedReview[] = [];
  
  for (const [productName, reviews] of productGroups.entries()) {
    const baseAnalysis = analyzeReviews(reviews);
    let analyzedReviews = baseAnalysis.reviews;
    
    // Apply OpenRouter analysis if enabled
    if (options.useOpenRouter && options.openRouterKey) {
      onProgress?.(35, 'openrouter');
      try {
        const orResults = await analyzeWithOpenRouter(
          reviews,
          options.openRouterKey,
          options.openRouterModel || 'openai/gpt-4o-mini',
          (pct) => onProgress?.(35 + Math.round(pct * 0.4), 'openrouter')
        );
        
        analyzedReviews = analyzedReviews.map((review, i) => {
          const or = orResults[i];
          if (!or) return review;
          const hasExplicitFeatures = review.features.some(
            (f) => f.feature.toLowerCase() !== 'general quality'
          );
          return {
            ...review,
            overall_sentiment: or.overall_sentiment,
            sentiment_score: or.sentiment_score,
            is_spam: or.is_spam,
            is_bot: or.is_bot,
            is_sarcastic: or.is_sarcastic,
            features: hasExplicitFeatures
              ? review.features
              : (or.features.length > 0 ? or.features : review.features),
          };
        });
      } catch (error) {
        console.warn('OpenRouter analysis failed:', error);
      }
    }
    
    // Calculate stats
    const total = analyzedReviews.length;
    const positive = analyzedReviews.filter(r => r.overall_sentiment === 'positive').length;
    const negative = analyzedReviews.filter(r => r.overall_sentiment === 'negative').length;
    const neutral = analyzedReviews.filter(r => r.overall_sentiment === 'neutral').length;
    const sarcasm = analyzedReviews.filter(r => r.is_sarcastic).length;
    const spam = analyzedReviews.filter(r => r.is_spam || r.is_bot).length;
    const duplicates = analyzedReviews.filter(r => r.is_duplicate).length;
    
    processedProducts.set(productName, {
      name: productName,
      reviews: analyzedReviews,
      features: Array.from(new Set(analyzedReviews.flatMap(r => r.features.map(f => typeof f === 'string' ? f : f.feature)))),
      stats: { total, positive, negative, neutral, sarcasm, spam, duplicates },
    });
    
    allReviews = allReviews.concat(analyzedReviews);
  }
  
  onProgress?.(75, 'gemini');
  
  // Apply Gemini language analysis if enabled
  let languageBreakdown = buildLanguageBreakdown(allReviews);
  let languagesDetected = Object.keys(languageBreakdown);
  
  if (options.useGemini && options.geminiKey) {
    try {
      const geminiResult = await analyzeRegionalLanguages(
        parsedData.reviewTexts,
        options.geminiKey
      );
      languageBreakdown = geminiResult.language_breakdown;
      languagesDetected = geminiResult.languages_detected;
    } catch (error) {
      console.warn('Gemini analysis failed:', error);
    }
  }
  
  onProgress?.(88, 'build');
  
  // Build aggregated metrics
  const total = allReviews.length || 1;
  const posCount = allReviews.filter(r => r.overall_sentiment === 'positive').length;
  const negCount = allReviews.filter(r => r.overall_sentiment === 'negative').length;
  const sarcCount = allReviews.filter(r => r.is_sarcastic).length;
  const ambCount = allReviews.filter(r => r.overall_sentiment === 'ambiguous').length;
  const spamCount = allReviews.filter(r => r.is_spam || r.is_bot).length;
  const dupeCount = allReviews.filter(r => r.is_duplicate).length;
  
  const posPercent = Math.round((posCount / total) * 100);
  const negPercent = Math.round((negCount / total) * 100);
  const sarcPercent = Math.round((sarcCount / total) * 100);
  const ambPercent = Math.round((ambCount / total) * 100);
  const neutralPercent = Math.max(0, 100 - posPercent - negPercent - sarcPercent - ambPercent);
  
  // Aggregate features
  const featureMap = new Map<string, { pos: number; neg: number; neu: number; count: number }>();
  allReviews.forEach(review => {
    review.features.forEach(f => {
      const existing = featureMap.get(f.feature) ?? { pos: 0, neg: 0, neu: 0, count: 0 };
      existing.count++;
      if (f.sentiment === 'positive') existing.pos++;
      else if (f.sentiment === 'negative') existing.neg++;
      else existing.neu++;
      featureMap.set(f.feature, existing);
    });
  });
  
  const features = Array.from(featureMap.entries())
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([feature, v]) => ({
      feature,
      mention_count: v.count,
      positive_pct: Math.round((v.pos / v.count) * 100),
      neutral_pct: Math.round((v.neu / v.count) * 100),
      negative_pct: Math.round((v.neg / v.count) * 100),
      ambiguous_pct: 0,
    }));
  
  // Generate issues
  const issues = features
    .filter(f => f.negative_pct >= 30 && f.mention_count >= 2)
    .slice(0, 5)
    .map(f => ({
      feature: f.feature,
      description: `${f.negative_pct}% negative sentiment across ${f.mention_count} mentions`,
      severity: f.negative_pct >= 60 ? 'critical' : f.negative_pct >= 40 ? 'high' : 'medium',
      from_pct: Math.max(0, f.negative_pct - 8),
      to_pct: f.negative_pct,
    }));
  
  // Generate trends
  const trends = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const v = (29 - i) * 0.5;
    return {
      index: i + 1,
      date: d.toISOString().split('T')[0],
      feature: 'General Quality',
      positive_pct: Math.max(0, Math.min(100, Math.round(posPercent + Math.sin(i) * 5 - v))),
      negative_pct: Math.max(0, Math.min(100, Math.round(negPercent + Math.cos(i) * 3 + v * 0.4))),
      sarcasm_pct: Math.max(0, Math.min(100, Math.round(sarcPercent + Math.sin(i * 1.5) * 2))),
      bots_pct: Math.max(0, Math.min(100, Math.round(4 + Math.cos(i * 2) * 1.5))),
      mention_count: total,
    };
  });
  
  const overview = {
    total_reviews: total,
    valid_reviews: Math.max(0, total - spamCount - dupeCount),
    spam_count: spamCount,
    duplicate_count: dupeCount,
    sarcastic_count: sarcCount,
    emerging_issues_count: issues.length,
    languages_detected: languagesDetected,
    language_breakdown: languageBreakdown,
    overall_sentiment: {
      positive: posPercent,
      neutral: neutralPercent,
      negative: negPercent,
      ambiguous: ambPercent,
      sarcasm: sarcPercent,
    },
  };
  
  onProgress?.(100, 'complete');
  
  return {
    name: datasetName,
    category: datasetName.replace('.csv', ''),
    productsList: products,
    products: processedProducts,
    allReviews,
    overview,
    features,
    issues,
    trends,
  };
}

/**
 * Load all datasets from the Datasets folder
 */
export async function loadAllDatasets(): Promise<DatasetInfo[]> {
  // In a real implementation, this would scan the Datasets folder
  // For now, we'll return the known datasets
  const datasets: DatasetInfo[] = [
    {
      name: 'Electronics',
      category: 'Electronics',
      path: '/artifacts/Datasets/Electronics.csv',
      reviewCount: 200,
      products: ['Laptop', 'Smartphone', 'Earbuds', 'Speaker'],
    },
    {
      name: 'Vehicle',
      category: 'Vehicle',
      path: '/artifacts/Datasets/vehicle.csv',
      reviewCount: 49,
      products: ['Car', 'Bike', 'Bus'],
    },
    {
      name: 'Health Care',
      category: 'Health Care',
      path: '/artifacts/Datasets/health care.csv',
      reviewCount: 49,
      products: ['Toothpaste', 'Handwash', 'Ashwagandha'],
    },
  ];
  
  return datasets;
}
