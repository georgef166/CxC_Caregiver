import { auth0 } from "@/lib/auth0";
import { createClient } from "@supabase/supabase-js";
import Onboarding from "@/components/onboarding";
import LandingPage from "@/components/landing-page";
import Link from "next/link";
import { redirect } from "next/navigation";

// Initialize Supabase Client
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
    return <LandingPage />;
  }


  // 2. Logged In -> Check Supabase Profile
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

  // 3. User Exists -> Auto-redirect to their dashboard
  if (userProfile) {
    if (userProfile.role === 'patient') {
      redirect('/dashboard/patient');
    }
    if (userProfile.role === 'caregiver') {
      redirect('/dashboard/caregiver');
    }
  }

  // 4. User Does Not Exist -> Onboarding
  return <Onboarding user={session.user} initialRole={role} />;
}
