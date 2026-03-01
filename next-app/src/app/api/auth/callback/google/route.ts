import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.redirect(new URL("/login", req.url));
        }

        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");

        if (!code) {
            console.error("No code returned from Google");
            return NextResponse.redirect(new URL("/settings?error=Google_Auth_Failed", req.url));
        }

        const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
        const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
        const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/callback/google";

        // Exchange code for tokens
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID as string,
                client_secret: GOOGLE_CLIENT_SECRET as string,
                redirect_uri: GOOGLE_REDIRECT_URI,
                grant_type: "authorization_code",
            }),
        });

        const tokens = await tokenRes.json();

        if (tokens.error) {
            console.error("Token exchange failed:", tokens);
            return NextResponse.redirect(new URL("/settings?error=Token_Exchange_Failed", req.url));
        }

        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + tokens.expires_in);

        // Keep existing refresh token if Google didn't send a new one
        const updateData: any = {
            accessToken: tokens.access_token,
            expiry: expiryDate,
        };

        if (tokens.refresh_token) {
            updateData.refreshToken = tokens.refresh_token;
        }

        // Upsert token in DB
        await prisma.oAuthToken.upsert({
            where: { id: "1" }, // Since we only have 1 admin user, we can hardcode or findFirst
            update: updateData,
            create: {
                userId: session.user.id,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || "", // Requires refresh token on first connect
                expiry: expiryDate,
            },
        });

        return NextResponse.redirect(new URL("/settings?success=connected", req.url));
    } catch (error: any) {
        console.error("Gmail Callback Error:", error);
        return NextResponse.redirect(new URL("/settings?error=Internal_Error", req.url));
    }
}
