import Firecrawl from "@mendable/firecrawl-js";

const firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });

export async function scrapeProduct(url) {
  try {
    const result = await firecrawl.scrape(url, {
      formats: [
        {
          type: "json",
          schema: {
            type: "object",
            required: ["productName", "currentPrice"],
            properties: {
              productName: {
                type: "string",
              },
              currentPrice: {
                type: "string",
              },
              currencyCode: {
                type: "string",
              },
              productImageUrl: {
                type: "string",
              },
            },
          },
          prompt:
            "Extract the product name as 'productName', current price as a number as 'currentPrice', currency code (USD, EUR, etc) as 'currencyCode', and product image URL as 'productImageUrl' if available",
        },
      ],
    });

    let extractedData = result.json || {};
    
    // Fallback to page metadata if JSON schema extraction was incomplete
    if (!extractedData.productName && result.metadata) {
        extractedData.productName = result.metadata.ogTitle || result.metadata["og:title"] || result.metadata.title;
    }
    if (!extractedData.productImageUrl && result.metadata) {
        extractedData.productImageUrl = result.metadata.ogImage || result.metadata["og:image"];
    }

    if (!extractedData || !extractedData.productName) {
        throw new Error("No data extracted from URL");
    }

    // Clean price string (e.g. "₹1,379.00" -> "1379.00", ",36750" -> "36750")
    if (extractedData.currentPrice && typeof extractedData.currentPrice === "string") {
        const cleaned = extractedData.currentPrice.replace(/[^0-9.]/g, "");
        if (cleaned) {
            extractedData.currentPrice = cleaned;
        }
    }

    return extractedData;
  } catch (error) {
    const errMsg = error?.message || (typeof error === "string" ? error : "Unknown scraping error");
    console.error(`Firecrawl scrape error for ${url}:`, errMsg);
    throw new Error(`Failed to scrape product: ${errMsg}`);
  }
}

