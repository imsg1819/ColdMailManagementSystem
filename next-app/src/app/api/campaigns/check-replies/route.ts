import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { runPythonScript } from "@/lib/pythonRunner";

// Cron endpoint: scans for replies via IMAP for all users with sent emails
export async function GET(req: NextRequest) {
    try {
        // Get all users who have settings with app passwords configured
        const usersWithSettings = await prisma.settings.findMany({
            where: {
                senderEmail: { not: null },
                senderAppPassword: { not: null },
            },
            select: {
                userId: true,
                senderEmail: true,
                senderAppPassword: true,
            },
        });

        let totalReplied = 0;
        const results: any[] = [];

        for (const userSettings of usersWithSettings) {
            // Find all sent/follow-up contacts for this user that have a Message-ID stored
            const sentContacts = await prisma.recipient.findMany({
                where: {
                    userId: userSettings.userId,
                    status: { in: ["Sent", "Follow-up Sent"] },
                    sentMessageId: { not: null },
                },
                select: { id: true, sentMessageId: true },
            });

            if (sentContacts.length === 0) continue;

            // Call check_replies.py with this user's credentials and contacts
            const pythonInput = JSON.stringify({
                sender_email: userSettings.senderEmail,
                app_password: userSettings.senderAppPassword,
                contacts: sentContacts.map(c => ({
                    id: c.id,
                    sentMessageId: c.sentMessageId,
                })),
                api_url: `http://localhost:3000/api/campaigns/mark-replied`,
            });

            const pyResult = await runPythonScript("check_replies.py", [], pythonInput);

            results.push({
                userId: userSettings.userId,
                checked: sentContacts.length,
                repliedCount: pyResult.repliedCount || 0,
            });

            totalReplied += pyResult.repliedCount || 0;
        }

        return NextResponse.json({
            success: true,
            totalReplied,
            usersChecked: usersWithSettings.length,
            details: results,
        });
    } catch (error: any) {
        console.error("Check replies cron error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
