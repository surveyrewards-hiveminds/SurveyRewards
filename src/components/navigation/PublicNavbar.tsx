import { useState, useEffect } from "react";
import LanguageSelector from "../LanguageSelector";
import { useScrollDirection } from "../../hooks/useScrollDirection";
import { NavigationItems, navigationItems } from "./NavigationItems";
import { useNavigate } from "react-router-dom";
import { Text } from "../language/Text";

export default function PublicNavbar() {
  const navigate = useNavigate();
  const isVisible = useScrollDirection();
  // const [showLoginModal, setShowLoginModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigation = (item: any) => {
    setIsMobileMenuOpen(false);
    if (item.link === "/" && item.anchor) {
      if (window.location.pathname !== "/") {
        navigate("/", { state: { anchor: item.anchor } });
      } else {
        window.location.hash = item.anchor;
        const el = document.getElementById(item.anchor);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }
    } else if (item.link && item.link !== "/") {
      navigate(`/${item.link}`);
    } else {
      navigate("/");
    }
  };

  // Close mobile menu when screen size changes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <nav
        className={`
        fixed top-0 left-0 right-0 z-50 bg-white shadow-sm
        transition-transform duration-300
        ${isVisible ? "translate-y-0" : "-translate-y-full"}
      `}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Brand */}
            <div className="flex items-center">
              <div
                onClick={() => navigate("/")}
                className="text-xl font-bold text-[#020B2C] mr-4 md:mr-8 cursor-pointer"
              >
                SurveyRewards
              </div>
              <NavigationItems />
            </div>

            {/* Right side - Desktop */}
            <div className="hidden md:flex items-center space-x-4">
              <LanguageSelector />
              <div className="flex space-x-3">
                <button
                  onClick={() => navigate("/login")}
                  className="text-gray-700 hover:text-[#020B2C] px-3 py-2 text-sm font-medium"
                >
                  <Text tid="navbar.login" />
                </button>
                <button
                  onClick={() => navigate("/register")}
                  className="bg-[#020B2C] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#020B2C]/90"
                >
                  <Text tid="navbar.register" />
                </button>
              </div>
            </div>

            {/* Right side - Mobile */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-gray-700 hover:text-[#020B2C] hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#020B2C]"
                aria-label="Toggle mobile menu"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {isMobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Sidebar */}
      <div
        className={`
        md:hidden fixed top-0 right-0 h-full w-80 max-w-[85vw] z-50 bg-white shadow-xl
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"}
      `}
      >
        <div className="p-6 h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="text-lg font-bold text-[#020B2C]">Menu</div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-md text-gray-700 hover:text-[#020B2C] hover:bg-gray-100"
              aria-label="Close menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Navigation Items */}
          <div className="space-y-4 mb-8">
            {navigationItems.map((item) => (
              <button
                key={item.name}
                onClick={() => handleNavigation(item)}
                className="block w-full text-left px-4 py-3 text-gray-700 hover:text-[#020B2C] hover:bg-gray-50 rounded-lg text-lg"
              >
                <Text tid={`navbar.${item.name.toLowerCase()}` as any} />
              </button>
            ))}
          </div>

          {/* Language Selector */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 text-sm font-medium text-gray-500 mb-3">
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
            <LanguageSelector />
          </div>

          {/* Auth Buttons */}
          <div className="mt-auto space-y-4">
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                navigate("/login");
              }}
              className="block w-full text-center px-4 py-3 text-gray-700 hover:text-[#020B2C] hover:bg-gray-50 rounded-lg border border-gray-300"
            >
              <Text tid="navbar.login" />
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                navigate("/register");
              }}
              className="block w-full bg-[#020B2C] text-white px-4 py-3 rounded-lg text-lg font-medium hover:bg-[#020B2C]/90"
            >
              <Text tid="navbar.register" />
            </button>
          </div>
        </div>
      </div>

      {/* LoginModal moved to /login page */}
    </>
  );
}
