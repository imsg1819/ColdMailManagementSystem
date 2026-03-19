"use client";

import { useState } from "react";
import { Eye, X, Paperclip, Mail, User, Building2, AlertTriangle } from "lucide-react";
import { checkSpamScore, SpamCheckResult } from "@/lib/checkSpamScore";
import SpamScoreIndicator from "./SpamScoreIndicator";

interface PreviewData {
    from: string;
    fromName: string;
    to: string;
    toName: string;
    toCompany: string;
    subject: string;
    body: string;
    hasResume: boolean;
    resumePath: string | null;
    isSimulation: boolean;
}

export default function EmailPreviewModal({ recipientId }: { recipientId?: string }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const [error, setError] = useState("");
    const [spamResult, setSpamResult] = useState<SpamCheckResult | null>(null);

    const handleOpen = async () => {
        setOpen(true);
        setLoading(true);
        setError("");

        try {
            const url = recipientId
                ? `/api/campaigns/preview?recipientId=${recipientId}`
                : `/api/campaigns/preview`;
            const res = await fetch(url);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);
            setPreview(data.preview);
            // Run spam check on loaded preview
            setSpamResult(checkSpamScore(data.preview.subject, data.preview.body));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={handleOpen}
                className="text-blue-600 hover:text-blue-800 transition-colors"
                title="Preview Email"
            >
                <Eye className="w-4 h-4" />
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Mail className="w-5 h-5 text-blue-500" />
                                Email Preview
                            </h3>
                            <button
                                onClick={() => setOpen(false)}
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-5">
                            {loading && (
                                <div className="text-center py-12 text-gray-500">Loading preview...</div>
                            )}

                            {error && (
                                <div className="text-center py-12 text-red-600">{error}</div>
                            )}

                            {preview && !loading && (
                                <div className="space-y-4">
                                    {/* Simulation Warning */}
                                    {preview.isSimulation && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-sm">
                                            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                            <span className="text-amber-800">
                                                <strong>Simulation Mode:</strong> Your network blocks SMTP. Emails are marked as "Sent" but not actually delivered. Connect to an unrestricted network (home WiFi/mobile hotspot) for real sending.
                                            </span>
                                        </div>
                                    )}

                                    {/* Email Metadata */}
                                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                                        <div className="flex gap-3">
                                            <span className="text-gray-500 w-16 shrink-0 font-medium">From:</span>
                                            <span className="text-gray-900">{preview.fromName} &lt;{preview.from}&gt;</span>
                                        </div>
                                        <div className="flex gap-3">
                                            <span className="text-gray-500 w-16 shrink-0 font-medium">To:</span>
                                            <span className="text-gray-900">{preview.toName !== "—" ? `${preview.toName} <${preview.to}>` : preview.to}</span>
                                        </div>
                                        <div className="flex gap-3">
                                            <span className="text-gray-500 w-16 shrink-0 font-medium">Subject:</span>
                                            <span className="text-gray-900 font-medium">{preview.subject}</span>
                                        </div>
                                        <div className="flex gap-3 items-center">
                                            <span className="text-gray-500 w-16 shrink-0 font-medium">Attach:</span>
                                            {preview.hasResume ? (
                                                <span className="text-green-700 flex items-center gap-1">
                                                    <Paperclip className="w-3.5 h-3.5" />
                                                    Resume PDF attached ✓
                                                </span>
                                            ) : (
                                                <span className="text-orange-600">No resume uploaded — configure in Settings</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Spam Score — shown above the body for visibility */}
                                    {spamResult && (
                                        <SpamScoreIndicator result={spamResult} />
                                    )}

                                    {/* Email Body */}
                                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Email Body
                                        </div>
                                        <div
                                            className="p-5 prose prose-sm max-w-none"
                                            dangerouslySetInnerHTML={{ __html: preview.body }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-100 p-4 flex justify-end">
                            <button
                                onClick={() => setOpen(false)}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
