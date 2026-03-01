"use client";

import { useState, useMemo } from "react";
import {
    CheckCircle2, XCircle, AlertTriangle, Wrench, Download, ArrowRight,
    X, FileSpreadsheet, Loader2, Edit3, Check, Trash2
} from "lucide-react";
import { useRouter } from "next/navigation";

// ---- Types ----
interface ValidatedRow {
    row: number;
    name: string;
    company: string;
    email: string;
    location?: string;
    timezone?: string;
    timezoneEstimated?: boolean;
}

interface Issue {
    row: number;
    column: string;
    issue: string;
    value: string;
}

interface DuplicateGroup {
    email: string;
    rows: ValidatedRow[];
}

interface ValidationData {
    summary: {
        total: number;
        valid: number;
        errors: number;
        warnings: number;
        autoFixed: number;
        duplicateGroups: number;
    };
    valid: ValidatedRow[];
    errors: Issue[];
    warnings: Issue[];
    autoFixed: Issue[];
    duplicateGroups: DuplicateGroup[];
}

interface Props {
    data: ValidationData;
    onClose: () => void;
}

type TabKey = "valid" | "errors" | "warnings" | "autoFixed";

// ---- Component ----
export default function ValidationReport({ data, onClose }: Props) {
    const [activeTab, setActiveTab] = useState<TabKey>(() =>
        data.errors.length > 0 ? "errors" : "valid"
    );
    const [validRows, setValidRows] = useState<ValidatedRow[]>(data.valid);
    const [errorIssues, setErrorIssues] = useState<Issue[]>(data.errors);
    const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>(data.duplicateGroups);
    const [editingCell, setEditingCell] = useState<{ row: number; column: string } | null>(null);
    const [editValue, setEditValue] = useState("");
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<{ text: string; type: string } | null>(null);
    const router = useRouter();

    // Resolved duplicates tracking
    const [removedDuplicateRows, setRemovedDuplicateRows] = useState<Set<number>>(new Set());

    // Compute counts
    const activeValid = useMemo(() =>
        validRows.filter(v => !removedDuplicateRows.has(v.row)),
        [validRows, removedDuplicateRows]
    );

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const unresolvedErrors = useMemo(() =>
        errorIssues.filter(e => e.issue === "Invalid email format" || e.issue === "Email is empty"),
        [errorIssues]
    );

    const canProceed = unresolvedErrors.length === 0 && activeValid.length > 0;

    // Banner color
    const bannerType = errorIssues.length > 0 ? "error"
        : data.warnings.length > 0 ? "warning"
            : "success";

    // ---- Inline editing ----
    const startEdit = (row: number, column: string, value: string) => {
        setEditingCell({ row, column });
        setEditValue(value);
    };

    const confirmEdit = () => {
        if (!editingCell) return;
        const { row, column } = editingCell;
        const newValue = editValue.trim();

        if (column === "Email") {
            // Try to fix the error
            if (EMAIL_REGEX.test(newValue)) {
                // Move from errors to valid
                setErrorIssues(prev => prev.filter(e => !(e.row === row && e.column === "Email")));
                // Find original error to get name/company from other rows or use empty
                const existingValid = validRows.find(v => v.row === row);
                if (existingValid) {
                    setValidRows(prev => prev.map(v => v.row === row ? { ...v, email: newValue } : v));
                } else {
                    setValidRows(prev => [...prev, { row, name: "", company: "", email: newValue }]);
                }
            } else {
                // Update the error value
                setErrorIssues(prev => prev.map(e =>
                    e.row === row && e.column === "Email" ? { ...e, value: newValue } : e
                ));
            }
        }
        setEditingCell(null);
    };

    // ---- Duplicate resolution ----
    const resolveDuplicate = (email: string, action: "keepFirst" | "keepSecond" | "removeBoth") => {
        const group = duplicateGroups.find(g => g.email === email);
        if (!group || group.rows.length < 2) return;

        const toRemove = new Set(removedDuplicateRows);
        if (action === "keepFirst") {
            group.rows.slice(1).forEach(r => toRemove.add(r.row));
        } else if (action === "keepSecond") {
            toRemove.add(group.rows[0].row);
            group.rows.slice(2).forEach(r => toRemove.add(r.row));
        } else {
            group.rows.forEach(r => toRemove.add(r.row));
        }
        setRemovedDuplicateRows(toRemove);
        setDuplicateGroups(prev => prev.filter(g => g.email !== email));
    };

    // ---- Download cleaned Excel ----
    const downloadCleaned = async () => {
        const XLSX = await import("xlsx");
        const wsData = activeValid.map(v => ({
            Name: v.name,
            Company: v.company,
            Email: v.email,
        }));
        const ws = XLSX.utils.json_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Cleaned Contacts");
        XLSX.writeFile(wb, "cleaned_contacts.xlsx");
    };

    // ---- Confirm import ----
    const handleProceed = async () => {
        setImporting(true);
        try {
            const contacts = activeValid.map(v => ({
                name: v.name,
                company: v.company,
                email: v.email,
                location: v.location,
                timezone: v.timezone,
                timezoneEstimated: v.timezoneEstimated
            }));

            const res = await fetch("/api/campaigns/confirm-upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contacts }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error);

            setResult({ text: `Successfully imported ${d.count} contacts!`, type: "success" });
            router.refresh();
        } catch (err: any) {
            setResult({ text: err.message, type: "error" });
        } finally {
            setImporting(false);
        }
    };

    // ---- Tab configs ----
    const tabs: { key: TabKey; label: string; icon: string; count: number }[] = [
        { key: "valid", label: "Valid", icon: "✅", count: activeValid.length },
        { key: "errors", label: "Errors", icon: "❌", count: errorIssues.length },
        { key: "warnings", label: "Warnings", icon: "⚠️", count: data.warnings.length },
        { key: "autoFixed", label: "Auto-Fixed", icon: "🔧", count: data.autoFixed.length },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                            <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">File Validation Report</h2>
                            <p className="text-sm text-gray-500">{data.summary.total} rows processed</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Summary banner */}
                <div className={`px-5 py-3 flex items-center gap-4 text-sm font-medium shrink-0 ${bannerType === "error" ? "bg-red-50 text-red-800 border-b border-red-100"
                    : bannerType === "warning" ? "bg-amber-50 text-amber-800 border-b border-amber-100"
                        : "bg-green-50 text-green-800 border-b border-green-100"
                    }`}>
                    {bannerType === "error" ? <XCircle className="w-5 h-5 shrink-0" />
                        : bannerType === "warning" ? <AlertTriangle className="w-5 h-5 shrink-0" />
                            : <CheckCircle2 className="w-5 h-5 shrink-0" />
                    }
                    <span>
                        <strong>{activeValid.length}</strong> valid contacts ready
                        {errorIssues.length > 0 && <> &nbsp;|&nbsp; <span className="text-red-600"><strong>{errorIssues.length}</strong> errors found</span></>}
                        {data.autoFixed.length > 0 && <> &nbsp;|&nbsp; <span className="text-blue-600"><strong>{data.autoFixed.length}</strong> auto-fixed</span></>}
                        {data.warnings.length > 0 && <> &nbsp;|&nbsp; <span className="text-amber-600"><strong>{data.warnings.length}</strong> warnings</span></>}
                    </span>
                </div>

                {/* Result message */}
                {result && (
                    <div className={`px-5 py-3 flex items-center gap-3 text-sm font-medium ${result.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                        }`}>
                        {result.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {result.text}
                        <button onClick={onClose} className="ml-auto underline text-sm">Close</button>
                    </div>
                )}

                {/* Tabs */}
                {!result && (
                    <>
                        <div className="flex border-b border-gray-100 px-5 shrink-0">
                            {tabs.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === tab.key
                                        ? "border-blue-600 text-blue-700"
                                        : "border-transparent text-gray-500 hover:text-gray-700"
                                        }`}
                                >
                                    <span>{tab.icon}</span>
                                    {tab.label} ({tab.count})
                                </button>
                            ))}
                        </div>

                        {/* Tab content */}
                        <div className="flex-1 overflow-y-auto">
                            {/* ---- VALID TAB ---- */}
                            {activeTab === "valid" && (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr className="text-gray-500 font-medium whitespace-nowrap">
                                            <th className="px-5 py-3 w-16">Row</th>
                                            <th className="px-5 py-3">Name</th>
                                            <th className="px-5 py-3">Company</th>
                                            <th className="px-5 py-3">Email</th>
                                            <th className="px-5 py-3">Timezone</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {activeValid.map(v => (
                                            <tr key={v.row} className="hover:bg-gray-50/50">
                                                <td className="px-5 py-2.5 text-gray-400 font-mono text-xs">{v.row}</td>
                                                <td className="px-5 py-2.5 text-gray-800">{v.name || <span className="text-gray-300">—</span>}</td>
                                                <td className="px-5 py-2.5 text-gray-800">{v.company || <span className="text-gray-300">—</span>}</td>
                                                <td className="px-5 py-2.5 text-gray-800 font-medium">{v.email}</td>
                                                <td className="px-5 py-2.5 text-gray-600 text-sm">
                                                    {v.timezone ? (
                                                        <span className="flex items-center gap-1.5" title={v.location ? `Detected from: ${v.location}` : ""}>
                                                            {v.timezone.replace("_", " ")}
                                                            {v.timezoneEstimated && <span title="Estimated timezone"><AlertTriangle className="w-3 h-3 text-amber-500" /></span>}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {activeValid.length === 0 && (
                                            <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">No valid contacts</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {/* ---- ERRORS TAB ---- */}
                            {activeTab === "errors" && (
                                <div className="p-5 space-y-4">
                                    {/* Critical errors table */}
                                    {errorIssues.length > 0 ? (
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-red-50/50">
                                                <tr className="text-red-700 font-medium">
                                                    <th className="px-5 py-3 w-16">Row</th>
                                                    <th className="px-5 py-3 w-24">Column</th>
                                                    <th className="px-5 py-3">Issue</th>
                                                    <th className="px-5 py-3">Value</th>
                                                    <th className="px-5 py-3 w-28">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-red-50">
                                                {errorIssues.map((e, idx) => (
                                                    <tr key={idx} className="hover:bg-red-50/30">
                                                        <td className="px-5 py-2.5 text-gray-400 font-mono text-xs">{e.row}</td>
                                                        <td className="px-5 py-2.5">
                                                            <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-md">{e.column}</span>
                                                        </td>
                                                        <td className="px-5 py-2.5 text-gray-700">{e.issue}</td>
                                                        <td className="px-5 py-2.5">
                                                            {editingCell?.row === e.row && editingCell?.column === e.column ? (
                                                                <div className="flex items-center gap-1">
                                                                    <input
                                                                        type="text"
                                                                        value={editValue}
                                                                        onChange={(ev) => setEditValue(ev.target.value)}
                                                                        onKeyDown={(ev) => { if (ev.key === "Enter") confirmEdit(); if (ev.key === "Escape") setEditingCell(null); }}
                                                                        className="px-2 py-1 border-2 border-blue-400 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                                                        autoFocus
                                                                    />
                                                                    <button onClick={confirmEdit} className="p-1 text-green-600 hover:bg-green-50 rounded">
                                                                        <Check className="w-4 h-4" />
                                                                    </button>
                                                                    <button onClick={() => setEditingCell(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <code className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded">{e.value}</code>
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-2.5">
                                                            {!editingCell && (
                                                                <button
                                                                    onClick={() => startEdit(e.row, e.column, e.value === "(empty)" ? "" : e.value)}
                                                                    className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                                                                >
                                                                    <Edit3 className="w-3 h-3" />
                                                                    Fix
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="py-8 text-center text-gray-400 flex flex-col items-center gap-2">
                                            <CheckCircle2 className="w-8 h-8 text-green-400" />
                                            <p>All errors resolved!</p>
                                        </div>
                                    )}

                                    {/* Duplicate groups */}
                                    {duplicateGroups.length > 0 && (
                                        <div className="mt-6">
                                            <h4 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
                                                <Trash2 className="w-4 h-4 text-amber-500" />
                                                Duplicate Emails ({duplicateGroups.length})
                                            </h4>
                                            <div className="space-y-3">
                                                {duplicateGroups.map(group => (
                                                    <div key={group.email} className="border-2 border-amber-200 rounded-xl p-4 bg-amber-50/30">
                                                        <p className="text-sm font-medium text-amber-800 mb-3">
                                                            Duplicate: <strong>{group.email}</strong> (found in rows {group.rows.map(r => r.row).join(", ")})
                                                        </p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                                                            {group.rows.map((r, idx) => (
                                                                <div key={r.row} className="bg-white rounded-lg p-3 border border-gray-200 text-sm">
                                                                    <div className="text-gray-400 text-xs mb-1">Row {r.row} {idx === 0 ? "(First)" : `(#${idx + 1})`}</div>
                                                                    <div><strong>Name:</strong> {r.name || "—"}</div>
                                                                    <div><strong>Company:</strong> {r.company || "—"}</div>
                                                                    <div><strong>Email:</strong> {r.email}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => resolveDuplicate(group.email, "keepFirst")}
                                                                className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors"
                                                            >
                                                                Keep First
                                                            </button>
                                                            {group.rows.length === 2 && (
                                                                <button
                                                                    onClick={() => resolveDuplicate(group.email, "keepSecond")}
                                                                    className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
                                                                >
                                                                    Keep Second
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => resolveDuplicate(group.email, "removeBoth")}
                                                                className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors"
                                                            >
                                                                Remove Both
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ---- WARNINGS TAB ---- */}
                            {activeTab === "warnings" && (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-amber-50/50 sticky top-0">
                                        <tr className="text-amber-700 font-medium">
                                            <th className="px-5 py-3 w-16">Row</th>
                                            <th className="px-5 py-3 w-24">Column</th>
                                            <th className="px-5 py-3">Issue</th>
                                            <th className="px-5 py-3">Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-amber-50">
                                        {data.warnings.map((w, idx) => (
                                            <tr key={idx} className="hover:bg-amber-50/30">
                                                <td className="px-5 py-2.5 text-gray-400 font-mono text-xs">{w.row}</td>
                                                <td className="px-5 py-2.5">
                                                    <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md">{w.column}</span>
                                                </td>
                                                <td className="px-5 py-2.5 text-gray-700">{w.issue}</td>
                                                <td className="px-5 py-2.5">
                                                    <code className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded">{w.value}</code>
                                                </td>
                                            </tr>
                                        ))}
                                        {data.warnings.length === 0 && (
                                            <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">No warnings</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {/* ---- AUTO-FIXED TAB ---- */}
                            {activeTab === "autoFixed" && (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-blue-50/50 sticky top-0">
                                        <tr className="text-blue-700 font-medium">
                                            <th className="px-5 py-3 w-16">Row</th>
                                            <th className="px-5 py-3 w-24">Column</th>
                                            <th className="px-5 py-3">Issue</th>
                                            <th className="px-5 py-3">Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-blue-50">
                                        {data.autoFixed.map((f, idx) => (
                                            <tr key={idx} className="hover:bg-blue-50/30">
                                                <td className="px-5 py-2.5 text-gray-400 font-mono text-xs">{f.row}</td>
                                                <td className="px-5 py-2.5">
                                                    <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">{f.column}</span>
                                                </td>
                                                <td className="px-5 py-2.5 text-gray-700">{f.issue}</td>
                                                <td className="px-5 py-2.5">
                                                    <code className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">{f.value}</code>
                                                </td>
                                            </tr>
                                        ))}
                                        {data.autoFixed.length === 0 && (
                                            <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">No auto-fixes applied</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-100 p-5 shrink-0 flex items-center justify-between bg-gray-50/50">
                            <button
                                onClick={downloadCleaned}
                                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Download Cleaned File
                            </button>

                            <div className="flex items-center gap-3">
                                {!canProceed && unresolvedErrors.length > 0 && (
                                    <span className="text-xs text-red-600 font-medium">
                                        Fix {unresolvedErrors.length} error{unresolvedErrors.length !== 1 ? "s" : ""} to proceed
                                    </span>
                                )}
                                <button
                                    onClick={onClose}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
                                >
                                    Cancel Upload
                                </button>
                                <button
                                    onClick={handleProceed}
                                    disabled={!canProceed || importing}
                                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-sm shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {importing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <ArrowRight className="w-4 h-4" />
                                            Proceed with {activeValid.length} Valid Contact{activeValid.length !== 1 ? "s" : ""}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
