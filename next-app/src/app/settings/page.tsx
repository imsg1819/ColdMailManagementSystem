"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Save, Mail, Lock, User, Linkedin, Github, Globe } from "lucide-react";

export default function SettingsPage() {
    const [role, setRole] = useState("");
    const [yoe, setYoe] = useState("");
    const [skills, setSkills] = useState("");
    const [linkedinUrl, setLinkedinUrl] = useState("");
    const [githubUrl, setGithubUrl] = useState("");
    const [portfolioUrl, setPortfolioUrl] = useState("");
    const [senderName, setSenderName] = useState("");
    const [senderEmail, setSenderEmail] = useState("");
    const [senderAppPassword, setSenderAppPassword] = useState("");

    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });

    useEffect(() => {
        fetch("/api/settings")
            .then(res => res.json())
            .then(data => {
                if (data.success && data.settings) {
                    const s = data.settings;
                    setRole(s.targetRole || "");
                    setYoe(s.yearsOfExperience || "");
                    setSkills(s.skills || "");
                    setLinkedinUrl(s.linkedinUrl || "");
                    setGithubUrl(s.githubUrl || "");
                    setPortfolioUrl(s.portfolioUrl || "");
                    setSenderName(s.senderName || "");
                    setSenderEmail(s.senderEmail || "");
                    setSenderAppPassword(s.senderAppPassword || "");
                }
            })
            .catch(() => { });
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: "", type: "" });

        try {
            const formData = new FormData();
            formData.append("targetRole", role);
            formData.append("yearsOfExperience", yoe);
            formData.append("skills", skills);
            formData.append("linkedinUrl", linkedinUrl);
            formData.append("githubUrl", githubUrl);
            formData.append("portfolioUrl", portfolioUrl);
            formData.append("senderName", senderName);
            formData.append("senderEmail", senderEmail);
            formData.append("senderAppPassword", senderAppPassword);

            if (file) {
                formData.append("resume", file);
            }

            const res = await fetch("/api/settings", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to save settings");
            }

            setMessage({ text: "Settings saved successfully", type: "success" });
        } catch (err: any) {
            setMessage({ text: err.message || "An error occurred", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto w-full">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                    <p className="text-gray-500 mt-2">Configure your profile, resume, and email sending preferences.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                {message.text && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSaveSettings} className="space-y-8">

                    {/* Sender Config Section */}
                    <div className="border-b border-gray-100 pb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Mail className="w-5 h-5 text-blue-500" />
                            Email Sender Configuration
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={senderName}
                                        onChange={(e) => setSenderName(e.target.value)}
                                        placeholder="e.g. Aesha Gupta"
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Gmail Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                                    <input
                                        type="email"
                                        value={senderEmail}
                                        onChange={(e) => setSenderEmail(e.target.value)}
                                        placeholder="your.email@gmail.com"
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Gmail App Password <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                                    <input
                                        type="password"
                                        value={senderAppPassword}
                                        onChange={(e) => setSenderAppPassword(e.target.value)}
                                        placeholder="xxxx xxxx xxxx xxxx"
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-1">16-character code from Google App Passwords. Required for sending emails.</p>
                            </div>
                        </div>
                    </div>

                    {/* Resume Upload Section */}
                    <div className="border-b border-gray-100 pb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resume Upload</h3>
                        <div
                            className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".pdf"
                                onChange={handleFileChange}
                            />
                            <div className="mx-auto w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                                {file ? <FileText className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                            </div>
                            <h4 className="text-sm font-medium text-gray-900 mb-1">
                                {file ? file.name : "Click to upload a PDF resume"}
                            </h4>
                            <p className="text-xs text-gray-500">
                                {file ? "File selected. Click save to upload and parse." : "PDF format up to 5MB. This will be attached to your cold emails."}
                            </p>
                        </div>
                    </div>

                    {/* Job Preferences Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8 border-b border-gray-100">
                        <div className="col-span-1 md:col-span-2">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Preferences</h3>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Target Job Role</label>
                            <input
                                type="text"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                placeholder="e.g. Senior Frontend Developer"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                            <input
                                type="text"
                                value={yoe}
                                onChange={(e) => setYoe(e.target.value)}
                                placeholder="e.g. 5 Years"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                                required
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Key Skills (Comma separated)</label>
                            <input
                                type="text"
                                value={skills}
                                onChange={(e) => setSkills(e.target.value)}
                                placeholder="e.g. React, Next.js, Node.js, TypeScript"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Social & Portfolio Links */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8 border-b border-gray-100">
                        <div className="col-span-1 md:col-span-3">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Social & Portfolio Links <span className="text-sm font-normal text-gray-400">(optional)</span></h3>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                                <Linkedin className="w-4 h-4 text-blue-700" /> LinkedIn
                            </label>
                            <input
                                type="url"
                                value={linkedinUrl}
                                onChange={(e) => setLinkedinUrl(e.target.value)}
                                placeholder="https://linkedin.com/in/..."
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                                <Github className="w-4 h-4 text-gray-800" /> GitHub
                            </label>
                            <input
                                type="url"
                                value={githubUrl}
                                onChange={(e) => setGithubUrl(e.target.value)}
                                placeholder="https://github.com/..."
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                                <Globe className="w-4 h-4 text-green-600" /> Portfolio
                            </label>
                            <input
                                type="url"
                                value={portfolioUrl}
                                onChange={(e) => setPortfolioUrl(e.target.value)}
                                placeholder="https://myportfolio.com"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm shadow-blue-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            <Save className="w-5 h-5" />
                            {loading ? "Saving & Parsing..." : "Save Settings"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
