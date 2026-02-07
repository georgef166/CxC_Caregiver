import { auth0 } from "@/lib/auth0";
import { createClient } from "@supabase/supabase-js";
import Onboarding from "@/components/onboarding";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50/50 flex flex-col font-sans">
        <header className="px-6 py-6 flex justify-between items-center max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2 font-bold text-2xl text-zinc-900 tracking-tight">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm scheme-dark">CG</div>
            CareGlobe
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto w-full">
          <div className="space-y-6 mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-blue-100 rounded-full text-blue-600 text-sm font-medium shadow-sm mb-4">
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
          </div>

          <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
            {/* Patient Card */}
            <div className="group relative bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all border border-zinc-100 hover:border-blue-100 text-left overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:rotate-6 transition-transform">
                  🤒
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 mb-2">I am a Patient</h2>
                <p className="text-zinc-500 mb-8 min-h-[48px]">
                  Track symptoms, medications, and generate invite codes for your family.
                </p>
                <a
                  href={`/auth/login?returnTo=${encodeURIComponent("/?role=patient")}`}
                  className="inline-flex w-full items-center justify-center px-6 py-4 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition shadow-lg group-hover:shadow-blue-500/20"
                >
                  Login as Patient
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </div>
            </div>

            {/* Caregiver Card */}
            <div className="group relative bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all border border-zinc-100 hover:border-emerald-100 text-left overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:rotate-6 transition-transform">
                  ❤️
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 mb-2">I am a Caregiver</h2>
                <p className="text-zinc-500 mb-8 min-h-[48px]">
                  Support your loved one. Enter an invite link to view their updates.
                </p>
                <a
                  href={`/auth/login?returnTo=${encodeURIComponent("/?role=caregiver")}`}
                  className="inline-flex w-full items-center justify-center px-6 py-4 bg-white border-2 border-zinc-200 text-zinc-900 font-semibold rounded-xl hover:border-emerald-500 hover:text-emerald-700 transition"
                >
                  Login as Caregiver
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
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
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6 border border-zinc-100">
          <img
            src={session.user.picture}
            alt={session.user.name}
            className="w-20 h-20 rounded-full mx-auto border-4 border-blue-50"
          />
          <h1 className="text-2xl font-bold text-zinc-900">Welcome back, {(session.user.name || 'User').split(' ')[0]}!</h1>
          <p className="text-zinc-500">You are registered as a <strong className="uppercase text-zinc-900">{userProfile.role}</strong>.</p>

          <div className="grid gap-4">
            {userProfile.role === 'patient' && (
              <Link
                href="/dashboard/patient"
                className="flex items-center justify-between px-6 py-4 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition group"
              >
                <span className="font-semibold">Go to Patient Dashboard</span>
                <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
              </Link>
            )}

            {userProfile.role === 'caregiver' && (
              <Link
                href="/dashboard/caregiver"
                className="flex items-center justify-between px-6 py-4 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition group"
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
