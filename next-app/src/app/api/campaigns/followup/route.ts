import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { runPythonScript } from "@/lib/pythonRunner";

function generateFollowupBody(recipientName: string) {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <p>Hi ${recipientName},</p>
      
      <p>I wanted to quickly follow up on my previous email. I know things can get busy, but I remain very interested in contributing to your engineering team.</p>
      
      <p>Would you have an opening next week for a brief 10-minute call to discuss my background?</p>
      
      <p>Thank you for your time.</p>
      
      <p>Best regards</p>
    </div>
  `;
}

export async function GET(req: NextRequest) {
    try {
        // In production, you would secure this cron endpoint using an Authorization header 
        // mapped to a CRON_SECRET env variable. For now we execute it securely as an internal API.

        const settings = await prisma.settings.findFirst({
            include: { user: true }
        });

        if (!settings) {
            return NextResponse.json({ error: "No user settings found. Cannot run follow up." }, { status: 400 });
        }

        const oauthToken = await prisma.oAuthToken.findFirst({
            where: { userId: settings.userId }
        });

        if (!oauthToken || !oauthToken.refreshToken) {
            return NextResponse.json({ error: "Gmail not connected." }, { status: 400 });
        }

        const payloadContext = {
            token: {
                access_token: oauthToken.accessToken,
                refresh_token: oauthToken.refreshToken,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
            }
        };

        // Find recipients sent > 3 days ago exactly, who haven't received a follow-up
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const eligibleRecipients = await prisma.recipient.findMany({
            where: {
                status: "Sent",
                lastSentDate: {
                    lte: threeDaysAgo // less than or equal to 3 days ago.
                }
            },
            take: 20
        });

        if (eligibleRecipients.length === 0) {
            return NextResponse.json({ success: true, message: "No eligible recipients for follow-up today." });
        }

        let successCount = 0;
        const errors = [];

        for (const recipient of eligibleRecipients) {
            try {
                const htmlBody = generateFollowupBody(recipient.name || "there");

                const pythonInput = JSON.stringify({
                    ...payloadContext,
                    email: {
                        to: recipient.targetEmail,
                        from: settings.user.email,
                        subject: `Re: Interested in Product / Engineering opportunities at ${recipient.company}`,
                        body: htmlBody
                    }
                });

                const pyResult = await runPythonScript("send_email.py", [], pythonInput);

                if (pyResult.success) {
                    await prisma.recipient.update({
                        where: { id: recipient.id },
                        data: {
                            status: "Follow-up Sent",
                            lastSentDate: new Date() // Updates last sent date again
                        }
                    });
                    successCount++;
                } else {
                    errors.push({ email: recipient.targetEmail, error: pyResult.error });
                }

            } catch (e: any) {
                errors.push({ email: recipient.targetEmail, error: e.message });
            }
        }

        return NextResponse.json({
            success: true,
            sentFollowUps: successCount,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error: any) {
        console.error("Follow-up cron error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
