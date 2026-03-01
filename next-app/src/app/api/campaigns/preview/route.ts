import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { existsSync } from "fs";

// Generate email body (same logic as send route)
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

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const recipientId = req.nextUrl.searchParams.get("recipientId");

        const settings = await prisma.settings.findUnique({
            where: { userId: session.user.id },
        });

        if (!settings) {
            return NextResponse.json({ error: "Configure settings first." }, { status: 400 });
        }

        // If recipientId provided, preview for that specific recipient
        // Otherwise, preview for the first pending recipient
        let recipient;
        if (recipientId) {
            recipient = await prisma.recipient.findFirst({ where: { id: recipientId, userId: session.user.id } });
        } else {
            recipient = await prisma.recipient.findFirst({ where: { status: "Pending", userId: session.user.id } });
        }

        if (!recipient) {
            recipient = await prisma.recipient.findFirst({ where: { userId: session.user.id } });
        }

        if (!recipient) {
            return NextResponse.json({ error: "No recipients found." }, { status: 400 });
        }

        const body = generateEmailBody(recipient.name, recipient.company, settings);
        const subject = generateSubject(recipient.company, settings);
        const hasResume = !!(settings.resumePath && existsSync(settings.resumePath));

        return NextResponse.json({
            success: true,
            preview: {
                from: settings.senderEmail || "Not configured",
                fromName: settings.senderName || "Not configured",
                to: recipient.targetEmail,
                toName: recipient.name || "—",
                toCompany: recipient.company || "—",
                subject,
                body,
                hasResume,
                resumePath: hasResume ? settings.resumePath : null,
                isSimulation: false,
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
