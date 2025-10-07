import React from "react";
import PublicNavbar from "../../components/navigation/PublicNavbar";
import Footer from "../../components/Footer";
import {
  HomeHero,
  HomeAbout,
  HomeConcept,
  HomePricing,
  HomeStats,
} from "../../components/sections";
export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />
      <main className="flex-grow pt-16">
        <HomeHero />
        <HomeAbout />
        <HomeConcept />
        <HomePricing />
        <HomeStats />
      </main>
      <Footer />
    </div>
  );
}
