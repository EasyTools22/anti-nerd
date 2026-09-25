import { OrdersPage } from "@/components/modules/commerce";
import { ShopifyCommercePage } from "@/components/shopify/commerce-page";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  const { after } = await searchParams;
  return (
    <ShopifyCommercePage view="orders" after={after} demo={<OrdersPage />} />
  );
}
