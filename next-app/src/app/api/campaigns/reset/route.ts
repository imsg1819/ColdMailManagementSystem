import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Reset all "Sent" recipients back to "Pending" — scoped to current user
        const result = await prisma.recipient.updateMany({
            where: { status: "Sent", userId: session.user.id },
            data: { status: "Pending", lastSentDate: null }
        });

        return NextResponse.json({ success: true, count: result.count });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
