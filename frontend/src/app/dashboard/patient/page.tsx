import { auth0 } from "@/lib/auth0";
import PatientDashboard from "@/components/patient-dashboard";

export default async function PatientPage() {
    const session = await auth0.getSession();

    // In a real app we'd redirect if not logged in, but middleware handles auth routes.
    if (!session) return <div>Please log in</div>;

    return <PatientDashboard user={session.user} />;
}
