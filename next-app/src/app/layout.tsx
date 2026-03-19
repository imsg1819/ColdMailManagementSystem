import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";
import { Sidebar } from "@/components/layout/Sidebar";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ColdMails - Cold Email Automation",
  description: "Automate your job search with personalized cold emails.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 flex text-gray-900`} suppressHydrationWarning>
        <Providers>
          {session && <Sidebar />}
          <main className={`flex-1 transition-all ${session ? "ml-64" : ""}`}>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
