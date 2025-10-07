import React from "react";
import { Text } from "../language/Text";

export default function HomeStats() {
  return (
    <div className="bg-[#020B2C] py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-white">100K+</div>
            <div className="mt-2 text-blue-400">
              <Text tid="homeStats.activeUsers" />
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-white">1M+</div>
            <div className="mt-2 text-blue-400">
              <Text tid="homeStats.surveysCompleted" />
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-white">50+</div>
            <div className="mt-2 text-blue-400">
              <Text tid="homeStats.countries" />
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-white">$2M+</div>
            <div className="mt-2 text-blue-400">
              <Text tid="homeStats.rewardsPaid" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
