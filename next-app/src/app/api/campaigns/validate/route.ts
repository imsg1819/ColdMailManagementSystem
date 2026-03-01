import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { runPythonScript } from "@/lib/pythonRunner";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

interface RawRow {
    name: string;
    company: string;
    email: string;
    location: string;
}

interface ValidatedRow {
    row: number;
    name: string;
    company: string;
    email: string;
    location: string;
    timezone: string;
    timezoneEstimated: boolean;
    timezoneMethod: string;
    originalEmail?: string;
    originalName?: string;
    originalCompany?: string;
}

interface Issue {
    row: number;
    column: string;
    issue: string;
    value: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

        const uploadDir = path.join(process.cwd(), "public", "uploads");
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, `validate_${Date.now()}.xlsx`);
        await writeFile(filePath, buffer);

        // Parse with Python
        const pyResult = await runPythonScript("process_excel.py", [filePath]);
        const rawRecipients: RawRow[] = pyResult.recipients || [];

        if (!rawRecipients.length) {
            return NextResponse.json({
                error: "No data found in Excel file",
            }, { status: 400 });
        }

        // Fetch existing emails for this user
        const existingRecipients = await prisma.recipient.findMany({
            where: { userId: session.user.id },
            select: { targetEmail: true },
        });
        const existingEmailsDb = new Set(existingRecipients.map(r => r.targetEmail.toLowerCase()));

        const valid: ValidatedRow[] = [];
        const errors: Issue[] = [];
        const warnings: Issue[] = [];
        const autoFixed: Issue[] = [];
        const duplicateGroups: { email: string; rows: ValidatedRow[] }[] = [];

        // Track emails seen in this upload for in-file duplicate detection
        const emailsSeen = new Map<string, number>(); // email -> first row
        const duplicateEmailRows = new Map<string, number[]>(); // email -> all rows

        for (let i = 0; i < rawRecipients.length; i++) {
            const rowNum = i + 2; // +2 because row 1 is header, data starts at row 2
            const raw = rawRecipients[i];
            let email = (raw.email || "").toString().trim();
            let name = (raw.name || "").toString().trim();
            let company = (raw.company || "").toString().trim();
            const location = (raw.location || "").toString().trim();
            const originalEmail = email;
            const originalName = name;
            const originalCompany = company;

            let hasAutoFix = false;

            // Auto-fix: trim whitespace (already done above), normalize email casing
            if (email !== email.toLowerCase()) {
                email = email.toLowerCase();
                autoFixed.push({
                    row: rowNum,
                    column: "Email",
                    issue: "Email converted to lowercase",
                    value: `${originalEmail} → ${email}`,
                });
                hasAutoFix = true;
            }

            // Auto-fix: remove leading/trailing spaces from name/company  
            if (originalName !== name && name !== originalName.trim()) {
                autoFixed.push({
                    row: rowNum,
                    column: "Name",
                    issue: "Trimmed whitespace",
                    value: `"${originalName}" → "${name}"`,
                });
                hasAutoFix = true;
            }

            // Validate: missing email
            if (!email) {
                errors.push({
                    row: rowNum,
                    column: "Email",
                    issue: "Email is empty",
                    value: "(empty)",
                });
                continue;
            }

            // Validate: invalid email format
            if (!EMAIL_REGEX.test(email)) {
                errors.push({
                    row: rowNum,
                    column: "Email",
                    issue: "Invalid email format",
                    value: email,
                });
                continue;
            }

            // Warning: missing name
            if (!name) {
                warnings.push({
                    row: rowNum,
                    column: "Name",
                    issue: "Name is missing — email will use generic greeting",
                    value: "(empty)",
                });
            }

            // Warning: missing company
            if (!company) {
                warnings.push({
                    row: rowNum,
                    column: "Company",
                    issue: "Company is missing — email will use generic reference",
                    value: "(empty)",
                });
            }

            // Warning: already exists in DB
            if (existingEmailsDb.has(email)) {
                warnings.push({
                    row: rowNum,
                    column: "Email",
                    issue: "Already exists in your contact list — will be skipped",
                    value: email,
                });
            }

            // Track in-file duplicates
            const emailLower = email.toLowerCase();
            if (emailsSeen.has(emailLower)) {
                if (!duplicateEmailRows.has(emailLower)) {
                    duplicateEmailRows.set(emailLower, [emailsSeen.get(emailLower)!]);
                }
                duplicateEmailRows.get(emailLower)!.push(rowNum);
            } else {
                emailsSeen.set(emailLower, rowNum);
            }

            // Detect timezone
            let tzResult = { timezone: "America/New_York", estimated: true, method: "default_fallback" };
            try {
                const tzInput = JSON.stringify({ location, company, email });
                const tzOutput = await runPythonScript("detect_timezone.py", [], tzInput);
                if (tzOutput.success) {
                    tzResult = { timezone: tzOutput.timezone, estimated: tzOutput.estimated, method: tzOutput.method };
                }
            } catch { /* use default */ }

            valid.push({
                row: rowNum,
                name,
                company,
                email,
                location,
                timezone: tzResult.timezone,
                timezoneEstimated: tzResult.estimated,
                timezoneMethod: tzResult.method,
                ...(hasAutoFix ? { originalEmail, originalName, originalCompany } : {}),
            });
        }

        // Build duplicate groups from the valid rows 
        for (const [email, rows] of duplicateEmailRows.entries()) {
            duplicateGroups.push({
                email,
                rows: valid.filter(v => v.email.toLowerCase() === email).map(v => ({ ...v })),
            });
        }

        // Store filePath so confirm-upload can reference it
        return NextResponse.json({
            success: true,
            filePath,
            summary: {
                total: rawRecipients.length,
                valid: valid.length,
                errors: errors.length,
                warnings: warnings.length,
                autoFixed: autoFixed.length,
                duplicateGroups: duplicateGroups.length,
            },
            valid,
            errors,
            warnings,
            autoFixed,
            duplicateGroups,
        });
    } catch (error: any) {
        console.error("Validate API Error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
