"use client";

import { SpamCheckResult } from "@/lib/checkSpamScore";
import { ShieldCheck, ShieldAlert, ShieldX, AlertTriangle } from "lucide-react";

interface Props {
    result: SpamCheckResult;
}

// Visual spam score indicator with color coding and flagged word list
export default function SpamScoreIndicator({ result }: Props) {
    const { score, flaggedWords } = result;

    // Determine color zone
    const isGreen = score >= 90;
    const isYellow = score >= 60 && score < 90;
    const isRed = score < 60;

    // Pick styling based on zone
    const bgColor = isGreen
        ? "bg-emerald-50 border-emerald-200"
        : isYellow
            ? "bg-amber-50 border-amber-200"
            : "bg-red-50 border-red-200";

    const textColor = isGreen
        ? "text-emerald-700"
        : isYellow
            ? "text-amber-700"
            : "text-red-700";

    const barColor = isGreen
        ? "bg-emerald-500"
        : isYellow
            ? "bg-amber-500"
            : "bg-red-500";

    const Icon = isGreen ? ShieldCheck : isYellow ? ShieldAlert : ShieldX;

    const label = isGreen
        ? "Great — safe to send"
        : isYellow
            ? "Caution — may go to spam"
            : "High risk — fix before sending";

    return (
        <div className={`rounded-xl border p-4 ${bgColor} transition-all`}>
            {/* Score header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${textColor}`} />
                    <span className={`text-sm font-semibold ${textColor}`}>{label}</span>
                </div>
                <div className={`text-2xl font-bold ${textColor}`}>
                    {score}<span className="text-sm font-normal opacity-70">/100</span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${score}%` }}
                />
            </div>

            {/* Flagged words (only if any found) */}
            {flaggedWords.length > 0 && (
                <div className="mt-2">
                    <p className={`text-xs font-medium ${textColor} mb-1.5 flex items-center gap-1`}>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Flagged words ({flaggedWords.length}):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {flaggedWords.map((word) => (
                            <span
                                key={word}
                                className={`px-2 py-0.5 text-xs font-medium rounded-full ${isRed
                                        ? "bg-red-100 text-red-800"
                                        : "bg-amber-100 text-amber-800"
                                    }`}
                            >
                                &quot;{word}&quot;
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Block warning */}
            {isRed && (
                <div className="mt-3 p-2.5 bg-red-100 rounded-lg text-xs text-red-800 font-medium">
                    ⛔ Sending is blocked. Remove or rephrase the flagged words above to improve your score.
                </div>
            )}
        </div>
    );
}
