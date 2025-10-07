import { useProfile } from "../context/ProfileContext";
import { CreditBalance } from "../components/credit/CreditBalance";
import { CreatorAnalytics } from "../components/dashboard/CreatorAnalytics";
import { ParticipantAnalytics } from "../components/dashboard/ParticipantAnalytics";

export default function Dashboard() {
  const { loading: profileLoading } = useProfile();
  if (profileLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      {/* User Balance */}
      <CreditBalance showWithdraw />

      {/* Analytics Sections */}
      <div className="space-y-8">
        {/* Creator Analytics */}
        <CreatorAnalytics />

        {/* Participant Analytics */}
        <ParticipantAnalytics />
      </div>
    </div>
  );
}
