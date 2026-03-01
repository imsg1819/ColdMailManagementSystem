"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Users, Mail, Shield, ChevronRight, X, Eye, Briefcase, MapPin, Clock } from "lucide-react";

interface UserSummary {
    id: string;
    email: string;
    name: string | null;
    verified: boolean;
    recipientCount: number;
    hasSenderEmail: boolean;
    senderEmail: string | null;
    senderName: string | null;
    targetRole: string | null;
    senderAppPassword: string | null;
}

interface UserDetail {
    id: string;
    email: string;
    name: string | null;
    targetRole: string | null;
    senderEmail: string | null;
    senderName: string | null;
    skills: string | null;
    yearsOfExperience: string | null;
}

interface RecipientDetail {
    id: string;
    targetEmail: string;
    name: string | null;
    company: string | null;
    status: string;
    lastSentDate: string | null;
}

export default function AdminPage() {
    const { data: session, status } = useSession();
    const [users, setUsers] = useState<UserSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
    const [selectedRecipients, setSelectedRecipients] = useState<RecipientDetail[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => {
        if (status === "authenticated" && (session?.user as any)?.role !== "ADMIN") {
            redirect("/dashboard");
        }
        if (status === "authenticated") {
            fetchUsers();
        }
    }, [status, session]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/users");
            const data = await res.json();
            if (data.success) setUsers(data.users);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const viewUserDetail = async (userId: string) => {
        setDetailLoading(true);
        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            const data = await res.json();
            if (data.success) {
                setSelectedUser(data.user);
                setSelectedRecipients(data.recipients);
            }
        } catch (err) {
            console.error(err);
        }
        setDetailLoading(false);
    };

    if (status === "loading" || loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto w-full flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto w-full">
            <div className="mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-purple-100">
                        <Shield className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
                        <p className="text-gray-500 mt-1">View all registered users and their campaign data.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* User List */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                            <Users className="w-5 h-5 text-gray-500" />
                            <h3 className="font-semibold text-gray-900">All Users ({users.length})</h3>
                        </div>

                        {users.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>No registered users yet.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50 max-h-[70vh] overflow-y-auto">
                                {users.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => viewUserDetail(user.id)}
                                        className={`w-full text-left p-4 hover:bg-blue-50/50 transition-colors flex items-center justify-between ${selectedUser?.id === user.id ? "bg-blue-50" : ""}`}
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-gray-900 truncate">{user.email}</p>
                                                {user.verified ? (
                                                    <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">✓</span>
                                                ) : (
                                                    <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-orange-100 text-orange-700 rounded">unverified</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                                <span>{user.recipientCount} recipients</span>
                                                {user.senderEmail && <span>• {user.senderEmail}</span>}
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* User Detail Panel */}
                <div className="lg:col-span-2">
                    {detailLoading ? (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex items-center justify-center">
                            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                    ) : selectedUser ? (
                        <div className="space-y-6">
                            {/* User Info Card */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <Mail className="w-5 h-5 text-blue-500" />
                                        {selectedUser.email}
                                    </h3>
                                    <button onClick={() => { setSelectedUser(null); setSelectedRecipients([]); }} className="text-gray-400 hover:text-gray-600">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                    {selectedUser.name && (
                                        <div><span className="text-gray-400">Name</span><p className="font-medium text-gray-900">{selectedUser.name}</p></div>
                                    )}
                                    {selectedUser.senderName && (
                                        <div><span className="text-gray-400">Sender Name</span><p className="font-medium text-gray-900">{selectedUser.senderName}</p></div>
                                    )}
                                    {selectedUser.senderEmail && (
                                        <div><span className="text-gray-400">Sender Email</span><p className="font-medium text-gray-900">{selectedUser.senderEmail}</p></div>
                                    )}
                                    {selectedUser.targetRole && (
                                        <div><span className="text-gray-400">Target Role</span><p className="font-medium text-gray-900">{selectedUser.targetRole}</p></div>
                                    )}
                                    {selectedUser.skills && (
                                        <div><span className="text-gray-400">Skills</span><p className="font-medium text-gray-900">{selectedUser.skills}</p></div>
                                    )}
                                    {selectedUser.yearsOfExperience && (
                                        <div><span className="text-gray-400">Experience</span><p className="font-medium text-gray-900">{selectedUser.yearsOfExperience}</p></div>
                                    )}
                                </div>
                            </div>

                            {/* Recipients Table */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                                    <Eye className="w-5 h-5 text-gray-500" />
                                    <h3 className="font-semibold text-gray-900">Recipients ({selectedRecipients.length})</h3>
                                </div>
                                {selectedRecipients.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400">No recipients uploaded yet.</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    <th className="p-3 pl-5">Email</th>
                                                    <th className="p-3">Name</th>
                                                    <th className="p-3">Company</th>
                                                    <th className="p-3">Status</th>
                                                    <th className="p-3 pr-5">Last Sent</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {selectedRecipients.map(r => (
                                                    <tr key={r.id} className="hover:bg-gray-50/50 text-sm">
                                                        <td className="p-3 pl-5 font-medium text-gray-900">{r.targetEmail}</td>
                                                        <td className="p-3 text-gray-600">{r.name || "—"}</td>
                                                        <td className="p-3 text-gray-600">{r.company || "—"}</td>
                                                        <td className="p-3">
                                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${r.status === "Sent" ? "bg-green-100 text-green-700" :
                                                                r.status === "Follow-up Sent" ? "bg-purple-100 text-purple-700" :
                                                                    "bg-orange-100 text-orange-700"}`}>
                                                                {r.status}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 pr-5 text-gray-500 text-xs">
                                                            {r.lastSentDate ? new Date(r.lastSentDate).toLocaleDateString() : "Never"}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-purple-50 text-purple-400 rounded-full flex items-center justify-center mb-4">
                                <Eye className="w-8 h-8" />
                            </div>
                            <h4 className="text-lg font-medium text-gray-900 mb-2">Select a user</h4>
                            <p className="text-gray-400 max-w-sm">Click on any user from the list to view their recipient data, settings, and campaign details.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
