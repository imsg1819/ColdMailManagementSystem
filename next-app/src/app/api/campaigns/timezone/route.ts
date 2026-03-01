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

        const { id, timezone } = await req.json();

        if (!id || !timezone) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Verify ownership
        const recipient = await prisma.recipient.findUnique({ where: { id } });
        if (!recipient || recipient.userId !== session.user.id) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        await prisma.recipient.update({
            where: { id },
            data: {
                timezone,
                timezoneEstimated: false // User manually setting it makes it non-estimated
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Timezone Override API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
