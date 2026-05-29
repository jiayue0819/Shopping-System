"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/components/customer/cart-provider";

export function ClearCartOnSuccess() {
  const searchParams = useSearchParams();
  const { clear } = useCart();

  useEffect(() => {
    if (searchParams.get("success") === "1") {
      clear();
    }
  }, [searchParams, clear]);

  return null;
}
