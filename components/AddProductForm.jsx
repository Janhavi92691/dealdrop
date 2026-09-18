"use client";

import React, { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";
import { AuthModal } from "./AuthModal";
import { addProduct } from "@/app/actions";
import { toast } from "sonner";

const AddProductForm = ({ user }) => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("url", url);

    const result = await addProduct(formData);

    console.log("here");

    if (result.error){
      toast.error(result.error);
    } else {
      toast.success(result.message || "Product tracked successfully!");
      setUrl("");
    }

    setLoading(false);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste product URL (Amazon, Flipkart, etc.)"
            className="h-14 w-full rounded-xl border-gray-300 px-5 text-base shadow-sm focus:border-orange-400 focus:ring-orange-200"
            required
            disabled={loading}
          />

          <Button
            className="h-14 rounded-xl bg-orange-500 px-8 text-base font-semibold text-white shadow-md transition-all hover:bg-orange-600 hover:shadow-lg"
            type="submit"
            disabled={loading}
            size={"lg"}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Track Price"
            )}
          </Button>
        </div>
      </form>

      {/* Auth Modal */}
      <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
      />
    </>
  );
};

export default AddProductForm;
