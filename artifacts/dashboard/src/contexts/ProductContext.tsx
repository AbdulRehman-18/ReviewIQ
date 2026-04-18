import { createContext, useContext, useState, ReactNode } from "react";

interface ProductContextType {
  selectedProductId: number | null;
  setSelectedProductId: (id: number | null) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [selectedProductId, setSelectedProductId] = useState<number | null>(1);

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
