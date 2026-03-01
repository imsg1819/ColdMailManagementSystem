"use client";

import { useState, useRef } from "react";
import { Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import ValidationReport from "./ValidationReport";

export default function UploadExcelClient() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [validationData, setValidationData] = useState<any>(null);
    const router = useRouter();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setLoading(true);
            setMessage({ text: "", type: "" });

            try {
                const formData = new FormData();
                formData.append("excel", file);

                // Step 1: Validate the file
                const res = await fetch("/api/campaigns/validate", {
                    method: "POST",
                    body: formData,
                });

                const data = await res.json();

                if (!res.ok) throw new Error(data.error || "Failed to validate file");

                // Step 2: Show validation report
                setValidationData(data);
            } catch (err: any) {
                setMessage({ text: err.message, type: "error" });
            } finally {
                setLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        }
    };

    const handleCloseReport = () => {
        setValidationData(null);
        router.refresh();
    };

    return (
        <>
            {/* Validation Report Modal */}
            {validationData && (
                <ValidationReport
                    data={validationData}
                    onClose={handleCloseReport}
                />
            )}

            <div className="flex items-center gap-3">
                {message.text && (
                    <div className={`px-4 py-2 text-sm rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {message.text}
                    </div>
                )}
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:border-blue-500 hover:text-blue-600 text-gray-700 font-medium rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {loading ? "Validating..." : "Upload Excel"}
                </button>
            </div>
        </>
    );
}
