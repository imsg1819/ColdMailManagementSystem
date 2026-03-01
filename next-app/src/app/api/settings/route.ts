import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { runPythonScript } from "@/lib/pythonRunner";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const targetRole = formData.get("targetRole") as string;
        const yearsOfExperience = formData.get("yearsOfExperience") as string;
        const skills = formData.get("skills") as string;
        const linkedinUrl = formData.get("linkedinUrl") as string;
        const githubUrl = formData.get("githubUrl") as string;
        const portfolioUrl = formData.get("portfolioUrl") as string;
        const senderName = formData.get("senderName") as string;
        const senderEmail = formData.get("senderEmail") as string;
        const senderAppPassword = formData.get("senderAppPassword") as string;
        const file = formData.get("resume") as File | null;

        let resumeParsedText = null;
        let resumeFilePath = null;

        if (file) {
            try {
                const bytes = await file.arrayBuffer();
                const buffer = Buffer.from(bytes);

                const uploadDir = path.join(process.cwd(), "public", "uploads");
                if (!existsSync(uploadDir)) {
                    await mkdir(uploadDir, { recursive: true });
                }

                const filePath = path.join(uploadDir, `resume_${Date.now()}.pdf`);
                await writeFile(filePath, buffer);
                resumeFilePath = filePath;

                console.log("Triggering Python script for PDF extraction...");
                const pyResult = await runPythonScript("parse_resume.py", [filePath]);
                resumeParsedText = pyResult.text;
            } catch (err: any) {
                console.error("PDF extraction failed", err);
                resumeParsedText = null;
            }
        }

        // Ensure user exists in DB
        await prisma.user.upsert({
            where: { id: session.user.id },
            update: {},
            create: {
                id: session.user.id,
                email: session.user.email || "admin@gmail.com",
                password: "admin",
            }
        });

        // Check if app password changed — send confirmation email
        const existingSettings = await prisma.settings.findUnique({
            where: { userId: session.user.id },
        });

        const appPasswordChanged = existingSettings?.senderAppPassword &&
            senderAppPassword &&
            existingSettings.senderAppPassword !== senderAppPassword;

        // Save/Update DB Settings
        const updateData: any = {
            targetRole,
            yearsOfExperience,
            skills,
            linkedinUrl,
            githubUrl,
            portfolioUrl,
            senderName,
            senderEmail,
            senderAppPassword,
        };
        if (resumeParsedText) {
            updateData.resumeText = resumeParsedText;
        }
        if (resumeFilePath) {
            updateData.resumePath = resumeFilePath;
        }

        const savedSettings = await prisma.settings.upsert({
            where: { userId: session.user.id },
            update: updateData,
            create: {
                userId: session.user.id,
                ...updateData
            }
        });

        // Send confirmation email if app password was changed
        if (appPasswordChanged && senderEmail && senderAppPassword) {
            try {
                const confirmInput = JSON.stringify({
                    sender_email: senderEmail,
                    app_password: senderAppPassword,
                    email: {
                        to: senderEmail,
                        subject: "ColdMails — App Password Updated",
                        body: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <h2 style="color: #2563eb;">🔑 App Password Updated</h2>
                            <p>Your Google App Password has been successfully updated in ColdMails.</p>
                            <p>If you did not make this change, please update your App Password immediately and revoke the old one from your <a href="https://myaccount.google.com/apppasswords">Google Account</a>.</p>
                            <p style="color: #999; font-size: 12px;">This is an automated notification from ColdMails.</p>
                        </div>`
                    }
                });
                await runPythonScript("send_email.py", [], confirmInput);
            } catch (e) {
                console.error("Failed to send app password change confirmation:", e);
                // Don't fail the whole request
            }
        }

        return NextResponse.json({ success: true, settings: savedSettings });
    } catch (error: any) {
        console.error("Settings API Error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const settings = await prisma.settings.findUnique({
            where: { userId: session.user.id }
        });

        return NextResponse.json({ success: true, settings });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
