import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { runPythonScript } from "@/lib/pythonRunner";

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
        }

        // Check if user already exists and is verified
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser && existingUser.verified) {
            return NextResponse.json({ error: "An account with this email already exists. Please login." }, { status: 409 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create or update user (update if they registered but didn't verify yet)
        await prisma.user.upsert({
            where: { email },
            update: { password: hashedPassword },
            create: {
                email,
                password: hashedPassword,
                verified: false,
            },
        });

        // Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Delete any existing OTPs for this email
        await prisma.otp.deleteMany({ where: { email } });

        // Store new OTP
        await prisma.otp.create({
            data: { email, code: otpCode, expiresAt },
        });

        // Send OTP via Gmail SMTP
        const otpInput = JSON.stringify({
            to_email: email,
            otp_code: otpCode,
            user_name: email.split("@")[0],
        });

        const result = await runPythonScript("send_otp.py", [], otpInput);

        if (!result.success) {
            return NextResponse.json(
                { error: `Failed to send OTP: ${result.error}. Make sure you're on a network that allows SMTP (hotspot/home WiFi).` },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, message: "OTP sent to your email." });
    } catch (error: any) {
        console.error("Register error:", error);
        return NextResponse.json({ error: error.message || "Registration failed." }, { status: 500 });
    }
}
