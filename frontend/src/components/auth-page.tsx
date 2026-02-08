"use client";

import { useState } from "react";
import { Mail, Lock, User, ArrowRight } from "lucide-react";

// CareLink Logo Component
function CareLinkLogo({ size = "normal" }: { size?: "normal" | "small" }) {
    const imgSize = size === "small" ? "w-8 h-8" : "w-14 h-14";
    const textSize = size === "small" ? "text-xl" : "text-2xl";

    return (
        <div className="flex flex-col items-center gap-2">
            <img src="/carelinkLogo.jpeg" alt="CareLink" className={`${imgSize} rounded-lg`} />
            <span className={`${textSize} font-bold italic text-teal-600`}>CareLink</span>
        </div>
    );
}


export default function AuthPage({ onLogin }: { onLogin?: () => void }) {
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // For now, redirect to Auth0 login
        window.location.href = "/auth/login";
    };

    const handleGoogleLogin = () => {
        window.location.href = "/auth/login";
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
                    {/* Logo */}
                    <div className="mb-8">
                        <CareLinkLogo />
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex rounded-xl border border-gray-200 p-1 mb-6">
                        <button
                            onClick={() => setMode("login")}
                            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition ${mode === "login"
                                ? "bg-white text-teal-600 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => setMode("signup")}
                            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition ${mode === "signup"
                                ? "bg-white text-teal-600 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === "signup" && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="John Doe"
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                                />
                            </div>
                        </div>

                        {mode === "login" && (
                            <div className="flex items-center justify-between text-sm">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                    />
                                    <span className="text-gray-600">Remember me</span>
                                </label>
                                <a href="#" className="text-teal-600 hover:text-teal-700 font-medium">
                                    Forgot password?
                                </a>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition shadow-lg shadow-teal-200 disabled:opacity-50"
                        >
                            {isLoading ? "Loading..." : mode === "login" ? "Login" : "Create Account"}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-gray-200"></div>
                        <span className="text-sm text-gray-400">OR</span>
                        <div className="flex-1 h-px bg-gray-200"></div>
                    </div>

                    {/* Google Login */}
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition flex items-center justify-center gap-3"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                    </button>

                    {/* Terms */}
                    <p className="text-xs text-gray-400 text-center mt-6">
                        By continuing, you agree to CareLink's{" "}
                        <a href="#" className="text-teal-600 hover:underline">Terms of Service</a> and{" "}
                        <a href="#" className="text-teal-600 hover:underline">Privacy Policy</a>
                    </p>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-6 px-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CareLinkLogo size="small" />
                </div>
                <span className="text-sm text-gray-400">©2026 CareLink</span>
            </footer>
        </div>
    );
}
