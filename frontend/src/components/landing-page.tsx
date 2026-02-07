"use client";

import { FileText, Users, Shield, Calendar, RefreshCw, Phone, User, Heart } from "lucide-react";

export default function LandingPage() {
    const handleGetStarted = () => {
        window.location.href = "/auth/login";
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-100">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/carelinkLogo.jpeg" alt="CareLink" className="w-10 h-10 rounded-lg" />
                        <span className="text-xl font-bold italic text-teal-700">CareLink</span>
                    </div>
                    <a
                        href="/auth/login"
                        className="text-gray-600 hover:text-teal-700 font-medium transition"
                    >
                        Sign In
                    </a>
                </div>
            </header>

            {/* Hero Section */}
            <section className="py-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                        Connect Patients
                    </h1>
                    <h2 className="text-4xl md:text-5xl font-bold text-teal-600 mb-6">
                        with Caregivers
                    </h2>
                    <p className="text-gray-500 text-lg max-w-2xl mx-auto mb-10">
                        Secure healthcare coordination platform with real-time data sync,
                        medication tracking, and comprehensive patient management.
                    </p>
                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={handleGetStarted}
                            className="px-6 py-3 bg-teal-600 text-white font-semibold rounded-full hover:bg-teal-700 transition shadow-lg shadow-teal-200"
                        >
                            Get Started Free
                        </button>
                        <a
                            href="#features"
                            className="px-6 py-3 bg-white text-gray-700 font-medium rounded-full border border-gray-200 hover:bg-gray-50 transition"
                        >
                            Learn More
                        </a>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-16 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Everything You Need</h3>
                        <p className="text-gray-500">Comprehensive tools for patient and caregiver coordination</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Health Records */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition">
                            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mb-4">
                                <FileText className="w-6 h-6 text-teal-600" />
                            </div>
                            <h4 className="font-bold text-gray-900 mb-2">Health Records</h4>
                            <p className="text-gray-500 text-sm">
                                Centralized medical history, medications, and treatment plans
                            </p>
                        </div>

                        {/* Caregiver Portal */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition">
                            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mb-4">
                                <Users className="w-6 h-6 text-teal-600" />
                            </div>
                            <h4 className="font-bold text-gray-900 mb-2">Caregiver Portal</h4>
                            <p className="text-gray-500 text-sm">
                                Monitor vitals, log symptoms, and coordinate patient care
                            </p>
                        </div>

                        {/* Secure Access */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition">
                            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mb-4">
                                <Shield className="w-6 h-6 text-teal-600" />
                            </div>
                            <h4 className="font-bold text-gray-900 mb-2">Secure Access</h4>
                            <p className="text-gray-500 text-sm">
                                Two-way verification protects sensitive patient information
                            </p>
                        </div>

                        {/* Appointments */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition">
                            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mb-4">
                                <Calendar className="w-6 h-6 text-teal-600" />
                            </div>
                            <h4 className="font-bold text-gray-900 mb-2">Appointments</h4>
                            <p className="text-gray-500 text-sm">
                                Schedule and track medical appointments and consultations
                            </p>
                        </div>

                        {/* Real-time Sync */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition">
                            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mb-4">
                                <RefreshCw className="w-6 h-6 text-teal-600" />
                            </div>
                            <h4 className="font-bold text-gray-900 mb-2">Real-time Sync</h4>
                            <p className="text-gray-500 text-sm">
                                Instant updates across all connected devices and users
                            </p>
                        </div>

                        {/* Emergency Info */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition">
                            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mb-4">
                                <Phone className="w-6 h-6 text-teal-600" />
                            </div>
                            <h4 className="font-bold text-gray-900 mb-2">Emergency Info</h4>
                            <p className="text-gray-500 text-sm">
                                Quick access to critical medical data and emergency contacts
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Process Section */}
            <section className="py-16 px-6 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Simple Process</h3>
                        <p className="text-gray-500">Get started in minutes</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {/* For Patients */}
                        <div className="bg-slate-50 rounded-2xl p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                                    <User className="w-5 h-5 text-teal-600" />
                                </div>
                                <h4 className="font-bold text-gray-900">For Patients</h4>
                            </div>

                            <div className="space-y-5">
                                <div className="flex gap-4">
                                    <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">1</div>
                                    <div>
                                        <p className="font-semibold text-gray-900">Create Account</p>
                                        <p className="text-gray-500 text-sm">Sign up and complete your health profile</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">2</div>
                                    <div>
                                        <p className="font-semibold text-gray-900">Add Health Data</p>
                                        <p className="text-gray-500 text-sm">Enter medications, doctors, and emergency contacts</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">3</div>
                                    <div>
                                        <p className="font-semibold text-gray-900">Connect Caregivers</p>
                                        <p className="text-gray-500 text-sm">Share your unique code with trusted caregivers</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* For Caregivers */}
                        <div className="bg-slate-50 rounded-2xl p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                                    <Heart className="w-5 h-5 text-teal-600" />
                                </div>
                                <h4 className="font-bold text-gray-900">For Caregivers</h4>
                            </div>

                            <div className="space-y-5">
                                <div className="flex gap-4">
                                    <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">1</div>
                                    <div>
                                        <p className="font-semibold text-gray-900">Register as Caregiver</p>
                                        <p className="text-gray-500 text-sm">Get your unique caregiver code</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">2</div>
                                    <div>
                                        <p className="font-semibold text-gray-900">Request Access</p>
                                        <p className="text-gray-500 text-sm">Enter patient code to request access</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">3</div>
                                    <div>
                                        <p className="font-semibold text-gray-900">Start Caring</p>
                                        <p className="text-gray-500 text-sm">Monitor health data and coordinate care</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-teal-600 rounded-3xl p-12 text-center">
                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                            Ready to Get Started?
                        </h3>
                        <p className="text-teal-100 mb-8 max-w-xl mx-auto">
                            Join thousands of patients and caregivers using CareLink for better healthcare coordination
                        </p>
                        <button
                            onClick={handleGetStarted}
                            className="px-8 py-3 bg-white text-teal-700 font-semibold rounded-full hover:bg-teal-50 transition shadow-lg"
                        >
                            Create Your Account
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-6 border-t border-gray-100">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/carelinkLogo.jpeg" alt="CareLink" className="w-8 h-8 rounded-lg" />
                        <span className="text-lg font-bold italic text-teal-700">CareLink</span>
                    </div>
                    <span className="text-sm text-gray-400">©2026 CareLink</span>
                </div>
            </footer>
        </div>
    );
}
