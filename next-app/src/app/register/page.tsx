"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Mail, Lock, AlertCircle, CheckCircle2, ArrowRight, RefreshCw } from "lucide-react";

export default function RegisterPage() {
    const [step, setStep] = useState<"register" | "verify">("register");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSuccess("OTP sent to your email! Check your inbox.");
            setStep("verify");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) value = value[value.length - 1];
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        const newOtp = [...otp];
        for (let i = 0; i < pasted.length; i++) {
            newOtp[i] = pasted[i];
        }
        setOtp(newOtp);
        if (pasted.length === 6) otpRefs.current[5]?.focus();
    };

    const handleVerify = async () => {
        setError("");
        setSuccess("");
        const otpCode = otp.join("");
        if (otpCode.length !== 6) {
            setError("Please enter the full 6-digit code.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp: otpCode }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setSuccess("Email verified! Signing you in...");

            // Auto-login with the credentials they just registered with
            const signInResult = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (signInResult?.error) {
                // Fallback: redirect to login if auto-sign-in fails
                setSuccess("Email verified! Redirecting to login...");
                setTimeout(() => router.push("/login"), 1500);
            } else {
                router.push("/dashboard");
                router.refresh();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setError("");
        setSuccess("");
        setLoading(true);
        try {
            const res = await fetch("/api/auth/resend-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSuccess("New OTP sent! Check your inbox.");
            setOtp(["", "", "", "", "", ""]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 -ml-64 relative z-50">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <span className="text-white font-bold text-2xl">C</span>
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    {step === "register" ? "Create your account" : "Verify your email"}
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    {step === "register"
                        ? "Register with your email to get started"
                        : `Enter the 6-digit code sent to ${email}`}
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-gray-100">
                    {error && (
                        <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 text-sm">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-6 bg-green-50 text-green-700 p-4 rounded-xl flex items-center gap-3 text-sm">
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                            {success}
                        </div>
                    )}

                    {step === "register" ? (
                        <form className="space-y-5" onSubmit={handleRegister}>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email address</label>
                                <div className="mt-1 relative">
                                    <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                                        placeholder="you@example.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Password</label>
                                <div className="mt-1 relative">
                                    <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                                        placeholder="Min 6 characters"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                                <div className="mt-1 relative">
                                    <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                                        placeholder="Confirm your password"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-sm shadow-blue-500/30 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70"
                            >
                                {loading ? "Sending OTP..." : <>Register & Send OTP <ArrowRight className="w-4 h-4" /></>}
                            </button>

                            <p className="text-center text-sm text-gray-500 mt-4">
                                Already have an account?{" "}
                                <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium">Sign in</a>
                            </p>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            {/* OTP Input */}
                            <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={(el) => { otpRefs.current[i] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(i, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                        className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-gray-50 focus:bg-white"
                                    />
                                ))}
                            </div>

                            <button
                                onClick={handleVerify}
                                disabled={loading || otp.join("").length !== 6}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-sm shadow-blue-500/30 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70"
                            >
                                {loading ? "Verifying..." : <>Verify Email <CheckCircle2 className="w-4 h-4" /></>}
                            </button>

                            <div className="flex items-center justify-between text-sm">
                                <button
                                    onClick={handleResend}
                                    disabled={loading}
                                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 disabled:opacity-50"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" /> Resend OTP
                                </button>
                                <button
                                    onClick={() => { setStep("register"); setOtp(["", "", "", "", "", ""]); setError(""); setSuccess(""); }}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    ← Back
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
