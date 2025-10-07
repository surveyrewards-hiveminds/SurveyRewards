import React from "react";
import { Globe2, Shield, Award } from "lucide-react";
import { Text } from "../language/Text";

export default function HomeAbout() {
  return (
    <div className="py-16 bg-white" id="about">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            <Text tid="about.title" />
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            <Text tid="about.subtitle" />
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="text-[#020B2C]">
              <Globe2 className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-xl font-semibold">
              <Text tid="about.globalReach" />
            </h3>
            <p className="mt-2 text-gray-600">
              <Text tid="about.globalReachDesc" />
            </p>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="text-[#020B2C]">
              <Shield className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-xl font-semibold">
              <Text tid="about.securePlatform" />
            </h3>
            <p className="mt-2 text-gray-600">
              <Text tid="about.securePlatformDesc" />
            </p>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="text-[#020B2C]">
              <Award className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-xl font-semibold">
              <Text tid="about.qualityResults" />
            </h3>
            <p className="mt-2 text-gray-600">
              <Text tid="about.qualityResultsDesc" />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
