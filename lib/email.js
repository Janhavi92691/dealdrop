import { Resend } from "resend";

export async function sendPriceDropAlert(
    userEmail,
    product,
    oldPrice,
    newPrice,
) {
    try {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            console.error("Resend error: RESEND_API_KEY is not defined in environment variables");
            return {
                success: false,
                error: "RESEND_API_KEY is not configured",
            };
        }

        const resend = new Resend(apiKey);
        const fromEmail = process.env.RESEND_FROM_EMAIL || "DealDrop <onboarding@resend.dev>";

        const priceDrop = oldPrice - newPrice;
        const percentageDrop = oldPrice > 0 ? ((priceDrop / oldPrice) * 100).toFixed(1) : "0.0";
        const formattedOldPrice = Number(oldPrice).toFixed(2);
        const formattedNewPrice = Number(newPrice).toFixed(2);
        const formattedPriceDrop = Number(priceDrop).toFixed(2);
        const currency = product.currency || "USD";
        const productName = product.name || "Tracked Product";
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dealdrop.vercel.app";

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: Array.isArray(userEmail) ? userEmail : [userEmail],
            subject: `🎉 Price Drop Alert: ${productName}`,
            html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            
            <div style="background: linear-gradient(135deg, #FA5D19 0%, #FF8C42 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Price Drop Alert!</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              
              ${
                product.image_url
                  ? `
                <div style="text-align: center; margin-bottom: 20px;">
                  <img src="${product.image_url}" alt="${productName}" style="max-width: 200px; height: auto; border-radius: 8px; border: 1px solid #e5e7eb;">
                </div>
              `
                  : ""
              }
              
              <h2 style="color: #1f2937; margin-top: 0;">${productName}</h2>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  <strong>Price dropped by ${percentageDrop}%!</strong>
                </p>
              </div>
              
              <table style="width: 100%; margin: 20px 0;">
                <tr>
                  <td style="padding: 10px; background: #f9fafb; border-radius: 4px;">
                    <div style="font-size: 14px; color: #6b7280;">Previous Price</div>
                    <div style="font-size: 20px; color: #9ca3af; text-decoration: line-through;">
                      ${currency} ${formattedOldPrice}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px;">
                    <div style="font-size: 14px; color: #6b7280;">Current Price</div>
                    <div style="font-size: 32px; color: #FA5D19; font-weight: bold;">
                      ${currency} ${formattedNewPrice}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px; background: #dcfce7; border-radius: 4px;">
                    <div style="font-size: 14px; color: #166534;">You Save</div>
                    <div style="font-size: 24px; color: #16a34a; font-weight: bold;">
                      ${currency} ${formattedPriceDrop}
                    </div>
                  </td>
                </tr>
              </table>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${product.url || '#'}" 
                   style="display: inline-block; background: #FA5D19; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  View Product →
                </a>
              </div>
              
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                <p>You're receiving this email because you're tracking this product on Price Tracker.</p>
                <p style="margin-top: 10px;">
                  <a href="${appUrl}" style="color: #FA5D19; text-decoration: none;">
                    View All Tracked Products
                  </a>
                </p>
              </div>
            </div>
            
          </body>
        </html>
      `,
        });

        if (error) {
            console.error("Resend error:", error);
            return {
                success: false,
                error: error.message || (typeof error === "string" ? error : JSON.stringify(error)),
            };
        }

        return { success: true, data };
    } catch (error) {
        console.error("Email error:", error);
        return {
            success: false,
            error: error.message || (typeof error === "string" ? error : "Unknown email error"),
        };
    }
}