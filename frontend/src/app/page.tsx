import { auth0 } from "@/lib/auth0";
import { createClient } from "@supabase/supabase-js";
import Onboarding from "@/components/onboarding";
import Link from "next/link";
import { ArrowRight, User, Heart, Brain } from "lucide-react";

// Initialize Supabase Client
// Note: In a real production app with RLS, we'd need to forward the Auth0 token 
// or use a Service Role key on the server to bypass RLS for this check.
// For this hackathon, we assume the Anon key has read access or we use a Service Role if available.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function Home(props: Props) {
  const searchParams = await props.searchParams;
  const role = searchParams.role as 'patient' | 'caregiver' | undefined;
  const session = await auth0.getSession();

  // 1. Not Logged In -> Show Landing Page
  if (!session) {
    return (
      <div className="min-h-screen bg-blue-50 flex flex-col font-sans">
        <header className="px-6 py-6 flex justify-between items-center max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2 font-bold text-2xl text-zinc-900 tracking-tight">
            <img src="/caregivelogo.png" alt="CareGlobe" className="w-9 h-9 rounded-lg shadow-sm" />
            CareGlobe
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto w-full">
          <div className="space-y-8 mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-blue-100 rounded-full text-blue-600 text-sm font-medium shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              New: AI-Powered Care Insights
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-zinc-900 tracking-tight leading-[1.1]">
              Connect the circle of <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Care & Trust</span>
            </h1>
            <p className="text-xl text-zinc-500 max-w-2xl mx-auto leading-relaxed">
              The secure platform for Parkinson's patients to share health updates with loved ones.
              <br />
              <span className="font-medium text-zinc-900">Patients invite. Caregivers connect.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <a
                href="/auth/login"
                className="inline-flex items-center justify-center px-8 py-4 bg-zinc-900 text-white font-bold text-lg rounded-2xl hover:bg-zinc-800 transition shadow-xl hover:shadow-2xl hover:-translate-y-1 transform duration-300 min-w-[200px]"
              >
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </a>
              <a
                href="https://devpost.com/software/careglobe"
                target="_blank"
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-zinc-700 font-bold text-lg rounded-2xl border-2 border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 transition min-w-[200px]"
              >
                Learn More
              </a>
            </div>
          </div>

          <div className="w-full max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200 p-8">
            <div className="relative rounded-3xl overflow-hidden border border-zinc-200 shadow-2xl bg-white/50 backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/50 via-indigo-50/50 to-emerald-50/50 opacity-50"></div>
              <div className="relative p-12 grid md:grid-cols-3 gap-8 text-left">
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center"><User className="w-6 h-6 text-blue-600" /></div>
                  <h3 className="text-xl font-bold text-zinc-900">For Patients</h3>
                  <p className="text-zinc-500">Track severity, manage medications, and share your status secure in one tap.</p>
                </div>
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center"><Heart className="w-6 h-6 text-emerald-600" /></div>
                  <h3 className="text-xl font-bold text-zinc-900">For Caregivers</h3>
                  <p className="text-zinc-500">Get real-time updates, manage appointments, and stay connected with your loved ones.</p>
                </div>
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center"><Brain className="w-6 h-6 text-indigo-600" /></div>
                  <h3 className="text-xl font-bold text-zinc-900">AI Insights</h3>
                  <p className="text-zinc-500">Powered by advanced AI to detect trends and suggest care adjustments automatically.</p>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="text-center py-8 text-zinc-400 text-sm">
          &copy; 2026 CareGlobe Inc. &bull; Secure Health Data
        </footer>
      </div>
    );
  }

  // 2. Logged In -> Check Supabase Profile
  // We use a try/catch block to handle cases where Supabase isn't configured yet.
  let userProfile = null;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('auth0_id', session.user.sub)
        .single();

      if (data) userProfile = data;
    } catch (e) {
      console.error("Supabase connection failed", e);
    }
  }

  // 3. User Exists -> Show Dashboard Choice (or auto-redirect)
  if (userProfile) {
    // In a real app with forced single-role, we would auto-redirect here:
    // if (userProfile.role === 'patient') redirect('/dashboard/patient');
    // if (userProfile.role === 'caregiver') redirect('/dashboard/caregiver');

    // For now, we show the dashboard selection but filtered by their role
    return (
      <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white/70 backdrop-blur-sm p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6 border border-white/50">
          <img
            src={session.user.picture}
            alt={session.user.name}
            className="w-20 h-20 rounded-full mx-auto border-4 border-white shadow-lg"
          />
          <h1 className="text-2xl font-bold text-zinc-900">Welcome back, {(session.user.name || 'User').split(' ')[0]}!</h1>
          <p className="text-zinc-500">You are registered as a <strong className="uppercase text-zinc-900">{userProfile.role}</strong>.</p>

          <div className="grid gap-4">
            {userProfile.role === 'patient' && (
              <Link
                href="/dashboard/patient"
                className="flex items-center justify-between px-6 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition group shadow-lg"
              >
                <span className="font-semibold">Go to Patient Dashboard</span>
                <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
              </Link>
            )}

            {userProfile.role === 'caregiver' && (
              <Link
                href="/dashboard/caregiver"
                className="flex items-center justify-between px-6 py-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition group shadow-lg"
              >
                <span className="font-semibold">Go to Caregiver Dashboard</span>
                <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
              </Link>
            )}
          </div>
          <a href="/auth/logout" className="text-sm text-zinc-400 hover:text-zinc-600 underline block mt-4">
            Log out of CareGlobe
          </a>
        </div>
      </div>
    );
  }

  // 4. User Does Not Exist (or Supabase not connected) -> Onboarding
  return <Onboarding user={session.user} initialRole={role} />;
}
