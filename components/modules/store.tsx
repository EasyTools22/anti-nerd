"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, Pencil, Sparkles } from "lucide-react";
import {
  Badge,
  Card,
  Modal,
  PageHeading,
  useFeedback,
} from "@/components/ui/primitives";
import { MetricLabel } from "@/components/ui/metric-label";
import { StoreStudio } from "./store-studio";
import { StorefrontPreview } from "./storefront-preview";
export function StorePage() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const { preview } = useFeedback();
  return (
    <>
      <PageHeading
        title="Store"
        description="Your online home. Built and managed from one place."
      >
        <button className="button" onClick={() => setPreviewOpen(true)}>
          <Eye size={15} />
          Preview store
        </button>
        <button
          className="button primary"
          onClick={() => preview("Edit store")}
        >
          <Pencil size={15} />
          Edit store
        </button>
      </PageHeading>
      <StoreStudio />
      <div className="store-overview-grid">
        <Card>
          <div className="product-info">
            <p>Store status</p>
            <h3>Ready to imagine</h3>
            <Badge tone="gray">Demo storefront</Badge>
          </div>
        </Card>
        <Card>
          <div className="product-info">
            <p>Products</p>
            <h3>4 sample products</h3>
            <Link className="text-link" href="/products">
              View collection <ArrowRight size={14} />
            </Link>
          </div>
        </Card>
        <Card>
          <div className="product-info">
            <MetricLabel label="Conversion rate" term="Conversion" />
            <h3>3.2%</h3>
            <p>Visitors who buy · Sample rate</p>
          </div>
        </Card>
      </div>
      <div className="store-layout store-details-layout">
        <div className="stack">
          <Card title="Your store details">
            <div className="store-details">
              <div className="detail-row">
                <span>Domain</span>
                <strong>wkexclusive.example</strong>
              </div>
              <div className="detail-row">
                <span>Theme</span>
                <strong>Everyday · Light</strong>
              </div>
              <div className="detail-row">
                <span>Store name</span>
                <strong>WK Exclusive</strong>
              </div>
              <p className="muted">
                A sample domain and theme. No live store is connected or
                published.
              </p>
            </div>
          </Card>
          <Card title="Improve with Anti-Nerd" variant="insight">
            <div className="store-improvement">
              <span className="agent-icon tone-3">
                <Sparkles size={20} />
              </span>
              <h3>Your product page could be easier to scan on mobile.</h3>
              <p>
                Keep the price, key benefits, and delivery details close to the
                buy button.
              </p>
              <Badge tone="gray">Example suggestion · No live analysis</Badge>
              <button
                className="text-link"
                onClick={() => preview("Improve your store")}
              >
                Explore this idea <ArrowRight size={14} />
              </button>
            </div>
          </Card>
        </div>
      </div>
      {previewOpen && (
        <Modal
          title="Store preview"
          className="store-preview-dialog"
          onClose={() => setPreviewOpen(false)}
        >
          <StorefrontPreview />
        </Modal>
      )}
    </>
  );
}
