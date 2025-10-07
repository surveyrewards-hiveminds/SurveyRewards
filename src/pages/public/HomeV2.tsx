import PublicNavbar from "../../components/navigation/PublicNavbar";
import Footer from "../../components/Footer";
import HeroV2 from "../../components/sections/v2/HeroV2";
import AboutV2 from "../../components/sections/v2/AboutV2";
import ConceptV2 from "../../components/sections/v2/ConceptV2";
import PricingV2 from "../../components/sections/v2/PricingV2";
import StatsV2 from "../../components/sections/v2/StatsV2";
import TestimonialsV2 from "../../components/sections/v2/TestimonialsV2";
import CTAV2 from "../../components/sections/v2/CTAV2";

export default function HomeV2() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <PublicNavbar />
      <main className="flex-grow pt-16 overflow-hidden">
        <HeroV2 />
        <AboutV2 />
        <ConceptV2 />
        <StatsV2 />
        <TestimonialsV2 />
        <PricingV2 />
        <CTAV2 />
      </main>
      <Footer />
    </div>
  );
}
