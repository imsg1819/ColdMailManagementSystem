import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/route";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/callback/google";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!GOOGLE_CLIENT_ID) {
            return NextResponse.json({ error: "Google Client ID not configured" }, { status: 500 });
        }

        const scope = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email";

        // Generate OAuth URL
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${GOOGLE_CLIENT_ID}` +
            `&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}` +
            `&response_type=code` +
            `&scope=${encodeURIComponent(scope)}` +
            `&access_type=offline` +
            `&prompt=consent`; // Force consent to ensure we get a refresh token

        return NextResponse.redirect(authUrl);
    } catch (error: any) {
        console.error("Gmail Auth Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
