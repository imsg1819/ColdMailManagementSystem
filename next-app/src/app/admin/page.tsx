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
    isBlocked: boolean;
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
    senderAppPassword: string | null;
    isBlocked: boolean;
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

    const manageUser = async (userId: string, action: string) => {
        let payload = {};
        if (action === "delete") {
            if (!confirm("Are you absolutely sure you want to delete this user? All their campaigns and data will be permanently wiped. This cannot be undone.")) return;
        } else if (action === "reset_password") {
            const newPassword = prompt("Enter new password for this user (minimum 6 characters):");
            if (!newPassword || newPassword.length < 6) {
                alert("Password must be at least 6 characters.");
                return;
            }
            payload = { newPassword };
        } else if (action === "block") {
            if (!confirm(`Are you sure you want to ${selectedUser?.isBlocked ? "unblock" : "suspend"} this account?`)) return;
        }

        try {
            const res = await fetch("/api/admin/users/manage", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, action, payload }),
            });
            const data = await res.json();
            if (data.success) {
                alert(action === "block" ? `User successfully ${!selectedUser?.isBlocked ? "suspended" : "unblocked"}.` : data.message || "Action successful.");
                fetchUsers();
                if (action === "delete") {
                    setSelectedUser(null);
                    setSelectedRecipients([]);
                } else if (action === "block") {
                    setSelectedUser(prev => prev ? { ...prev, isBlocked: !prev.isBlocked } : null);
                }
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            console.error(err);
            alert("An error occurred executing this action.");
        }
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
                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <Mail className="w-5 h-5 text-blue-500" />
                                        {selectedUser.email}
                                        {selectedUser.isBlocked && (
                                            <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">Suspended</span>
                                        )}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => manageUser(selectedUser.id, "reset_password")} className="text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">Reset Password</button>
                                        <button onClick={() => manageUser(selectedUser.id, "block")} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${selectedUser.isBlocked ? "text-green-700 bg-green-100 hover:bg-green-200" : "text-orange-700 bg-orange-100 hover:bg-orange-200"}`}>{selectedUser.isBlocked ? "Unblock User" : "Suspend User"}</button>
                                        <button onClick={() => manageUser(selectedUser.id, "delete")} className="text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors">Delete User</button>
                                        <div className="w-px h-6 bg-gray-200 mx-1"></div>
                                        <button onClick={() => { setSelectedUser(null); setSelectedRecipients([]); }} className="text-gray-400 hover:text-gray-600">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                {/* User Info Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Auth & Protocol */}
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                                        <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-gray-50">
                                            <Shield className="w-4 h-4 text-purple-500" /> Account & SMTP Validation
                                        </h4>
                                        <div className="space-y-3 text-sm">
                                            <div><span className="text-gray-400 block text-xs">Login Email</span><p className="font-medium text-gray-900">{selectedUser.email}</p></div>
                                            <div><span className="text-gray-400 block text-xs">Sender Email (Gmail)</span><p className="font-medium text-gray-900">{selectedUser.senderEmail || <span className="text-red-400 text-xs font-semibold">NOT CONFIGURED</span>}</p></div>
                                            <div><span className="text-gray-400 block text-xs">App Password (Sending Key)</span><p className="font-mono text-xs bg-gray-50 p-1.5 rounded text-gray-800 break-all border border-gray-200">{selectedUser.senderAppPassword || <span className="text-red-400 text-xs font-semibold">NOT CONFIGURED</span>}</p></div>
                                        </div>
                                    </div>

                                    {/* Strategy & Targeting */}
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                                        <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-gray-50">
                                            <Briefcase className="w-4 h-4 text-blue-500" /> Campaign Strategy
                                        </h4>
                                        <div className="space-y-3 text-sm">
                                            <div><span className="text-gray-400 block text-xs">Sender Name</span><p className="font-medium text-gray-900">{selectedUser.senderName || "—"}</p></div>
                                            <div><span className="text-gray-400 block text-xs">Target Role</span><p className="font-medium text-gray-900">{selectedUser.targetRole || "—"}</p></div>
                                            <div><span className="text-gray-400 block text-xs">Years of Experience</span><p className="font-medium text-gray-900">{selectedUser.yearsOfExperience || "—"}</p></div>
                                            <div><span className="text-gray-400 block text-xs">Core Skills</span><p className="font-medium text-gray-900 truncate" title={selectedUser.skills || ""}>{selectedUser.skills || "—"}</p></div>
                                        </div>
                                    </div>
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
