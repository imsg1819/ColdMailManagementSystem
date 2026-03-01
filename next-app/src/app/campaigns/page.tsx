import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { Users, FileSpreadsheet, AlertTriangle } from "lucide-react";
import UploadExcelClient from "./UploadExcelClient";
import LaunchCampaignButton from "./LaunchCampaignButton";
import ResetStatusButton from "./ResetStatusButton";
import RecipientTable from "./RecipientTable";

export default async function CampaignsPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    // Fetch only THIS user's recipients
    const recipients = await prisma.recipient.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
    });

    const pendingCount = recipients.filter(r => r.status === "Pending").length;
    const sentCount = recipients.filter(r => r.status === "Sent").length;

    return (
        <div className="p-8 max-w-7xl mx-auto w-full">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
                    <p className="text-gray-500 mt-2">Manage your email recipients and launch cold email campaigns.</p>
                </div>
                <div className="flex items-center gap-3">
                    <UploadExcelClient />
                    <LaunchCampaignButton />
                </div>
            </div>

            {/* Info Banner */}
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-800">
                    <strong>Gmail SMTP Mode:</strong> Make sure you are on a network that allows SMTP (mobile hotspot or home WiFi) and have a Gmail App Password configured in Settings.
                    <br />Use <strong>checkboxes</strong> to select specific recipients, then <strong>Send to Selected</strong> or <strong>Delete Selected</strong>.
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-gray-500" />
                        <h3 className="font-semibold text-gray-900">
                            Recipient List ({recipients.length})
                            {pendingCount > 0 && <span className="text-sm font-normal text-orange-600 ml-2">{pendingCount} pending</span>}
                            {sentCount > 0 && <span className="text-sm font-normal text-green-600 ml-2">{sentCount} sent</span>}
                        </h3>
                    </div>
                    {sentCount > 0 && <ResetStatusButton />}
                </div>

                {recipients.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                            <FileSpreadsheet className="w-8 h-8" />
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">No recipients found</h4>
                        <p className="text-gray-500 mb-6 max-w-sm">Upload an Excel sheet (.xlsx) with an Email column to get started. Name and Company columns are optional.</p>
                    </div>
                ) : (
                    <RecipientTable recipients={recipients.map(r => ({
                        ...r,
                        lastSentDate: r.lastSentDate ? r.lastSentDate.toISOString() : null,
                    }))} />
                )}
            </div>
        </div>
    );
}
