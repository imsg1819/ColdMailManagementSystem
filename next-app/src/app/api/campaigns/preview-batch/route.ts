import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { existsSync } from "fs";

// Same email generation logic as send route
function generateEmailBody(recipientName: string | null, company: string | null, settings: any) {
    const role = settings.targetRole || "Software Engineer";
    const yoe = settings.yearsOfExperience || "several years";
    const skills = settings.skills ? `My core skills include ${settings.skills}.` : "";
    const senderName = settings.senderName || "A Job Seeker";

    const links: string[] = [];
    if (settings.linkedinUrl) links.push(`<a href="${settings.linkedinUrl}" style="color:#2563eb;">LinkedIn</a>`);
    if (settings.githubUrl) links.push(`<a href="${settings.githubUrl}" style="color:#2563eb;">GitHub</a>`);
    if (settings.portfolioUrl) links.push(`<a href="${settings.portfolioUrl}" style="color:#2563eb;">Portfolio</a>`);
    const linksSection = links.length > 0 ? `<p>You can learn more about my work here: ${links.join(" | ")}</p>` : "";

    const greeting = recipientName ? `Hi ${recipientName},` : "Dear Hiring Manager,";
    const companyMention = company
        ? `I am reaching out regarding potential opportunities at <strong>${company}</strong>.`
        : "I am reaching out regarding potential opportunities at your organization.";
    const companyRef = company ? company : "your team";

    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <p>${greeting}</p>
      <p>I hope this email finds you well.</p>
      <p>${companyMention} I am highly interested in joining as a <strong>${role}</strong>.</p>
      <p>With <strong>${yoe}</strong> of experience, I bring a strong background in software development. ${skills}</p>
      ${linksSection}
      <p>I have attached my resume for your convenience. I would love the chance to discuss how my background and skills would be an asset to ${companyRef}. Are you available for a brief chat sometime next week?</p>
      <p>Looking forward to hearing from you.</p>
      <p>Best regards,<br>${senderName}</p>
    </div>`;
}

function generateSubject(company: string | null, settings: any) {
    const role = settings.targetRole || "Software Engineer";
    if (company) return `Application for ${role} Position at ${company}`;
    return `Application for ${role} Position — Experienced Candidate`;
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const recipientIds: string[] = body.recipientIds || [];

        const settings = await prisma.settings.findUnique({
            where: { userId: session.user.id },
        });

        if (!settings) {
            return NextResponse.json({ error: "Configure settings first." }, { status: 400 });
        }

        // Find recipients — if no IDs specified, get all pending
        const whereClause: any = { userId: session.user.id };
        if (recipientIds.length > 0) {
            whereClause.id = { in: recipientIds };
        } else {
            whereClause.status = "Pending";
        }

        const recipients = await prisma.recipient.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
        });

        if (recipients.length === 0) {
            return NextResponse.json({ error: "No recipients found." }, { status: 400 });
        }

        const hasResume = !!(settings.resumePath && existsSync(settings.resumePath));

        const previews = recipients.map((r) => ({
            recipientId: r.id,
            name: r.name || null,
            email: r.targetEmail,
            company: r.company || null,
            status: r.status,
            subject: generateSubject(r.company, settings),
            body: generateEmailBody(r.name, r.company, settings),
        }));

        return NextResponse.json({
            success: true,
            previews,
            senderName: settings.senderName || "Not configured",
            senderEmail: settings.senderEmail || "Not configured",
            hasResume,
            targetRole: settings.targetRole || "Software Engineer",
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
