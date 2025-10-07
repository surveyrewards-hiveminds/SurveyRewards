import { Text } from "../../components/language/Text";
import PublicNavbar from "../../components/navigation/PublicNavbar";

export default function VerificationPending() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />
      <div className="max-w-xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">
            <Text tid="verificationPage.pendingTitle" />
          </h1>
          <p className="text-gray-700 text-lg mb-4">
            <Text tid="verificationPage.pendingMessage" />
          </p>
        </div>
      </div>
    </div>
  );
}
