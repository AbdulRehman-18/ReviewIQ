import { createContext, useContext, useState, ReactNode } from "react";
import { useProduct } from "@/contexts/ProductContext";

export interface DashboardMetrics {
  overview: {
    total_reviews: number;
    valid_reviews: number;
    spam_count: number;
    duplicate_count: number;
    sarcastic_count: number;
    emerging_issues_count: number;
    languages_detected: string[];
    language_breakdown: Record<string, number>;
    overall_sentiment: { positive: number; neutral: number; negative: number; ambiguous: number; sarcasm: number };
  };
  features: any[];
  issues: any[];
  reviews: any;
  trends: any[];
  isDataIngested: boolean;
}

export interface IngestedProduct {
  id: number;
  name: string;
}

interface IngestContextType {
  data: DashboardMetrics;
  products: IngestedProduct[];
  setMultiProductData: (productsMap: Record<number, DashboardMetrics>, productList: IngestedProduct[]) => void;
  resetData: () => void;
}

const defaultState: DashboardMetrics = {
  overview: {
    total_reviews: 0,
    valid_reviews: 0,
    spam_count: 0,
    duplicate_count: 0,
    sarcastic_count: 0,
    emerging_issues_count: 0,
    languages_detected: [],
    language_breakdown: {},
    overall_sentiment: { positive: 0, neutral: 0, negative: 0, ambiguous: 0, sarcasm: 0 }
  },
  features: [],
  issues: [],
  reviews: { items: [], total: 0, page: 1, size: 10, pages: 0 },
  trends: [],
  isDataIngested: false,
};

const IngestContext = createContext<IngestContextType | undefined>(undefined);

export function IngestProvider({ children }: { children: ReactNode }) {
  const { selectedProductId } = useProduct();
  const [productsMap, setProductsMap] = useState<Record<number, DashboardMetrics>>({});
  const [productsList, setProductsList] = useState<IngestedProduct[]>([]);

  const setMultiProductData = (newMap: Record<number, DashboardMetrics>, newList: IngestedProduct[]) => {
    setProductsMap(newMap);
    setProductsList(newList);
  };

  const resetData = () => {
    setProductsMap({});
    setProductsList([]);
  };

  const activeData = (selectedProductId && productsMap[selectedProductId]) || defaultState;

  return (
    <IngestContext.Provider value={{ data: activeData, products: productsList, setMultiProductData, resetData }}>
      {children}
    </IngestContext.Provider>
  );
}

export function useIngest() {
  const context = useContext(IngestContext);
  if (context === undefined) {
    throw new Error("useIngest must be used within an IngestProvider");
  }
  return context;
}
