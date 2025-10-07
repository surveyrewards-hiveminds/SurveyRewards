import React from "react";
import { scrollToSection } from "../../utils/scrollToSection";
import { useNavigate } from "react-router-dom";
import { Text } from "../language/Text";
import { DictionaryKey } from "../../i18n";

export const navigationItems = [
  { name: "Home", link: "/", anchor: "" },
  {
    name: "About",
    link: "/",
    anchor: "about",
  },
  {
    name: "Concept",
    link: "/",
    anchor: "concept",
  },
  {
    name: "Pricing",
    link: "/",
    anchor: "pricing",
  },
  { name: "Contact", link: "contact", anchor: "" },
];

interface NavigationItemsProps {
  className?: string;
  itemClassName?: string;
}

export function NavigationItems({
  className = "",
  itemClassName = "",
}: NavigationItemsProps) {
  const navigate = useNavigate();
  return (
    <div className={`hidden md:flex space-x-8 ${className}`}>
      {navigationItems.map((item) => (
        <button
          key={item.name}
          onClick={() => {
            if (item.link === "/" && item.anchor) {
              if (window.location.pathname !== "/") {
                // Navigate to home and pass anchor in state
                navigate("/", { state: { anchor: item.anchor } });
              } else {
                // Already on home, just scroll
                window.location.hash = item.anchor;
                const el = document.getElementById(item.anchor);
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }
            } else {
              // For other links, use navigate
              navigate(item.link);
            }
          }}
          className={`text-gray-700 hover:text-[#020B2C] px-3 py-2 text-sm font-medium ${itemClassName}`}
        >
          <Text tid={`navbar.${item.name.toLowerCase()}` as DictionaryKey} />
        </button>
      ))}
    </div>
  );
}
