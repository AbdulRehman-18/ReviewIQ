/**
 * CSV Parser for Dataset Analysis
 * Handles CSV files with proper column detection and data extraction
 */

export interface ParsedCSVData {
  headers: string[];
  rows: Array<Record<string, string>>;
  reviewTexts: string[];
  productColumn?: string;
  categoryColumn?: string;
}

/**
 * Parse CSV content into structured data
 */
export function parseCSV(content: string): ParsedCSVData {
  const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
  
  if (lines.length === 0) {
    return { headers: [], rows: [], reviewTexts: [] };
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length > 0) {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }
  }

  // Detect review column
  const reviewColumn = detectReviewColumn(headers);
  const productColumn = detectProductColumn(headers);
  const categoryColumn = detectCategoryColumn(headers);

  // Extract review texts
  const reviewTexts = rows
    .map(row => row[reviewColumn] || '')
    .filter(text => text.trim().length > 0);

  return {
    headers,
    rows,
    reviewTexts,
    productColumn,
    categoryColumn,
  };
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current.trim());
  
  return result;
}

/**
 * Detect which column contains review text
 */
function detectReviewColumn(headers: string[]): string {
  const reviewKeywords = [
    'review', 'review_text', 'text', 'comment', 'feedback',
    'description', 'content', 'message', 'body', 'opinion'
  ];
  
  // Try exact match first
  for (const keyword of reviewKeywords) {
    const match = headers.find(h => 
      h.toLowerCase().replace(/[_\s-]/g, '') === keyword.replace(/[_\s-]/g, '')
    );
    if (match) return match;
  }
  
  // Try partial match
  for (const keyword of reviewKeywords) {
    const match = headers.find(h => 
      h.toLowerCase().includes(keyword.toLowerCase())
    );
    if (match) return match;
  }
  
  // Default to first text-like column or second column
  return headers.length > 1 ? headers[headers.length - 1] : headers[0];
}

/**
 * Detect which column contains product/feature name
 */
function detectProductColumn(headers: string[]): string | undefined {
  const productKeywords = ['product', 'item', 'feature', 'name', 'title'];
  
  for (const keyword of productKeywords) {
    const match = headers.find(h => 
      h.toLowerCase().includes(keyword.toLowerCase())
    );
    if (match) return match;
  }
  
  return undefined;
}

/**
 * Detect which column contains category
 */
function detectCategoryColumn(headers: string[]): string | undefined {
  const categoryKeywords = ['category', 'type', 'class', 'group'];
  
  for (const keyword of categoryKeywords) {
    const match = headers.find(h => 
      h.toLowerCase().includes(keyword.toLowerCase())
    );
    if (match) return match;
  }
  
  return undefined;
}

/**
 * Group reviews by product/feature
 */
export function groupByProduct(data: ParsedCSVData): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  
  if (!data.productColumn) {
    // No product column, return all reviews under "All Products"
    groups.set('All Products', data.reviewTexts);
    return groups;
  }
  
  const reviewColumn = detectReviewColumn(data.headers);
  
  data.rows.forEach(row => {
    const product = row[data.productColumn!] || 'Unknown';
    const review = row[reviewColumn] || '';
    
    if (review.trim()) {
      if (!groups.has(product)) {
        groups.set(product, []);
      }
      groups.get(product)!.push(review);
    }
  });
  
  return groups;
}

/**
 * Group reviews by category
 */
export function groupByCategory(data: ParsedCSVData): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  
  if (!data.categoryColumn) {
    groups.set('All Categories', data.reviewTexts);
    return groups;
  }
  
  const reviewColumn = detectReviewColumn(data.headers);
  
  data.rows.forEach(row => {
    const category = row[data.categoryColumn!] || 'Unknown';
    const review = row[reviewColumn] || '';
    
    if (review.trim()) {
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(review);
    }
  });
  
  return groups;
}

/**
 * Extract unique products/features from dataset
 */
export function extractProducts(data: ParsedCSVData): string[] {
  if (!data.productColumn) {
    return ['All Products'];
  }
  
  const products = new Set<string>();
  data.rows.forEach(row => {
    const product = row[data.productColumn!];
    if (product && product.trim()) {
      products.add(product.trim());
    }
  });
  
  return Array.from(products).sort();
}

/**
 * Extract unique categories from dataset
 */
export function extractCategories(data: ParsedCSVData): string[] {
  if (!data.categoryColumn) {
    return [];
  }
  
  const categories = new Set<string>();
  data.rows.forEach(row => {
    const category = row[data.categoryColumn!];
    if (category && category.trim()) {
      categories.add(category.trim());
    }
  });
  
  return Array.from(categories).sort();
}
