import React, { useState, createContext, useContext } from "react";
import {
  ClipboardList,
  PenSquare,
  History,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { Text } from "./language/Text";
import LanguageSelector from "./LanguageSelector";

const navigation = [
  {
    name: "sidebar.dashboard",
    icon: LayoutDashboard,
    link: "/dashboard",
  },
  {
    name: "sidebar.answerSurvey",
    icon: ClipboardList,
    link: "/answer",
  },
  {
    name: "sidebar.createSurvey",
    icon: PenSquare,
    link: "/my-surveys",
  },
  { name: "sidebar.history", icon: History, link: "/history" },
  { name: "sidebar.myProfile", icon: User, link: "/profile" },
];

// Create context for sidebar state

const SidebarContext = createContext<{
  isMinimized: boolean;
  setIsMinimized: (value: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (value: boolean) => void;
}>({
  isMinimized: false,
  setIsMinimized: () => {},
  isMobileOpen: false,
  setIsMobileOpen: () => {},
});

// Custom hook to access sidebar state
export const useSidebarState = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebarState must be used within a SidebarProvider");
  }
  return context;
};

// Sidebar Provider component
export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  return (
    <SidebarContext.Provider
      value={{ isMinimized, setIsMinimized, isMobileOpen, setIsMobileOpen }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export default function Sidebar() {
  const navigate = useNavigate();
  const { isMinimized, setIsMinimized, isMobileOpen, setIsMobileOpen } =
    useSidebarState();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/"); // Redirect to login page after logout
  };

  // Sidebar content
  // Desktop sidebar content (minimizable)
  const desktopSidebarContent = (
    <>
      {/* App Title at the top of sidebar, only visible on mobile */}
      <div
        className={`px-4 py-5 border-b border-white/10 flex items-center justify-${
          isMinimized ? "center" : "start"
        } md:hidden`}
      >
        <span className="font-bold text-xl text-white transition-all duration-300">
          SurveyRewards
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          {navigation.map((item) => (
            <button
              key={item.name}
              onClick={() => {
                navigate(item.link);
                setIsMobileOpen(false);
              }}
              className={`
                flex items-center w-full p-3 rounded hover:bg-white/10 transition-colors
                ${isMinimized ? "justify-center" : ""}
              `}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!isMinimized && (
                <span className="ml-3">
                  <Text tid={item.name as any} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Language Selector Section - Desktop: Hide, only show on mobile sidebar */}
      <div className="p-4 border-t border-white/10 md:hidden">
        {!isMinimized ? (
          <div className="mb-3">
            <div className="flex items-center space-x-2 text-sm font-medium text-white/70 mb-2">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 0 1 6.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                />
              </svg>
              <span>Language</span>
            </div>
            <LanguageSelector theme="dark" fullWidth={true} />
          </div>
        ) : (
          <div className="flex justify-center mb-3">
            <LanguageSelector theme="dark" />
          </div>
        )}
      </div>

      {/* Chevron button: absolutely positioned, vertically centered, right edge of sidebar */}
      <button
        onClick={() => setIsMinimized(!isMinimized)}
        className="hidden md:block absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 bg-[#020B2C] p-1 rounded-full hover:bg-[#151f3f] transition-colors"
        style={{ zIndex: 10 }}
      >
        {isMinimized ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      {/* Logout button at the very bottom */}
      <div className="p-4 border-t border-white/10 mt-0">
        <button
          className={`flex items-center w-full p-3 rounded hover:bg-white/10 transition-colors ${
            isMinimized ? "justify-center" : ""
          }`}
          onClick={() => navigate("/")}
        >
          <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
          {!isMinimized && (
            <span className="ml-3">
              <Text tid="sidebar.backToHome" />
            </span>
          )}
        </button>
      </div>

      <div className="p-4 border-t border-white/10 mt-auto">
        <button
          className={`
            flex items-center w-full p-3 rounded hover:bg-white/10 transition-colors
            ${isMinimized ? "justify-center" : ""}`}
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!isMinimized && (
            <span className="ml-3">
              <Text tid="sidebar.logout" />
            </span>
          )}
        </button>
      </div>
    </>
  );

  // Mobile sidebar content (always expanded, left-aligned)
  const mobileSidebarContent = (
    <>
      <div className="px-4 py-5 border-b border-white/10 flex items-center justify-start">
        <span className="font-bold text-xl text-white transition-all duration-300">
          SurveyRewards
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          {navigation.map((item) => (
            <button
              key={item.name}
              onClick={() => {
                navigate(item.link);
                setIsMobileOpen(false);
              }}
              className="flex items-center w-full p-3 rounded hover:bg-white/10 transition-colors justify-start"
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="ml-3">
                <Text tid={item.name as any} />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Language Selector Section */}
      <div className="p-4 border-t border-white/10">
        <div className="mb-3">
          <div className="flex items-center space-x-2 text-sm font-medium text-white/70 mb-2">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 0 1 6.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
              />
            </svg>
            <span>Language</span>
          </div>
          <LanguageSelector theme="dark" fullWidth={true} />
        </div>
      </div>

      <div className="p-4 border-t border-white/10 mt-0">
        <button
          className="flex items-center w-full p-3 rounded hover:bg-white/10 transition-colors justify-start"
          onClick={() => navigate("/")}
        >
          <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
          <span className="ml-3">
            <Text tid="sidebar.backToHome" />
          </span>
        </button>
      </div>

      <div className="p-4 border-t border-white/10 mt-auto">
        <button
          className="flex items-center w-full p-3 rounded hover:bg-white/10 transition-colors justify-start"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span className="ml-3">
            <Text tid="sidebar.logout" />
          </span>
        </button>
      </div>
    </>
  );

  // Desktop sidebar
  const desktopSidebar = (
    <div
      className={`
        relative h-[calc(100vh-4rem)] bg-[#020B2C] text-white
        transition-all duration-300 ease-in-out flex flex-col
        ${isMinimized ? "w-16" : "w-64"}
        hidden md:flex
      `}
    >
      {desktopSidebarContent}
    </div>
  );

  // Mobile sidebar overlay
  const mobileSidebar = (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-40 transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          {/* Sidebar */}
          <div className="relative w-64 bg-[#020B2C] text-white h-full flex flex-col shadow-xl">
            <button
              className="absolute top-4 right-4 text-white"
              onClick={() => setIsMobileOpen(false)}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            {mobileSidebarContent}
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {desktopSidebar}
      {mobileSidebar}
    </>
  );
}
