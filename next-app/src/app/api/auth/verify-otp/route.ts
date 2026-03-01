import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const { email, otp } = await req.json();

        if (!email || !otp) {
            return NextResponse.json({ error: "Email and OTP are required." }, { status: 400 });
        }

        // Find the OTP record
        const otpRecord = await prisma.otp.findFirst({
            where: { email, code: otp },
        });

        if (!otpRecord) {
            return NextResponse.json({ error: "Invalid OTP. Please check and try again." }, { status: 400 });
        }

        // Check expiry
        if (new Date() > otpRecord.expiresAt) {
            await prisma.otp.delete({ where: { id: otpRecord.id } });
            return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
        }

        // Mark user as verified
        await prisma.user.update({
            where: { email },
            data: { verified: true },
        });

        // Delete all OTPs for this email
        await prisma.otp.deleteMany({ where: { email } });

        return NextResponse.json({ success: true, message: "Email verified! You can now login." });
    } catch (error: any) {
        console.error("Verify OTP error:", error);
        return NextResponse.json({ error: error.message || "Verification failed." }, { status: 500 });
    }
}
