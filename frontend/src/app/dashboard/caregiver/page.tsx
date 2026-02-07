import { auth0 } from "@/lib/auth0";
import CaregiverDashboard from "@/components/caregiver-dashboard";

export default async function CaregiverPage() {
    const session = await auth0.getSession();

    // In a real app we'd redirect if not logged in, but middleware handles auth routes.
    if (!session) return <div>Please log in</div>;

    return <CaregiverDashboard user={session.user} />;
}
