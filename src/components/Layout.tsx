import DashboardNavbar from "./navigation/DashboardNavbar";
import Sidebar, { useSidebarState } from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
  hideSidebar?: boolean;
}

export default function Layout({ children, hideSidebar = false }: LayoutProps) {
  const { isMinimized } = useSidebarState();

  return (
    <div className="min-h-screen bg-gray-50 overflow-hidden">
      {/* Navbar at the top */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <DashboardNavbar />
      </div>
      {/* Sidebar and main content, flex row */}
      <div className="flex flex-row pt-16 h-screen">
        {/* Sidebar overlays on mobile, static on desktop */}
        {!hideSidebar && <Sidebar />}
        {/* Main content: margin-left for sidebar width on md+; responsive width */}
        <main
          className={`flex-1 transition-all duration-300 ease-in-out w-full max-w-full ml-0 overflow-y-auto h-[calc(100vh-4rem)] ${
            hideSidebar ? "" : `md:${isMinimized ? "ml-16" : "ml-64"}`
          }`}
          style={{ minWidth: 0 }}
        >
          <div className="p-4 sm:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
