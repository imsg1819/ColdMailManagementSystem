"use client";

import { useState, useEffect } from "react";
import { Play, Loader2 } from "lucide-react";
import AppPasswordGuide from "@/components/AppPasswordGuide";
import PreSendFlow from "./PreSendFlow";

export default function LaunchCampaignButton() {
    const [showGuide, setShowGuide] = useState(false);
    const [showPreSend, setShowPreSend] = useState(false);
    const [hasAppPassword, setHasAppPassword] = useState<boolean | null>(null);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        fetch("/api/settings")
            .then(res => res.json())
            .then(data => {
                setHasAppPassword(!!data.settings?.senderAppPassword);
            })
            .catch(() => setHasAppPassword(false));
    }, []);

    const handleLaunch = () => {
        // Check if app password is configured
        if (!hasAppPassword) {
            setShowGuide(true);
            return;
        }
        setShowPreSend(true);
    };

    return (
        <>
            {showGuide && <AppPasswordGuide onClose={() => setShowGuide(false)} />}
            {showPreSend && (
                <PreSendFlow
                    recipientIds={[]}  // Empty = all pending
                    onClose={() => setShowPreSend(false)}
                />
            )}
            <button
                onClick={handleLaunch}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm shadow-blue-500/30 transition-all"
            >
                <Play className="w-4 h-4" />
                Launch Campaign
            </button>
        </>
    );
}
