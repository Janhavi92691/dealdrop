import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scrapeProduct } from "@/lib/firecrawl";
import { sendPriceDropAlert } from "@/lib/email";

export async function GET() {
    return NextResponse.json({
        message: "Price check endpoint is working. Use POST to trigger.",
     });
}

export async function POST(request) {
    try {
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceRoleKey) {
            console.error("Cron configuration error: Supabase credentials missing in server environment");
            return NextResponse.json(
                { error: "Server configuration error: Supabase credentials missing" },
                { status: 500 }
            );
        }

        // Use service role client to bypass RLS and access auth admin
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

        const { data: products, error: productsError } = await supabase
            .from("products")
            .select("*");

        if (productsError) {
            console.error("Failed to fetch products from Supabase:", productsError);
            throw productsError;
        }

        console.log(`[Cron] Found ${products.length} products to check`);

        const results = {
            total: products.length,
            updated: 0,
            failed: 0,
            priceChanges: 0,
            priceDrops: 0,
            alertsAttempted: 0,
            alertsSent: 0,
            alertsFailed: 0,
            details: [],
        };

        for (const product of products) {
            const productAudit = {
                productId: product.id,
                productName: product.name,
                oldPrice: null,
                newPrice: null,
                isPriceChange: false,
                isPriceDrop: false,
                userFound: false,
                hasEmail: false,
                alertAttempted: false,
                alertSent: false,
                status: "pending",
                error: null,
            };

            try {
                const productData = await scrapeProduct(product.url);

                if (!productData || productData.currentPrice === undefined || productData.currentPrice === null) {
                    console.warn(`[Cron] Product ${product.id}: No price extracted from scraper.`);
                    results.failed++;
                    productAudit.status = "failed_scrape";
                    productAudit.error = "No price extracted from URL";
                    results.details.push(productAudit);
                    continue;
                }

                const newPrice = parseFloat(productData.currentPrice);
                // Note: The Supabase table column is 'current_price' (snake_case)
                const rawOldPrice = product.current_price !== undefined && product.current_price !== null
                    ? product.current_price
                    : product.currentPrice;
                const oldPrice = rawOldPrice !== undefined && rawOldPrice !== null
                    ? parseFloat(rawOldPrice)
                    : null;

                productAudit.oldPrice = oldPrice;
                productAudit.newPrice = newPrice;

                if (isNaN(newPrice)) {
                    console.warn(`[Cron] Product ${product.id}: Scraped price is invalid:`, productData.currentPrice);
                    results.failed++;
                    productAudit.status = "invalid_new_price";
                    productAudit.error = `Scraped price is invalid: ${productData.currentPrice}`;
                    results.details.push(productAudit);
                    continue;
                }

                const currency = productData.currencyCode || product.currency || "USD";
                const productName = productData.productName || product.name;
                const imageUrl = productData.productImageUrl || product.image_url;

                // Update product table with latest scraped info
                const { error: updateError } = await supabase
                    .from("products")
                    .update({
                        current_price: newPrice,
                        currency,
                        name: productName,
                        image_url: imageUrl,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", product.id);

                if (updateError) {
                    console.error(`[Cron] Failed to update product ${product.id}:`, updateError);
                    throw updateError;
                }

                results.updated++;

                const updatedProduct = {
                    ...product,
                    name: productName,
                    current_price: newPrice,
                    currency,
                    image_url: imageUrl,
                };

                const hasValidOldPrice = oldPrice !== null && !isNaN(oldPrice);
                const hasPriceChanged = !hasValidOldPrice || oldPrice !== newPrice;

                if (hasPriceChanged) {
                    // Record in price_history
                    const { error: historyError } = await supabase.from("price_history").insert({
                        product_id: product.id,
                        price: newPrice,
                        currency,
                    });

                    if (historyError) {
                        console.error(`[Cron] Failed to insert price_history for product ${product.id}:`, historyError);
                    }

                    results.priceChanges++;
                    productAudit.isPriceChange = true;

                    // Only trigger alert when price has strictly decreased from a known prior price
                    const isPriceDrop = hasValidOldPrice && newPrice < oldPrice;
                    productAudit.isPriceDrop = isPriceDrop;

                    console.log(
                        `[Cron] Product ${product.id}: oldPrice=${oldPrice}, newPrice=${newPrice}, isPriceDrop=${isPriceDrop}`
                    );

                    if (isPriceDrop) {
                        results.priceDrops++;

                        // Retrieve user from Supabase Auth admin
                        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
                            product.user_id
                        );

                        const user = userData?.user;
                        if (userError || !user) {
                            console.error(
                                `[Cron] [Product ${product.id}] User lookup failed for user_id ${product.user_id}:`,
                                userError?.message || "User not found"
                            );
                            results.alertsFailed++;
                            productAudit.userFound = false;
                            productAudit.status = "user_not_found";
                            productAudit.error = userError?.message || "User not found";
                        } else {
                            productAudit.userFound = true;

                            if (!user.email) {
                                console.warn(
                                    `[Cron] [Product ${product.id}] User ${product.user_id} found but has no email address`
                                );
                                results.alertsFailed++;
                                productAudit.hasEmail = false;
                                productAudit.status = "missing_user_email";
                                productAudit.error = "User has no email address";
                            } else {
                                productAudit.hasEmail = true;
                                productAudit.alertAttempted = true;
                                results.alertsAttempted++;

                                console.log(
                                    `[Cron] [Product ${product.id}] Sending price drop email alert: ${oldPrice} -> ${newPrice}`
                                );

                                const emailResult = await sendPriceDropAlert(
                                    user.email,
                                    updatedProduct,
                                    oldPrice,
                                    newPrice
                                );

                                if (emailResult.success) {
                                    results.alertsSent++;
                                    productAudit.alertSent = true;
                                    productAudit.status = "alert_sent";
                                    console.log(`[Cron] [Product ${product.id}] Price-drop email sent successfully.`);
                                } else {
                                    results.alertsFailed++;
                                    productAudit.alertSent = false;
                                    productAudit.status = "alert_failed";
                                    productAudit.error = emailResult.error;
                                    console.error(
                                        `[Cron] [Product ${product.id}] Failed to send price-drop email:`,
                                        emailResult.error
                                    );
                                }
                            }
                        }
                    } else if (hasValidOldPrice && newPrice > oldPrice) {
                        console.log(`[Cron] Product ${product.id}: Price increased from ${oldPrice} to ${newPrice}. No alert sent.`);
                        productAudit.status = "price_increased";
                    } else {
                        console.log(`[Cron] Product ${product.id}: Initial price recorded (${newPrice}). No alert sent.`);
                        productAudit.status = "initial_price_recorded";
                    }
                } else {
                    console.log(`[Cron] Product ${product.id}: Price unchanged (${newPrice}).`);
                    productAudit.status = "price_unchanged";
                }

                results.details.push(productAudit);
            } catch (error) {
                console.error(`[Cron] Error processing product ${product.id}:`, error);
                results.failed++;
                productAudit.status = "error";
                productAudit.error = error.message || "Unknown error";
                results.details.push(productAudit);
            }
        }

        return NextResponse.json({
            success: true,
            message: "Price check completed",
            results,
        });
    } catch (error) {
        console.error("Cron job error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// curl -X POST https://yourdealdrop.vercel.app/api/cron/check-prices \-H "Authorization: Bearer YOUR_CRON_SECRET"