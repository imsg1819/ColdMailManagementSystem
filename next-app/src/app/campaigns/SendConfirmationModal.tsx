"use client";

import { useState } from "react";
import { X, CheckCircle2, AlertTriangle, ShieldCheck, Paperclip, Mail, Send, Loader2 } from "lucide-react";

interface Props {
    recipientCount: number;
    hasResume: boolean;
    duplicateEmails: string[];
    invalidEmails: string[];
    onConfirm: () => void;
    onCancel: () => void;
    sending: boolean;
}

export default function SendConfirmationModal({
    recipientCount,
    hasResume,
    duplicateEmails,
    invalidEmails,
    onConfirm,
    onCancel,
    sending,
}: Props) {
    const noDuplicates = duplicateEmails.length === 0;
    const allValid = invalidEmails.length === 0;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-100">
                            <Send className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Confirm Send</h3>
                            <p className="text-sm text-gray-500 mt-0.5">
                                You are about to send <strong className="text-gray-800">{recipientCount} email{recipientCount !== 1 ? "s" : ""}</strong>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Checklist */}
                <div className="p-6 space-y-3">
                    {/* No duplicates */}
                    <div className={`flex items-start gap-3 p-3 rounded-xl ${noDuplicates ? "bg-green-50" : "bg-red-50"}`}>
                        {noDuplicates ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                        )}
                        <div>
                            <p className={`text-sm font-medium ${noDuplicates ? "text-green-800" : "text-red-800"}`}>
                                {noDuplicates ? "No duplicates detected" : `${duplicateEmails.length} duplicate email(s) found`}
                            </p>
                            {!noDuplicates && (
                                <p className="text-xs text-red-600 mt-1">{duplicateEmails.join(", ")}</p>
                            )}
                        </div>
                    </div>

                    {/* All emails valid */}
                    <div className={`flex items-start gap-3 p-3 rounded-xl ${allValid ? "bg-green-50" : "bg-red-50"}`}>
                        {allValid ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                        )}
                        <div>
                            <p className={`text-sm font-medium ${allValid ? "text-green-800" : "text-red-800"}`}>
                                {allValid ? "All email addresses are valid" : `${invalidEmails.length} invalid email(s)`}
                            </p>
                            {!allValid && (
                                <p className="text-xs text-red-600 mt-1">{invalidEmails.join(", ")}</p>
                            )}
                        </div>
                    </div>

                    {/* Attachments */}
                    <div className={`flex items-start gap-3 p-3 rounded-xl ${hasResume ? "bg-green-50" : "bg-amber-50"}`}>
                        {hasResume ? (
                            <Paperclip className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                        )}
                        <p className={`text-sm font-medium ${hasResume ? "text-green-800" : "text-amber-800"}`}>
                            {hasResume ? "Resume PDF attached" : "No resume attached — configure in Settings"}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 pt-2 border-t border-gray-100 flex items-center justify-end gap-3">
                    <button
                        onClick={onCancel}
                        disabled={sending}
                        className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={sending}
                        className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-500/30 transition-all disabled:opacity-50"
                    >
                        {sending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Confirm & Send
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
