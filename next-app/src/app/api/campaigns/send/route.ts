import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { runPythonScript } from "@/lib/pythonRunner";

// Generate a personalized cold email
function generateEmailBody(recipientName: string | null, company: string | null, settings: any) {
    const role = settings.targetRole || "Software Engineer";
    const yoe = settings.yearsOfExperience || "several years";
    const skills = settings.skills ? `My core skills include ${settings.skills}.` : "";
    const senderName = settings.senderName || "A Job Seeker";

    // Build links section — only show links that are provided
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
      ${greeting}
      
      <p>I hope this email finds you well.</p>
      
      <p>${companyMention} I am highly interested in joining as a <strong>${role}</strong>.</p>
      
      <p>With <strong>${yoe}</strong> of experience, I bring a strong background in software development. ${skills}</p>
      
      ${linksSection}
      
      <p>I have attached my resume for your convenience. I would love the chance to discuss how my background and skills would be an asset to ${companyRef}. Are you available for a brief chat sometime next week?</p>
      
      <p>Looking forward to hearing from you.</p>
      
      <p>Best regards,<br>
      ${senderName}</p>
    </div>
  `;
}

function generateSubject(company: string | null, settings: any) {
    const role = settings.targetRole || "Software Engineer";
    if (company) {
        return `Application for ${role} Position at ${company}`;
    }
    return `Application for ${role} Position — Experienced Candidate`;
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse optional body for selected recipients + per-recipient overrides
        let recipientIds: string[] | null = null;
        let overrides: Record<string, { subject?: string; body?: string }> = {};
        try {
            const body = await req.json();
            if (body.recipientIds && Array.isArray(body.recipientIds)) {
                recipientIds = body.recipientIds;
            }
            if (body.overrides && typeof body.overrides === "object") {
                overrides = body.overrides;
            }
        } catch { /* No body = send all pending */ }

        // 1. Get Settings
        const settings = await prisma.settings.findUnique({
            where: { userId: session.user.id },
        });

        if (!settings) {
            return NextResponse.json({ error: "Please configure your settings first." }, { status: 400 });
        }

        if (!settings.senderEmail || !settings.senderAppPassword) {
            return NextResponse.json({ error: "Please configure your Gmail sender email and App Password in Settings." }, { status: 400 });
        }

        // 2. Find recipients (selected or all pending) — scoped to current user
        const whereClause: any = { status: "Pending", userId: session.user.id };
        if (recipientIds) {
            whereClause.id = { in: recipientIds };
        }
        const pendingRecipients = await prisma.recipient.findMany({
            where: whereClause,
        });

        if (pendingRecipients.length === 0) {
            return NextResponse.json({ success: true, message: "No pending emails to send.", sentCount: 0 });
        }

        let successCount = 0;
        const errors: any[] = [];

        // 3. Loop & dispatch via Gmail SMTP
        for (const recipient of pendingRecipients) {
            try {
                // Use overrides if provided, otherwise generate
                const recipientOverride = overrides[recipient.id];
                const htmlBody = recipientOverride?.body || generateEmailBody(recipient.name, recipient.company, settings);
                const subject = recipientOverride?.subject || generateSubject(recipient.company, settings);

                const pythonInput = JSON.stringify({
                    sender_email: settings.senderEmail,
                    app_password: settings.senderAppPassword,
                    resume_path: settings.resumePath || null,
                    email: {
                        to: recipient.targetEmail,
                        subject: subject,
                        body: htmlBody
                    }
                });

                const pyResult = await runPythonScript("send_email.py", [], pythonInput);

                if (pyResult.success) {
                    await prisma.recipient.update({
                        where: { id: recipient.id },
                        data: {
                            status: "Sent",
                            lastSentDate: new Date()
                        }
                    });
                    successCount++;
                } else {
                    errors.push({ email: recipient.targetEmail, error: pyResult.error });
                }

            } catch (e: any) {
                errors.push({ email: recipient.targetEmail, error: e.message });
                console.error(`Failed to send to ${recipient.targetEmail}`, e);
            }
        }

        return NextResponse.json({
            success: true,
            sentCount: successCount,
            totalPending: pendingRecipients.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error: any) {
        console.error("Campaign dispatch error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
