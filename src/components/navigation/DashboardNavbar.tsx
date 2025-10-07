// import React from "react";
import { Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../../context/ProfileContext";
import { useSidebarState } from "../Sidebar";
import LanguageSelector from "../LanguageSelector";
import { NotificationDropdown } from "../notifications/NotificationDropdown";

export default function DashboardNavbar() {
  const navigate = useNavigate();
  const { profileUrl, profileName, loading } = useProfile();
  const { setIsMobileOpen } = useSidebarState();

  return (
    <div className="bg-white shadow-sm">
      <div
        className={`mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-300 ease-in-out`}
      >
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            {/* Hamburger for mobile */}
            <button
              className="mr-2 md:hidden p-2 rounded hover:bg-gray-100"
              onClick={() => setIsMobileOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="h-6 w-6 text-[#020B2C]" />
            </button>
            {/* App Title: only show on md+ */}
            <div className="font-bold text-xl text-[#020B2C] hidden md:block">
              SurveyRewards
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Language Selector - only show on tablet and desktop */}
            <div className="hidden md:block">
              <LanguageSelector theme="light" />
            </div>
            <NotificationDropdown />
            <button
              onClick={() => navigate("/profile")}
              className="h-8 w-8 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading ? (
                <div className="h-full w-full bg-gray-300 animate-pulse rounded-full" />
              ) : (
                <img
                  key={profileUrl || profileName}
                  src={
                    profileUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      profileName || "User"
                    )}&background=eee&color=888&v=${encodeURIComponent(
                      profileName || "User"
                    )}`
                  }
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
