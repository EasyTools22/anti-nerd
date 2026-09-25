import { ArrowUpRight, ShoppingBag } from "lucide-react";
import { ProductSilhouette } from "./product-silhouette";
import { products, money } from "@/lib/mock-data/business";
/** A rendered storefront concept, never a live checkout or external site. */
export function StorefrontPreview({
  improved = false,
}: {
  improved?: boolean;
}) {
  return (
    <div
      className={`storefront-preview ${improved ? "storefront-improved" : ""}`}
      aria-label="Sample WK Exclusive storefront"
    >
      <div className="storefront-browser">
        <span />
        <span />
        <span />
        <small>wkexclusive.example · Storefront concept</small>
      </div>
      <div className="storefront-nav">
        <strong>WK EXCLUSIVE</strong>
        <span>Everyday essentials</span>
        <ShoppingBag size={17} />
      </div>
      <div className="storefront-hero">
        <div>
          <small>THE EVERYDAY COLLECTION</small>
          <h3>
            Good things.
            <br />
            Made for every day.
          </h3>
          <p>Thoughtfully chosen. Effortlessly yours.</p>
          <span className="storefront-cta">
            Explore the collection <ArrowUpRight size={14} />
          </span>
          {improved && (
            <span className="storefront-delivery">
              Tracked delivery · Clear updates, every step.
            </span>
          )}
        </div>
        <div className="storefront-object" aria-hidden="true">
          <ProductSilhouette />
          <span>WK</span>
        </div>
      </div>
      <div className="storefront-products">
        {products.slice(0, 3).map((product, i) => (
          <div key={product.name}>
            <div className={`storefront-product-art art-${i}`}>
              <ProductSilhouette variant={i} />
            </div>
            <strong>{product.name}</strong>
            <span>{money(product.price)}</span>
          </div>
        ))}
      </div>
      <p className="storefront-caption">
        Sample storefront · Shopping and checkout are not connected.
      </p>
    </div>
  );
}
