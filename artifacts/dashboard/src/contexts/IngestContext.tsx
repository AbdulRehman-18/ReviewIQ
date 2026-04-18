import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useProduct } from "@/contexts/ProductContext";
import { storage } from "@/lib/storage";

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
    overall_sentiment: {
      positive: number;
      neutral: number;
      negative: number;
      ambiguous: number;
      sarcasm: number;
    };
  };
  features: any[];
  issues: any[];
  reviews: any;
  trends: any[];
  isDataIngested: boolean;
  productsList?: string[];
  productsData?: Map<string, {
    reviews: any[];
    features: string[];
    stats: any;
  }>;
}

export interface IngestedProduct {
  id: number;
  name: string;
}

interface IngestContextType {
  data: DashboardMetrics;
  products: IngestedProduct[];
  productsMap: Record<number, DashboardMetrics>;
  selectedProduct: string | null;
  selectedFeature: string | null;
  setSelectedProduct: (product: string | null) => void;
  setSelectedFeature: (feature: string | null) => void;
  setIngestedData: (data: Omit<DashboardMetrics, "issues"> & { issues?: any[] }, productName?: string) => void;
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
    overall_sentiment: { positive: 0, neutral: 0, negative: 0, ambiguous: 0, sarcasm: 0 },
  },
  features: [],
  issues: [],
  reviews: { items: [], total: 0, page: 1, size: 10, pages: 0 },
  trends: [],
  isDataIngested: false,
};

const IngestContext = createContext<IngestContextType | undefined>(undefined);

export function IngestProvider({ children }: { children: ReactNode }) {
  const { selectedProductId, setSelectedProductId } = useProduct();

  const [productsMap, setProductsMap] = useState<Record<number, DashboardMetrics>>(
    () => storage.getProductsMap<DashboardMetrics>()
  );
  const [productsList, setProductsList] = useState<IngestedProduct[]>(
    () => storage.getProductsList<IngestedProduct>()
  );
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  // Persist products map to localStorage whenever it changes
  useEffect(() => {
    storage.setProductsMap(productsMap);
  }, [productsMap]);

  // Persist products list to localStorage whenever it changes
  useEffect(() => {
    storage.setProductsList(productsList);
  }, [productsList]);

  // Auto-select first product if none selected
  useEffect(() => {
    if (productsList.length > 0 && !selectedProductId) {
      setSelectedProductId(productsList[0].id);
    }
  }, [productsList, selectedProductId, setSelectedProductId]);

  const setIngestedData = (
    data: Omit<DashboardMetrics, "issues"> & { issues?: any[] },
    productName?: string
  ) => {
    const productId = selectedProductId ?? Date.now();
    const nextData: DashboardMetrics = { ...data, issues: data.issues ?? [], isDataIngested: true };

    setProductsMap((prev) => ({ ...prev, [productId]: nextData }));

    setProductsList((prev) => {
      if (prev.some((p) => p.id === productId)) return prev;
      const name = productName ?? `Product ${prev.length + 1}`;
      return [...prev, { id: productId, name }];
    });

    if (!selectedProductId) {
      setSelectedProductId(productId);
    }
  };

  const setMultiProductData = (
    newMap: Record<number, DashboardMetrics>,
    newList: IngestedProduct[]
  ) => {
    setProductsMap(newMap);
    setProductsList(newList);
    if (newList.length > 0) {
      setSelectedProductId(newList[0].id);
    }
  };

  const resetData = () => {
    setProductsMap({});
    setProductsList([]);
    setSelectedProductId(null);
    storage.clearAll();
  };

  const activeData =
    (selectedProductId !== null && productsMap[selectedProductId]) || defaultState;

  return (
    <IngestContext.Provider
      value={{
        data: activeData,
        products: productsList,
        productsMap,
        setIngestedData,
        setMultiProductData,
        resetData,
      }}
    >
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
