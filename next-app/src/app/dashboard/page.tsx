import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { Users, MailCheck, Clock, FileSpreadsheet } from "lucide-react";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const isAdmin = (session.user as any).role === "ADMIN";

    // Fetch metrics — scoped to current user (admin sees all)
    const where = isAdmin ? {} : { userId: session.user.id };
    const totalRecipients = await prisma.recipient.count({ where });
    const sentEmails = await prisma.recipient.count({ where: { ...where, status: "Sent" } });
    const pendingEmails = await prisma.recipient.count({ where: { ...where, status: "Pending" } });
    const followUpSent = await prisma.recipient.count({ where: { ...where, status: "Follow-up Sent" } });

    const metrics = [
        { label: "Total Recipients", value: totalRecipients, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
        { label: "Emails Sent", value: sentEmails, icon: MailCheck, color: "text-green-500", bg: "bg-green-50" },
        { label: "Pending", value: pendingEmails, icon: Clock, color: "text-orange-500", bg: "bg-orange-50" },
        { label: "Follow-Ups", value: followUpSent, icon: FileSpreadsheet, color: "text-purple-500", bg: "bg-purple-50" },
    ];

    // Admin extra stats
    const userCount = isAdmin ? await prisma.user.count({ where: { role: "USER" } }) : 0;

    return (
        <div className="p-8 max-w-7xl mx-auto w-full">
            <DashboardClient />
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 mt-2">
                    Welcome back, {session.user?.name}.
                    {isAdmin && <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">ADMIN</span>}
                    {isAdmin ? " Here is the overview across all users." : " Here is your campaign overview."}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((metric, index) => {
                    const Icon = metric.icon;
                    return (
                        <div key={index} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">{metric.label}</p>
                                    <p className="mt-2 text-3xl font-semibold text-gray-900">{metric.value}</p>
                                </div>
                                <div className={`p-3 rounded-xl ${metric.bg}`}>
                                    <Icon className={`w-6 h-6 ${metric.color}`} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {isAdmin && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-2xl p-6 border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-purple-500">Registered Users</p>
                                <p className="mt-2 text-3xl font-semibold text-gray-900">{userCount}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-purple-50">
                                <Users className="w-6 h-6 text-purple-500" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
