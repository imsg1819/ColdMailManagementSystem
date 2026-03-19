import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";

// Called by check_replies.py to mark a contact as "Replied"
export async function POST(req: NextRequest) {
    try {
        const { recipientId } = await req.json();

        if (!recipientId) {
            return NextResponse.json({ error: "Missing recipientId" }, { status: 400 });
        }

        // Update status to Replied
        await prisma.recipient.update({
            where: { id: recipientId },
            data: { status: "Replied" },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
