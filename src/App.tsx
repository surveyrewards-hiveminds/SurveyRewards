import { SidebarProvider } from "./components/Sidebar";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./router";
import { ProfileProvider } from "./context/ProfileContext";
import { LanguageProvider } from "./context/LanguageContext";

export default function App() {
  return (
    <BrowserRouter>
      <SidebarProvider>
        <ProfileProvider>
          <LanguageProvider>
            <AppRoutes />
          </LanguageProvider>
        </ProfileProvider>
      </SidebarProvider>
    </BrowserRouter>
  );
}
