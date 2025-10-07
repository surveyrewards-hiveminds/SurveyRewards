import React from "react";
import { Users, PieChart, DollarSign, BarChart, Clock } from "lucide-react";
import { Text } from "../language/Text";

export default function HomeConcept() {
  return (
    <div className="py-16 bg-gray-50" id="concept">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            <Text tid="concept.title" />
          </h2>
        </div>
        <div className="mt-12">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-2xl font-bold text-[#020B2C] mb-4">
                <Text tid="concept.taker.title" />
              </h3>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <Users className="h-6 w-6 text-blue-500 mr-2" />
                  <span>
                    <Text tid="concept.taker.step1" />
                  </span>
                </li>
                <li className="flex items-center">
                  <PieChart className="h-6 w-6 text-blue-500 mr-2" />
                  <span>
                    <Text tid="concept.taker.step2" />
                  </span>
                </li>
                <li className="flex items-center">
                  <DollarSign className="h-6 w-6 text-blue-500 mr-2" />
                  <span>
                    <Text tid="concept.taker.step3" />
                  </span>
                </li>
              </ul>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-2xl font-bold text-[#020B2C] mb-4">
                <Text tid="concept.business.title" />
              </h3>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <BarChart className="h-6 w-6 text-blue-500 mr-2" />
                  <span>
                    <Text tid="concept.business.step1" />
                  </span>
                </li>
                <li className="flex items-center">
                  <Users className="h-6 w-6 text-blue-500 mr-2" />
                  <span>
                    <Text tid="concept.business.step2" />
                  </span>
                </li>
                <li className="flex items-center">
                  <Clock className="h-6 w-6 text-blue-500 mr-2" />
                  <span>
                    <Text tid="concept.business.step3" />
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
