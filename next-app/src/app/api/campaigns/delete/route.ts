import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { ids } = await req.json();

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "No recipient IDs provided." }, { status: 400 });
        }

        const result = await prisma.recipient.deleteMany({
            where: { id: { in: ids }, userId: session.user.id },
        });

        return NextResponse.json({ success: true, deletedCount: result.count });
    } catch (error: any) {
        console.error("Delete recipients error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
