"use client";

import { deleteProduct } from "@/app/actions";
import React, { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  TrendingDown,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import PriceChart from "./PriceChart";

const ProductCard = ({ product }) => {
  const [showChart, setShowChart] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Remove this product from tracking?")) return;

    setDeleting(true);
    const result = await deleteProduct(product.id);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message || "Product deleted successfully!");
      setUrl("");
    }

    setDeleting(false);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className={"pb-3"}>
        <div className="flex gap-4">
          {product.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              className="w-20 h-20 object-cover rounded-md border"
            />
          )}

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">
              {product.name}
            </h3>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-orange-500">
                {product.currency} {product.current_price}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                <TrendingDown className="h-4 w-4 shrink-0" />
                <span>Tracking</span>
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 mt-5 flex-wrap">
          {/* Show Chart Button */}
          <Button
            variant="outline"
            className="flex items-center gap-2 border-gray-300 hover:bg-gray-100 px-4 py-2"
            onClick={() => setShowChart(!showChart)}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                showChart ? "rotate-180" : ""
              }`}
            />
            <span>{showChart ? "Hide Chart" : "Show Chart"}</span>
          </Button>

          {/* View Product Button */}
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-100"
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            <span>View Product</span>
          </a>

          {/* Remove Button */}
          <Button
            variant="outline"
            className="inline-flex items-center gap-2 border-red-200 px-4 py-2 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => handleDelete(product.id)}
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span>Remove</span>
          </Button>
        </div>
      </CardContent>
      {showChart && (
        <CardFooter className="pt-0">
          <PriceChart productId={product.id} />
        </CardFooter>
      )}
    </Card>
  );
};

export default ProductCard;
