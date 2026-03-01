"use client";

import { useState } from "react";
import { X, ExternalLink, Shield, Key, CheckCircle2, ArrowRight } from "lucide-react";

interface Props {
    onClose: () => void;
    onConfigured?: () => void;
}

export default function AppPasswordGuide({ onClose, onConfigured }: Props) {
    const [step, setStep] = useState(0);

    const steps = [
        {
            title: "Enable 2-Step Verification",
            description: "Go to your Google Account security settings and enable 2-Step Verification if you haven't already.",
            link: "https://myaccount.google.com/security",
            linkText: "Open Google Security Settings",
            icon: "🔐",
        },
        {
            title: "Go to App Passwords",
            description: "Once 2-Step Verification is enabled, navigate to App Passwords. You may need to search for 'App Passwords' in your Google Account.",
            link: "https://myaccount.google.com/apppasswords",
            linkText: "Open App Passwords",
            icon: "🔑",
        },
        {
            title: "Generate App Password",
            description: "Click 'Select app' → choose 'Mail'. Click 'Select device' → choose 'Other' and type 'ColdMails'. Click 'Generate'.",
            icon: "⚙️",
        },
        {
            title: "Copy the 16-character Password",
            description: "Google will show you a 16-character password (like: abcd efgh ijkl mnop). Copy this password — you won't be able to see it again!",
            icon: "📋",
        },
        {
            title: "Paste in Settings",
            description: "Go to Settings in ColdMails and paste the 16-character App Password in the 'Gmail App Password' field. Save your settings.",
            icon: "✅",
        },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-100">
                            <Key className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Setup Google App Password</h2>
                            <p className="text-sm text-gray-500">Required to send emails via Gmail SMTP</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Steps */}
                <div className="p-6">
                    <div className="space-y-4">
                        {steps.map((s, i) => (
                            <div
                                key={i}
                                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${i === step
                                        ? "border-blue-500 bg-blue-50/50"
                                        : i < step
                                            ? "border-green-200 bg-green-50/30"
                                            : "border-gray-100 bg-gray-50/50 opacity-60"
                                    }`}
                                onClick={() => setStep(i)}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="text-2xl shrink-0">{i < step ? "✅" : s.icon}</div>
                                    <div className="min-w-0">
                                        <h4 className="font-semibold text-gray-900 text-sm">
                                            Step {i + 1}: {s.title}
                                        </h4>
                                        {i === step && (
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-600">{s.description}</p>
                                                {s.link && (
                                                    <a
                                                        href={s.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                        {s.linkText}
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex items-center justify-between">
                    {step < steps.length - 1 ? (
                        <>
                            <button
                                onClick={onClose}
                                className="text-sm text-gray-500 hover:text-gray-700"
                            >
                                I'll do it later
                            </button>
                            <button
                                onClick={() => setStep(step + 1)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-all"
                            >
                                Next Step <ArrowRight className="w-4 h-4" />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={onClose}
                                className="text-sm text-gray-500 hover:text-gray-700"
                            >
                                Close
                            </button>
                            <a
                                href="/settings"
                                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl text-sm transition-all"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Go to Settings
                            </a>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
