import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runPythonScript } from "@/lib/pythonRunner";

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required." }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return NextResponse.json({ error: "No account found with this email. Please register first." }, { status: 404 });
        }

        if (user.verified) {
            return NextResponse.json({ error: "This email is already verified. Please login." }, { status: 400 });
        }

        // Generate new 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        // Delete old OTPs, create new
        await prisma.otp.deleteMany({ where: { email } });
        await prisma.otp.create({ data: { email, code: otpCode, expiresAt } });

        // Send via Gmail SMTP
        const result = await runPythonScript("send_otp.py", [], JSON.stringify({
            to_email: email,
            otp_code: otpCode,
            user_name: email.split("@")[0],
        }));

        if (!result.success) {
            return NextResponse.json({ error: `Failed to resend OTP: ${result.error}` }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "New OTP sent to your email." });
    } catch (error: any) {
        console.error("Resend OTP error:", error);
        return NextResponse.json({ error: error.message || "Failed to resend." }, { status: 500 });
    }
}
