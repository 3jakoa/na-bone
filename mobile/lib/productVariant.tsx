import {
  createContext,
  type ReactNode,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase, type ProductVariant } from "./supabase";

type ProductVariantContextValue = {
  productVariant: ProductVariant;
  productVariantLoaded: boolean;
  isPilot: boolean;
  setProductVariant: (variant: ProductVariant) => void;
  refreshProductVariant: () => Promise<void>;
};

const ProductVariantContext = createContext<ProductVariantContextValue | null>(
  null
);

export function ProductVariantProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [productVariant, setProductVariantState] =
    useState<ProductVariant>("control");
  const [productVariantLoaded, setProductVariantLoaded] = useState(false);

  function setProductVariant(variant: ProductVariant) {
    startTransition(() => {
      setProductVariantState(variant);
      setProductVariantLoaded(true);
    });
  }

  async function refreshProductVariant() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setProductVariant("control");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("product_variant")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data?.product_variant) {
      setProductVariant("control");
      return;
    }

    setProductVariant(data.product_variant as ProductVariant);
  }

  useEffect(() => {
    void refreshProductVariant();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setProductVariant("control");
        return;
      }

      setTimeout(() => {
        void refreshProductVariant();
      }, 0);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      productVariant,
      productVariantLoaded,
      isPilot: productVariant === "poke_v1",
      setProductVariant,
      refreshProductVariant,
    }),
    [productVariant, productVariantLoaded]
  );

  return (
    <ProductVariantContext.Provider value={value}>
      {children}
    </ProductVariantContext.Provider>
  );
}

export function useProductVariant() {
  const context = useContext(ProductVariantContext);
  if (!context) {
    throw new Error("useProductVariant must be used within ProductVariantProvider");
  }

  return context;
}
