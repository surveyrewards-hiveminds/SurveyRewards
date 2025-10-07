import React from "react";
import { Facebook, Twitter, Instagram, Linkedin, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Text } from "../components/language/Text";
import { getTranslation } from "../i18n";
import { useLanguage } from "../context/LanguageContext";

export default function Footer() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const currentYear = new Date().getFullYear();

  const scrollToSection = (sectionId: string) => {
    // Check if we're on the home page
    if (window.location.pathname === "/") {
      // We're on home page, just scroll to section
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    } else {
      // Navigate to home page first, then scroll to section
      navigate("/", { replace: true });
      // Use setTimeout to ensure page loads before scrolling
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 100);
    }
  };

  return (
    <footer className="bg-[#020B2C] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold">
              <Text tid="footer.brand" />
            </h3>
            <p className="text-gray-300 text-sm">
              <Text tid="footer.tagline" />
            </p>
            <div className="flex space-x-4">
              <Facebook className="h-5 w-5 cursor-pointer hover:text-blue-400" />
              <Twitter className="h-5 w-5 cursor-pointer hover:text-blue-400" />
              <Instagram className="h-5 w-5 cursor-pointer hover:text-blue-400" />
              <Linkedin className="h-5 w-5 cursor-pointer hover:text-blue-400" />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4">
              <Text tid="footer.quickLinks" />
            </h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => scrollToSection("about")}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  <Text tid="footer.aboutUs" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection("concept")}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  <Text tid="footer.howItWorks" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection("pricing")}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  <Text tid="footer.pricing" />
                </button>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-bold mb-4">
              <Text tid="footer.support" />
            </h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => navigate("contact")}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  <Text tid="footer.contactUs" />
                </button>
              </li>
              <li>
                <a
                  href="#faq"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  <Text tid="footer.faq" />
                </a>
              </li>
              <li>
                <button
                  onClick={() => navigate("/terms")}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  <Text tid="footer.privacyPolicy" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate("/terms")}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  <Text tid="footer.termsOfService" />
                </button>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-lg font-bold mb-4">
              <Text tid="footer.newsletter" />
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              <Text tid="footer.newsletterDesc" />
            </p>
            <div className="flex">
              <input
                type="email"
                placeholder={getTranslation("footer.input.email", language)}
                className="px-4 py-2 rounded-l-md w-full text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Email"
              />
              <button className="bg-blue-500 px-4 py-2 rounded-r-md hover:bg-blue-600 flex items-center">
                <Mail className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-12 pt-8 text-center text-gray-300 text-sm">
          <p>
            © {currentYear} <Text tid="footer.brand" />.{" "}
            <Text tid="footer.copyright" />
          </p>
        </div>
      </div>
    </footer>
  );
}
