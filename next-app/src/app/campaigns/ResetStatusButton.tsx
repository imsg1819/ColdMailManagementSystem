"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ResetStatusButton() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleReset = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/campaigns/reset", { method: "POST" });
            if (res.ok) {
                router.refresh();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleReset}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors disabled:opacity-50"
            title="Reset all to Pending (for re-sending)"
        >
            <RotateCcw className="w-3.5 h-3.5" />
            {loading ? "Resetting..." : "Reset to Pending"}
        </button>
    );
}
