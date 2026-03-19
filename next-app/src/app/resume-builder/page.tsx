"use client";

import { useState, useRef, useEffect } from "react";
import {
    FileText, Briefcase, Sparkles, Copy, Download, CheckCircle2,
    AlertCircle, Loader2, RotateCcw, Code2, Wand2, Pencil, Eye
} from "lucide-react";

export default function ResumeBuilderPage() {
    const [jobDescription, setJobDescription] = useState("");
    const [resumeDetails, setResumeDetails] = useState("");
    const [latexOutput, setLatexOutput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const editorRef = useRef<HTMLTextAreaElement>(null);

    // Pre-fill resume details from settings if available
    useEffect(() => {
        async function fetchResumeFromSettings() {
            try {
                const res = await fetch("/api/settings");
                const data = await res.json();
                if (data.success && data.settings?.resumeText) {
                    setResumeDetails(data.settings.resumeText);
                }
            } catch {
                // Silently fail — user can type manually
            } finally {
                setLoadingSettings(false);
            }
        }
        fetchResumeFromSettings();
    }, []);

    // Auto-focus editor when switching to edit mode
    useEffect(() => {
        if (isEditing && editorRef.current) {
            editorRef.current.focus();
        }
    }, [isEditing]);

    const handleGenerate = async () => {
        if (!jobDescription.trim() || !resumeDetails.trim()) {
            setError("Please fill in both the Job Description and Resume Details.");
            return;
        }

        setLoading(true);
        setError(null);
        setLatexOutput("");
        setIsEditing(false);

        try {
            const res = await fetch("/api/resume/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jobDescription: jobDescription.trim(),
                    resumeDetails: resumeDetails.trim(),
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                const errMsg = data.error || "Failed to generate resume.";
                // Make API key errors more user-friendly
                if (errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID") || errMsg.includes("Failed to authenticate")) {
                    throw new Error("Your Groq API key is invalid. Please go to Settings → .env file and add a valid GROQ_API_KEY. Get one free at https://console.groq.com/keys");
                }
                if (errMsg.includes("GROQ_API_KEY") || errMsg.includes("Groq")) {
                    throw new Error("Groq API key is not configured. Add your GROQ_API_KEY to the .env file in the next-app folder. Get a free key at https://console.groq.com/keys");
                }
                throw new Error(errMsg);
            }

            setLatexOutput(data.latex);
        } catch (err: any) {
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(latexOutput);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            const textarea = document.createElement("textarea");
            textarea.value = latexOutput;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDownload = () => {
        const blob = new Blob([latexOutput], { type: "application/x-tex" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "resume_ats_optimized.tex";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleReset = () => {
        setJobDescription("");
        setLatexOutput("");
        setError(null);
        setIsEditing(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 p-6">
            {/* Header */}
            <div className="max-w-[1600px] mx-auto mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl shadow-lg shadow-violet-200">
                        <Wand2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">ATS Resume Builder</h1>
                        <p className="text-sm text-gray-500">
                            Paste a job description and your resume details — get a tailored, ATS-optimized LaTeX resume
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT: Inputs */}
                <div className="space-y-5">
                    {/* Job Description */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100 flex items-center gap-2.5">
                            <Briefcase className="w-5 h-5 text-blue-600" />
                            <h2 className="font-semibold text-gray-800">Job Description</h2>
                            <span className="text-xs text-gray-400 ml-auto">
                                Paste the target JD here
                            </span>
                        </div>
                        <div className="p-4">
                            <textarea
                                id="jd-input"
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                className="w-full h-56 p-4 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400"
                                placeholder="Paste the full job description here...&#10;&#10;Example:&#10;We are looking for a Senior Software Engineer with 3+ years of experience in React, Node.js, and AWS..."
                            />
                        </div>
                    </div>

                    {/* Resume Details */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-gray-100 flex items-center gap-2.5">
                            <FileText className="w-5 h-5 text-violet-600" />
                            <h2 className="font-semibold text-gray-800">Resume Details</h2>
                            <span className="text-xs text-gray-400 ml-auto">
                                {loadingSettings ? "Loading from settings..." : "Your experience, skills, projects"}
                            </span>
                        </div>
                        <div className="p-4">
                            <textarea
                                id="resume-input"
                                value={resumeDetails}
                                onChange={(e) => setResumeDetails(e.target.value)}
                                className="w-full h-56 p-4 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all placeholder:text-gray-400"
                                placeholder="Paste your current resume content or details here...&#10;&#10;Include:&#10;• Name, email, phone, LinkedIn&#10;• Work experience with dates&#10;• Projects and achievements&#10;• Skills and certifications&#10;• Education"
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            id="generate-btn"
                            onClick={handleGenerate}
                            disabled={loading || !jobDescription.trim() || !resumeDetails.trim()}
                            className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-violet-200 hover:shadow-xl hover:shadow-violet-300 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Generating ATS Resume...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    Generate ATS Resume
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleReset}
                            className="px-4 py-3.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all"
                            title="Reset"
                        >
                            <RotateCcw className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium mb-1">Generation Failed</p>
                                <p>{error}</p>
                                {error.includes("console.groq.com") && (
                                    <a
                                        href="https://console.groq.com/keys"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-medium transition-colors"
                                    >
                                        🔑 Get Free Groq API Key
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT: Output */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-4 bg-gradient-to-r from-gray-800 to-gray-900 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <Code2 className="w-5 h-5 text-emerald-400" />
                            <h2 className="font-semibold text-gray-100">LaTeX Output</h2>
                            {latexOutput && (
                                <span className="text-xs text-gray-500">
                                    {isEditing ? "— editing mode" : "— preview mode"}
                                </span>
                            )}
                            {!latexOutput && (
                                <span className="text-xs text-gray-400">
                                    — copy and paste into Overleaf
                                </span>
                            )}
                        </div>
                        {latexOutput && (
                            <div className="flex gap-2">
                                {/* Edit / Preview toggle */}
                                <button
                                    id="edit-toggle-btn"
                                    onClick={() => setIsEditing(!isEditing)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${isEditing
                                        ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                                        : "text-gray-300 bg-gray-700 hover:bg-gray-600"
                                        }`}
                                >
                                    {isEditing ? (
                                        <>
                                            <Eye className="w-3.5 h-3.5" />
                                            Preview
                                        </>
                                    ) : (
                                        <>
                                            <Pencil className="w-3.5 h-3.5" />
                                            Edit
                                        </>
                                    )}
                                </button>
                                <button
                                    id="copy-btn"
                                    onClick={handleCopy}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all"
                                >
                                    {copied ? (
                                        <>
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                            <span className="text-emerald-400">Copied!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5" />
                                            Copy
                                        </>
                                    )}
                                </button>
                                <button
                                    id="download-btn"
                                    onClick={handleDownload}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    .tex
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 bg-gray-950 overflow-auto min-h-[500px] max-h-[700px]">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400 p-4">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full border-4 border-gray-700 border-t-violet-500 animate-spin" />
                                    <Sparkles className="w-6 h-6 text-violet-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-gray-300">AI is tailoring your resume...</p>
                                    <p className="text-xs text-gray-500 mt-1">Optimizing for ATS keywords and formatting</p>
                                </div>
                            </div>
                        ) : latexOutput ? (
                            isEditing ? (
                                <textarea
                                    ref={editorRef}
                                    id="latex-editor"
                                    value={latexOutput}
                                    onChange={(e) => setLatexOutput(e.target.value)}
                                    className="w-full h-full min-h-[500px] max-h-[700px] p-4 text-sm text-amber-200 font-mono bg-gray-950 border-none resize-none focus:outline-none focus:ring-0 leading-relaxed"
                                    spellCheck={false}
                                />
                            ) : (
                                <pre className="text-sm text-emerald-300 font-mono whitespace-pre-wrap break-words leading-relaxed p-4">
                                    {latexOutput}
                                </pre>
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500 p-4">
                                <div className="p-4 rounded-full bg-gray-800/50">
                                    <FileText className="w-10 h-10 text-gray-600" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-gray-400">Your LaTeX resume will appear here</p>
                                    <p className="text-xs text-gray-600 mt-1">Fill in the job description and resume details, then click Generate</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Overleaf Tip / Edit info */}
                    {latexOutput && (
                        <div className={`px-5 py-3 border-t flex items-center gap-2 text-xs ${isEditing
                            ? "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100 text-amber-700"
                            : "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100 text-emerald-700"
                            }`}>
                            {isEditing ? (
                                <>
                                    <Pencil className="w-4 h-4 flex-shrink-0" />
                                    <span>
                                        <strong>Editing:</strong> Make your changes directly. Click <strong>Preview</strong> to switch back, or <strong>Download</strong> to save your edited version.
                                    </span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                    <span>
                                        <strong>Tip:</strong> Click <strong>Edit</strong> to modify, then Copy/Download → go to{" "}
                                        <a
                                            href="https://www.overleaf.com/project"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="underline hover:text-emerald-900 font-medium"
                                        >
                                            Overleaf
                                        </a>
                                        {" "}→ New Project → Blank → paste → Compile
                                    </span>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
