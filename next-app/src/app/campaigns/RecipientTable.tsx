"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Play, CheckCircle2, AlertCircle, Loader2, AlertTriangle, Edit3, X, Check } from "lucide-react";
import EmailPreviewModal from "./EmailPreviewModal";
import PreSendFlow from "./PreSendFlow";

interface Recipient {
    id: string;
    targetEmail: string;
    name: string | null;
    company: string | null;
    location: string | null;
    timezone: string;
    timezoneEstimated: boolean;
    status: string;
    lastSentDate: string | null;
}

export default function RecipientTable({ recipients }: { recipients: Recipient[] }) {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState<string | null>(null);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [showPreSend, setShowPreSend] = useState(false);

    // Timezone edit state
    const [editTzId, setEditTzId] = useState<string | null>(null);
    const [editTzValue, setEditTzValue] = useState("");

    const router = useRouter();

    const allSelected = recipients.length > 0 && selected.size === recipients.length;
    const someSelected = selected.size > 0;

    const toggleAll = () => {
        if (allSelected) {
            setSelected(new Set());
        } else {
            setSelected(new Set(recipients.map(r => r.id)));
        }
    };

    const toggleOne = (id: string) => {
        const next = new Set(selected);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelected(next);
    };

    const handleDeleteSelected = async () => {
        if (!someSelected) return;
        if (!confirm(`Delete ${selected.size} recipient(s)? This cannot be undone.`)) return;

        setLoading("delete");
        setMessage({ text: "", type: "" });
        try {
            const res = await fetch("/api/campaigns/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: Array.from(selected) }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setMessage({ text: `Deleted ${selected.size} recipient(s).`, type: "success" });
            setSelected(new Set());
            router.refresh();
        } catch (err: any) {
            setMessage({ text: err.message, type: "error" });
        } finally {
            setLoading(null);
        }
    };

    const handleSaveTz = async (id: string) => {
        setLoading("tz_" + id);
        try {
            const res = await fetch("/api/campaigns/timezone", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, timezone: editTzValue.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setMessage({ text: "Timezone updated.", type: "success" });
            setEditTzId(null);
            router.refresh();
        } catch (err: any) {
            setMessage({ text: err.message, type: "error" });
        } finally {
            setLoading(null);
        }
    };

    const handleSendSelected = () => {
        if (!someSelected) return;
        const pendingSelected = recipients.filter(r => selected.has(r.id) && r.status === "Pending");
        if (pendingSelected.length === 0) {
            setMessage({ text: "No pending recipients in selection.", type: "error" });
            return;
        }
        setShowPreSend(true);
    };

    return (
        <div>
            {/* PreSend Flow Modal */}
            {showPreSend && (
                <PreSendFlow
                    recipientIds={Array.from(selected)}
                    onClose={() => {
                        setShowPreSend(false);
                        router.refresh();
                    }}
                />
            )}

            {/* Action Bar */}
            {someSelected && (
                <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between animate-in">
                    <span className="text-sm font-medium text-blue-700">
                        {selected.size} of {recipients.length} selected
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDeleteSelected}
                            disabled={loading !== null}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {loading === "delete" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            Delete Selected
                        </button>
                        <button
                            onClick={handleSendSelected}
                            disabled={loading !== null}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <Play className="w-3.5 h-3.5" />
                            Send to Selected
                        </button>
                    </div>
                </div>
            )}

            {/* Status Message */}
            {message.text && (
                <div className={`p-3 flex items-center gap-2 text-sm ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {message.text}
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500">
                            <th className="p-4 pl-4 w-10">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={toggleAll}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                            </th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Name</th>
                            <th className="p-4">Company</th>
                            <th className="p-4">Timezone</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Last Sent</th>
                            <th className="p-4 pr-6 text-center">Preview</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {recipients.map((person) => (
                            <tr key={person.id} className={`hover:bg-gray-50/50 transition-colors ${selected.has(person.id) ? "bg-blue-50/50" : ""}`}>
                                <td className="p-4 pl-4">
                                    <input
                                        type="checkbox"
                                        checked={selected.has(person.id)}
                                        onChange={() => toggleOne(person.id)}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                </td>
                                <td className="p-4 font-medium text-gray-900">{person.targetEmail}</td>
                                <td className="p-4 text-gray-600">{person.name || "—"}</td>
                                <td className="p-4 text-gray-600">{person.company || "—"}</td>
                                <td className="p-4">
                                    {editTzId === person.id ? (
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="text"
                                                value={editTzValue}
                                                onChange={(e) => setEditTzValue(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === "Enter") handleSaveTz(person.id); if (e.key === "Escape") setEditTzId(null); }}
                                                className="px-2 py-1 text-sm border-2 border-blue-400 rounded-md w-36 outline-none"
                                                autoFocus
                                            />
                                            {loading === `tz_${person.id}` ? (
                                                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                            ) : (
                                                <>
                                                    <button onClick={() => handleSaveTz(person.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                                                    <button onClick={() => setEditTzId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 group">
                                            <span className="flex items-center gap-1 text-sm text-gray-700" title={person.location ? `Detected from: ${person.location}` : ""}>
                                                {(person.timezone || "America/New_York").replace("_", " ")}
                                                {person.timezoneEstimated && <span title="Estimated timezone"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /></span>}
                                            </span>
                                            <button
                                                onClick={() => { setEditTzId(person.id); setEditTzValue(person.timezone); }}
                                                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded text-gray-400 transition-all"
                                                title="Edit timezone"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${person.status === "Sent"
                                        ? "bg-green-100 text-green-700"
                                        : person.status === "Follow-up Sent"
                                            ? "bg-purple-100 text-purple-700"
                                            : "bg-orange-100 text-orange-700"
                                        }`}>
                                        {person.status}
                                    </span>
                                </td>
                                <td className="p-4 text-gray-500 text-sm">
                                    {person.lastSentDate ? new Date(person.lastSentDate).toLocaleDateString() : "Never"}
                                </td>
                                <td className="p-4 pr-6 text-center">
                                    <EmailPreviewModal recipientId={person.id} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
