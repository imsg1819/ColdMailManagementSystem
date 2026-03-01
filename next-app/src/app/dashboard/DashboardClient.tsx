"use client";

import { useState, useEffect } from "react";
import AppPasswordGuide from "@/components/AppPasswordGuide";

export default function DashboardClient() {
    const [showGuide, setShowGuide] = useState(false);

    useEffect(() => {
        // Check if user has app password configured
        fetch("/api/settings")
            .then(res => res.json())
            .then(data => {
                if (!data.settings?.senderAppPassword) {
                    setShowGuide(true);
                }
            })
            .catch(() => { });
    }, []);

    return (
        <>
            {showGuide && (
                <AppPasswordGuide onClose={() => setShowGuide(false)} />
            )}
        </>
    );
}
