import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { AuthOptions } from "next-auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: AuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials: any) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email and password are required.");
                }

                // Admin bypass — hardcoded, no OTP needed
                if (credentials.email === "admin@gmail.com" && credentials.password === "admin") {
                    // Auto-create admin user if not exists
                    const admin = await prisma.user.upsert({
                        where: { email: "admin@gmail.com" },
                        update: {},
                        create: {
                            email: "admin@gmail.com",
                            password: await bcrypt.hash("admin", 10),
                            name: "Admin",
                            verified: true,
                            role: "ADMIN",
                        },
                    });
                    return {
                        id: admin.id,
                        name: "Admin",
                        email: "admin@gmail.com",
                        role: "ADMIN",
                    };
                }

                // Regular user — DB lookup
                const user = await prisma.user.findUnique({
                    where: { email: credentials.email }
                });

                if (!user || !user.password) {
                    throw new Error("No account found with this email.");
                }

                if (!user.verified) {
                    throw new Error("Please verify your email first. Check your inbox for the OTP.");
                }

                if (user.isBlocked) {
                    throw new Error("Account suspended by administrator.");
                }

                const isValid = await bcrypt.compare(credentials.password, user.password);
                if (!isValid) {
                    throw new Error("Incorrect password.");
                }

                return {
                    id: user.id,
                    name: user.name || user.email.split("@")[0],
                    email: user.email,
                    role: user.role,
                };
            }
        })
    ],
    session: {
        strategy: "jwt" as const,
    },
    pages: {
        signIn: '/login',
    },
    secret: process.env.NEXTAUTH_SECRET || "my_development_secret_12345",
    callbacks: {
        async jwt({ token, user }: any) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }: any) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
            }
            return session;
        }
    }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
