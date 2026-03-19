import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { userId, action, payload } = await req.json();

        // Ensure we don't operate on the master admin
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
        if (targetUser.email === "admin@gmail.com") {
            return NextResponse.json({ error: "Cannot modify master admin account." }, { status: 403 });
        }

        if (action === "block") {
            const updated = await prisma.user.update({
                where: { id: userId },
                data: { isBlocked: !targetUser.isBlocked }
            });
            return NextResponse.json({ success: true, isBlocked: updated.isBlocked });
        }

        if (action === "delete") {
            await prisma.user.delete({ where: { id: userId } });
            return NextResponse.json({ success: true, message: "User deleted successfully" });
        }

        if (action === "reset_password") {
            if (!payload?.newPassword || payload.newPassword.length < 6) {
                return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
            }
            const hashedPassword = await bcrypt.hash(payload.newPassword, 10);
            await prisma.user.update({
                where: { id: userId },
                data: { password: hashedPassword }
            });
            return NextResponse.json({ success: true, message: "Password updated successfully" });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
