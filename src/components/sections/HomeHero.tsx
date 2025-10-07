import React from "react";
import { useNavigate } from "react-router-dom";
import { Text } from "../language/Text";

export default function HomeHero() {
  const navigate = useNavigate();
  return (
    <div className="relative bg-[#020B2C]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl">
            <span className="block">
              <Text tid="hero.title1" />
            </span>
            <span className="block text-blue-400">
              <Text tid="hero.title2" />
            </span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-300 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            <Text tid="hero.subtitle" />
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <div className="rounded-md shadow">
              <button
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-[#020B2C] bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                onClick={() => navigate("/answer")}
              >
                <Text tid="hero.earnMoney" />
              </button>
            </div>
            <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
              <button
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 md:py-4 md:text-lg md:px-10"
                onClick={() => navigate("/register")}
              >
                <Text tid="hero.createSurvey" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
