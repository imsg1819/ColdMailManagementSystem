"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import {
    X, ChevronDown, ChevronRight, Mail, User, Building2, Briefcase,
    Edit3, Send, Loader2, CheckCircle2, AlertCircle, Paperclip
} from "lucide-react";
import { useRouter } from "next/navigation";
import SendConfirmationModal from "./SendConfirmationModal";

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

interface RecipientPreview {
    recipientId: string;
    name: string | null;
    email: string;
    company: string | null;
    status: string;
    subject: string;
    body: string;
}

interface Props {
    recipientIds: string[];
    onClose: () => void;
}

// Quill toolbar modules
const quillModules = {
    toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link"],
        ["clean"],
    ],
};

export default function PreSendFlow({ recipientIds, onClose }: Props) {
    const [loading, setLoading] = useState(true);
    const [previews, setPreviews] = useState<RecipientPreview[]>([]);
    const [checked, setChecked] = useState<Set<string>>(new Set());
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [editedSubjects, setEditedSubjects] = useState<Record<string, string>>({});
    const [editedBodies, setEditedBodies] = useState<Record<string, string>>({});
    const [senderInfo, setSenderInfo] = useState({ name: "", email: "" });
    const [hasResume, setHasResume] = useState(false);
    const [targetRole, setTargetRole] = useState("");
    const [error, setError] = useState("");
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ text: string; type: string } | null>(null);
    const [quillReady, setQuillReady] = useState(false);
    const router = useRouter();

    // Load previews
    useEffect(() => {
        const fetchPreviews = async () => {
            try {
                const res = await fetch("/api/campaigns/preview-batch", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ recipientIds }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                setPreviews(data.previews);
                setChecked(new Set(data.previews.map((p: RecipientPreview) => p.recipientId)));
                setSenderInfo({ name: data.senderName, email: data.senderEmail });
                setHasResume(data.hasResume);
                setTargetRole(data.targetRole);

                // If single recipient, auto-expand
                if (data.previews.length === 1) {
                    setExpanded(new Set([data.previews[0].recipientId]));
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchPreviews();

        // Mark quill as ready after a small delay for dynamic import
        const t = setTimeout(() => setQuillReady(true), 300);
        return () => clearTimeout(t);
    }, [recipientIds]);

    // Helpers
    const getSubject = useCallback((p: RecipientPreview) => editedSubjects[p.recipientId] ?? p.subject, [editedSubjects]);
    const getBody = useCallback((p: RecipientPreview) => editedBodies[p.recipientId] ?? p.body, [editedBodies]);

    const toggleCheck = (id: string) => {
        const next = new Set(checked);
        if (next.has(id)) next.delete(id); else next.add(id);
        setChecked(next);
    };

    const toggleExpand = (id: string) => {
        const next = new Set(expanded);
        if (next.has(id)) next.delete(id); else next.add(id);
        setExpanded(next);
    };

    const checkedPreviews = useMemo(() => previews.filter(p => checked.has(p.recipientId)), [previews, checked]);

    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const duplicateEmails = useMemo(() => {
        const emails = checkedPreviews.map(p => p.email.toLowerCase());
        const seen = new Set<string>();
        const dupes: string[] = [];
        for (const e of emails) {
            if (seen.has(e)) dupes.push(e);
            seen.add(e);
        }
        return [...new Set(dupes)];
    }, [checkedPreviews]);

    const invalidEmails = useMemo(
        () => checkedPreviews.filter(p => !emailRegex.test(p.email)).map(p => p.email),
        [checkedPreviews]
    );

    // Send
    const handleSend = async () => {
        setSending(true);
        try {
            const selectedIds = Array.from(checked);
            const overrides: Record<string, { subject?: string; body?: string }> = {};
            for (const id of selectedIds) {
                if (editedSubjects[id] || editedBodies[id]) {
                    const p = previews.find(x => x.recipientId === id)!;
                    overrides[id] = {
                        subject: getSubject(p),
                        body: getBody(p),
                    };
                }
            }

            const res = await fetch("/api/campaigns/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recipientIds: selectedIds, overrides }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setShowConfirmation(false);
            setResult({
                text: `Successfully sent ${data.sentCount} email(s)!${data.errors ? ` (${data.errors.length} failed)` : ""}`,
                type: data.errors ? "error" : "success",
            });
            router.refresh();
        } catch (err: any) {
            setShowConfirmation(false);
            setResult({ text: err.message, type: "error" });
        } finally {
            setSending(false);
        }
    };

    const isSingle = previews.length === 1;

    return (
        <>
            {/* Import quill CSS */}
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/react-quill-new@3/dist/quill.snow.css" />

            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    {isSingle ? "Review & Edit Email" : `Review ${previews.length} Emails`}
                                </h2>
                                <p className="text-sm text-gray-500">
                                    {isSingle
                                        ? "Preview and customize before sending"
                                        : `${checkedPreviews.length} of ${previews.length} selected to send`
                                    }
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        {loading && (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                                <p className="text-sm">Generating email previews...</p>
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl text-sm">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                {error}
                            </div>
                        )}

                        {result && (
                            <div className={`flex items-center gap-3 p-4 rounded-xl text-sm ${result.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                {result.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                                <span className="font-medium">{result.text}</span>
                                <button onClick={onClose} className="ml-auto text-sm underline">Close</button>
                            </div>
                        )}

                        {!loading && !error && !result && previews.map((p, idx) => (
                            <div key={p.recipientId} className={`border-2 rounded-2xl overflow-hidden transition-all ${!checked.has(p.recipientId) ? "opacity-50 border-gray-100" :
                                    expanded.has(p.recipientId) ? "border-blue-200 shadow-sm shadow-blue-100" : "border-gray-100"
                                }`}>
                                {/* Recipient header row */}
                                <div
                                    className="flex items-center gap-3 p-4 bg-gray-50/80 cursor-pointer hover:bg-gray-100/60 transition-colors"
                                    onClick={() => toggleExpand(p.recipientId)}
                                >
                                    {/* Checkbox */}
                                    <input
                                        type="checkbox"
                                        checked={checked.has(p.recipientId)}
                                        onChange={(e) => { e.stopPropagation(); toggleCheck(p.recipientId); }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                                    />

                                    {/* Number */}
                                    <span className="text-xs font-bold text-gray-400 w-6 shrink-0">#{idx + 1}</span>

                                    {/* Recipient info */}
                                    <div className="flex-1 min-w-0 flex items-center gap-4">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                            <span className="text-sm font-medium text-gray-900 truncate">
                                                {p.name || "Unknown"}
                                            </span>
                                        </div>
                                        <span className="text-sm text-gray-500 truncate hidden sm:block">{p.email}</span>
                                        {p.company && (
                                            <div className="flex items-center gap-1 hidden md:flex">
                                                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="text-sm text-gray-500 truncate">{p.company}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Status badge */}
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${p.status === "Pending" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                                        }`}>
                                        {p.status}
                                    </span>

                                    {/* Expand icon */}
                                    {expanded.has(p.recipientId) ? (
                                        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                                    )}
                                </div>

                                {/* Expanded email editor */}
                                {expanded.has(p.recipientId) && (
                                    <div className="p-4 space-y-4 border-t border-gray-100">
                                        {/* Recipient details bar */}
                                        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                            <span className="flex items-center gap-1 bg-gray-100 px-2.5 py-1 rounded-lg">
                                                <Mail className="w-3 h-3" /> {p.email}
                                            </span>
                                            {p.name && (
                                                <span className="flex items-center gap-1 bg-gray-100 px-2.5 py-1 rounded-lg">
                                                    <User className="w-3 h-3" /> {p.name}
                                                </span>
                                            )}
                                            {p.company && (
                                                <span className="flex items-center gap-1 bg-gray-100 px-2.5 py-1 rounded-lg">
                                                    <Building2 className="w-3 h-3" /> {p.company}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1 bg-gray-100 px-2.5 py-1 rounded-lg">
                                                <Briefcase className="w-3 h-3" /> {targetRole}
                                            </span>
                                        </div>

                                        {/* Subject line */}
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                                Subject Line
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={getSubject(p)}
                                                    onChange={(e) => setEditedSubjects(prev => ({ ...prev, [p.recipientId]: e.target.value }))}
                                                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                />
                                                <Edit3 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                                            </div>
                                        </div>

                                        {/* Email body editor */}
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                                Email Body
                                            </label>
                                            <div className="border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-gray-200 [&_.ql-toolbar]:bg-gray-50 [&_.ql-container]:border-0 [&_.ql-editor]:min-h-[200px] [&_.ql-editor]:text-sm [&_.ql-editor]:leading-relaxed">
                                                {quillReady && (
                                                    <ReactQuill
                                                        theme="snow"
                                                        value={getBody(p)}
                                                        onChange={(val: string) => setEditedBodies(prev => ({ ...prev, [p.recipientId]: val }))}
                                                        modules={quillModules}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Attachment info */}
                                        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${hasResume ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                                            <Paperclip className="w-3.5 h-3.5" />
                                            {hasResume ? "Resume PDF will be attached" : "No resume attached — configure in Settings"}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    {!loading && !error && !result && (
                        <div className="border-t border-gray-100 p-5 shrink-0 flex items-center justify-between bg-gray-50/50">
                            <div className="text-sm text-gray-500">
                                <span className="font-medium text-gray-700">{checkedPreviews.length}</span> of {previews.length} recipient{previews.length !== 1 ? "s" : ""} selected
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                {isSingle ? (
                                    <>
                                        <button
                                            onClick={() => {
                                                if (!expanded.has(previews[0].recipientId)) {
                                                    toggleExpand(previews[0].recipientId);
                                                } else {
                                                    setShowConfirmation(true);
                                                }
                                            }}
                                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                            Edit & Send
                                        </button>
                                        <button
                                            onClick={() => setShowConfirmation(true)}
                                            disabled={checkedPreviews.length === 0}
                                            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-sm shadow-blue-500/30 transition-all disabled:opacity-50"
                                        >
                                            <Send className="w-4 h-4" />
                                            Looks Good — Send
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setShowConfirmation(true)}
                                        disabled={checkedPreviews.length === 0}
                                        className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-sm shadow-blue-500/30 transition-all disabled:opacity-50"
                                    >
                                        <Send className="w-4 h-4" />
                                        Send to {checkedPreviews.length} recipient{checkedPreviews.length !== 1 ? "s" : ""}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation modal */}
            {showConfirmation && (
                <SendConfirmationModal
                    recipientCount={checkedPreviews.length}
                    hasResume={hasResume}
                    duplicateEmails={duplicateEmails}
                    invalidEmails={invalidEmails}
                    onConfirm={handleSend}
                    onCancel={() => setShowConfirmation(false)}
                    sending={sending}
                />
            )}
        </>
    );
}
