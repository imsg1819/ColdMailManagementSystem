import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

interface ContactRow {
    name: string;
    company: string;
    email: string;
    location?: string;
    timezone?: string;
    timezoneEstimated?: boolean;
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const contacts: ContactRow[] = body.contacts || [];

        if (!contacts.length) {
            return NextResponse.json({ error: "No contacts to import" }, { status: 400 });
        }

        // Fetch existing emails for this user to avoid duplicates
        const existingRecipients = await prisma.recipient.findMany({
            where: { userId: session.user.id },
            select: { targetEmail: true },
        });
        const existingEmailsDb = new Set(existingRecipients.map(r => r.targetEmail.toLowerCase()));

        const uniqueEmails = new Set<string>();
        const toInsert = [];

        for (const c of contacts) {
            const emailLower = c.email.toLowerCase().trim();
            if (!emailLower || uniqueEmails.has(emailLower) || existingEmailsDb.has(emailLower)) {
                continue;
            }
            uniqueEmails.add(emailLower);
            toInsert.push({
                userId: session.user.id,
                name: c.name || null,
                company: c.company || null,
                targetEmail: c.email.trim(),
                location: c.location || null,
                timezone: c.timezone || "America/New_York",
                timezoneEstimated: c.timezoneEstimated ?? true,
                status: "Pending",
            });
        }

        if (toInsert.length === 0) {
            return NextResponse.json({ error: "All contacts already exist or are invalid" }, { status: 400 });
        }

        const created = await prisma.recipient.createMany({ data: toInsert });

        return NextResponse.json({ success: true, count: created.count });
    } catch (error: any) {
        console.error("Confirm Upload Error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
