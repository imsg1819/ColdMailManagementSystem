import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Fetch all users with their recipient counts and settings
        const users = await prisma.user.findMany({
            where: { role: "USER" },
            include: {
                settings: true,
                _count: {
                    select: { recipients: true }
                }
            },
            orderBy: { email: "asc" },
        });

        return NextResponse.json({
            success: true,
            users: users.map(u => ({
                id: u.id,
                email: u.email,
                name: u.name,
                verified: u.verified,
                recipientCount: u._count.recipients,
                hasSenderEmail: !!u.settings?.senderEmail,
                senderEmail: u.settings?.senderEmail || null,
                senderName: u.settings?.senderName || null,
                targetRole: u.settings?.targetRole || null,
                senderAppPassword: u.settings?.senderAppPassword ? "••••••••" : null,
                isBlocked: u.isBlocked,
            })),
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Get a specific user's recipients
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { userId } = await req.json();

        const recipients = await prisma.recipient.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { settings: true },
        });

        return NextResponse.json({
            success: true,
            user: {
                id: user?.id,
                email: user?.email,
                name: user?.name,
                targetRole: user?.settings?.targetRole,
                senderEmail: user?.settings?.senderEmail,
                senderName: user?.settings?.senderName,
                skills: user?.settings?.skills,
                yearsOfExperience: user?.settings?.yearsOfExperience,
                senderAppPassword: user?.settings?.senderAppPassword,
                isBlocked: user?.isBlocked,
            },
            recipients: recipients.map(r => ({
                id: r.id,
                targetEmail: r.targetEmail,
                name: r.name,
                company: r.company,
                status: r.status,
                lastSentDate: r.lastSentDate?.toISOString() || null,
            })),
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
