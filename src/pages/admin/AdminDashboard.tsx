import { useState } from "react";
import DashboardNavbar from "../../components/navigation/DashboardNavbar";
import { Text } from "../../components/language/Text";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import DashboardStats from "../../components/admin/DashboardStats";
import UserTable from "../../components/admin/UserTable";
import FeaturedCreatorsSettings from "../../components/admin/FeaturedCreatorsSettings";

export type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  country_of_residence: string | null;
  employment: string | null;
  business_category: string | null;
  company_name: string | null;
  phone_country: string | null;
  phone_number: string | null;
  profile_image: string | null;
  birth_date: string | null;
  country_of_birth: string | null;
};

export type Survey = {
  id: string;
  name: string;
  description: string | null;
};

type SidebarItem = "dashboard" | "users" | "settings";

export default function AdminDashboard() {
  const [selectedSidebar, setSelectedSidebar] = useState<SidebarItem>("dashboard");
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row min-h-screen font-sans bg-gray-50">
      {/* Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <DashboardNavbar />
      </div>

      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-gray-100 shadow-md pt-24 px-6 justify-between">
        <div>
          <h2 className="text-lg font-bold mb-8 text-gray-800">
            <Text tid="admin.users.admin_dashboard" />
          </h2>
          <nav>
            <ul className="space-y-2">
              <li>
                <button
                  className={`w-full text-left px-4 py-2 rounded-lg font-semibold ${selectedSidebar === "dashboard"
                    ? "bg-indigo-100 text-indigo-700"
                    : "hover:bg-gray-200 text-gray-700"
                    }`}
                  onClick={() => setSelectedSidebar("dashboard")}
                >
                  <Text tid="admin.dashboard.menu" />
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left px-4 py-2 rounded-lg font-semibold ${selectedSidebar === "users"
                    ? "bg-indigo-100 text-indigo-700"
                    : "hover:bg-gray-200 text-gray-700"
                    }`}
                  onClick={() => setSelectedSidebar("users")}
                >
                  <Text tid="admin.users.user" />
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left px-4 py-2 rounded-lg font-semibold ${selectedSidebar === "settings"
                    ? "bg-indigo-100 text-indigo-700"
                    : "hover:bg-gray-200 text-gray-700"
                    }`}
                  onClick={() => setSelectedSidebar("settings")}
                >
                  <Text tid="admin.settings.menu" />
                </button>
              </li>
            </ul>
          </nav>
        </div>
        <div className="mb-8">
          <button
            className="w-full px-4 py-2 rounded-lg font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/login", { replace: true });
            }}
          >
            <Text tid="sidebar.logout" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 mt-20 md:mt-0 p-4 sm:p-6 md:p-8 overflow-x-auto bg-white rounded-t-xl md:rounded-none shadow-sm">
        {selectedSidebar === "dashboard" && <DashboardStats />}
        {selectedSidebar === "users" && <UserTable />}
        {selectedSidebar === "settings" && <FeaturedCreatorsSettings />}
      </main>
    </div>
  );
}
