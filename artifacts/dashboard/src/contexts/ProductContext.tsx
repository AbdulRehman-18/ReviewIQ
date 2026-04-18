import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { storage } from "@/lib/storage";

interface ProductContextType {
  selectedProductId: number | null;
  setSelectedProductId: (id: number | null) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [selectedProductId, _setSelectedProductId] = useState<number | null>(
    () => storage.getSelectedProduct() ?? 1
  );

  useEffect(() => {
    storage.setSelectedProduct(selectedProductId);
  }, [selectedProductId]);

  function setSelectedProductId(id: number | null) {
    _setSelectedProductId(id);
    storage.setSelectedProduct(id);
  }

  return (
    <ProductContext.Provider value={{ selectedProductId, setSelectedProductId }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProduct() {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error("useProduct must be used within a ProductProvider");
  }
  return context;
}
