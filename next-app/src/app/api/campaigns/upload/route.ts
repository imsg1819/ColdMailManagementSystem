import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
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
        const file = formData.get("excel") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No Excel file provided" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure upload dir exists
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Write Excel temporarily
        const filePath = path.join(uploadDir, `recipients_${Date.now()}.xlsx`);
        await writeFile(filePath, buffer);

        // Call Python script to extract recipients
        console.log("Triggering Python script for Excel parsing...");
        const pyResult = await runPythonScript("process_excel.py", [filePath]);

        const recipients = pyResult.recipients; // Should be an array of {name, company, email, status}

        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return NextResponse.json({ error: "No valid recipients found in Excel file" }, { status: 400 });
        }

        // Prepare data for Prisma bulk insert
        const uniqueEmails = new Set();
        const newRecipientsToInsert = [];

        // Fetch existing emails for THIS USER to avoid duplicates
        const existingRecipients = await prisma.recipient.findMany({
            where: { userId: session.user.id },
            select: { targetEmail: true }
        });
        const existingEmailsDb = new Set(existingRecipients.map((r: any) => r.targetEmail.toLowerCase()));

        for (const r of recipients as any[]) {
            const key = r.email.toLowerCase();
            if (!uniqueEmails.has(key) && !existingEmailsDb.has(key)) {
                uniqueEmails.add(key);
                newRecipientsToInsert.push({
                    userId: session.user.id,
                    name: r.name || null,
                    company: r.company || null,
                    targetEmail: r.email,
                    status: "Pending"
                });
            }
        }

        if (newRecipientsToInsert.length === 0) {
            return NextResponse.json({ error: "All recipients inside the Excel file already exist in the database." }, { status: 400 });
        }

        const created = await prisma.recipient.createMany({
            data: newRecipientsToInsert
        });

        return NextResponse.json({ success: true, count: created.count });
    } catch (error: any) {
        console.error("Upload API Error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
