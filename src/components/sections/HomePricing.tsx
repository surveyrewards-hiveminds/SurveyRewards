import React from "react";
import {
  DollarSign,
  Gift,
  Sparkles,
  Wallet,
  CreditCard,
  Trophy,
  Coins,
} from "lucide-react";
import { Text } from "../language/Text";

export default function HomePricing() {
  return (
    <div className="py-16 bg-white" id="pricing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            <Text tid="pricing.title" />
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            <Text tid="pricing.subtitle" />
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Per-Response Reward */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-100 text-blue-600 mb-4">
              <DollarSign className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900">
              <Text tid="pricing.perResponse.title" />
            </h3>
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <h4 className="text-lg font-medium text-gray-900">
                    <Text tid="pricing.perResponse.creatorTitle" />
                  </h4>
                </div>
                <p className="mt-2 text-gray-500">
                  <Text tid="pricing.perResponse.creatorDesc" />
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-gray-400" />
                  <h4 className="text-lg font-medium text-gray-900">
                    <Text tid="pricing.perResponse.respondentTitle" />
                  </h4>
                </div>
                <p className="mt-2 text-gray-500">
                  <Text tid="pricing.perResponse.respondentDesc" />
                </p>
              </div>
            </div>
          </div>

          {/* Lottery-Based Prize */}
          <div className="bg-white border-2 border-[#020B2C] rounded-lg shadow-sm p-8 relative">
            <div className="absolute top-0 right-0 bg-[#020B2C] text-white px-3 py-1 text-sm rounded-bl-lg rounded-tr-lg">
              <Text tid="pricing.lottery.popular" />
            </div>
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-100 text-blue-600 mb-4">
              <Trophy className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900">
              <Text tid="pricing.lottery.title" />
            </h3>
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-gray-400" />
                  <h4 className="text-lg font-medium text-gray-900">
                    <Text tid="pricing.lottery.creatorTitle" />
                  </h4>
                </div>
                <p className="mt-2 text-gray-500">
                  <Text tid="pricing.lottery.creatorDesc" />
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-gray-400" />
                  <h4 className="text-lg font-medium text-gray-900">
                    <Text tid="pricing.lottery.respondentTitle" />
                  </h4>
                </div>
                <p className="mt-2 text-gray-500">
                  <Text tid="pricing.lottery.respondentDesc" />
                </p>
              </div>
            </div>
          </div>

          {/* Hybrid Rewards */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-100 text-blue-600 mb-4">
              <Coins className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900">
              <Text tid="pricing.hybrid.title" />
            </h3>
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <h4 className="text-lg font-medium text-gray-900">
                    <Text tid="pricing.hybrid.creatorTitle" />
                  </h4>
                </div>
                <p className="mt-2 text-gray-500">
                  <Text tid="pricing.hybrid.creatorDesc" />
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-gray-400" />
                  <h4 className="text-lg font-medium text-gray-900">
                    <Text tid="pricing.hybrid.respondentTitle" />
                  </h4>
                </div>
                <p className="mt-2 text-gray-500">
                  <Text tid="pricing.hybrid.respondentDesc" />
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Credit System Info */}
        <div className="mt-12 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Coins className="h-6 w-6 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900">
                <Text tid="pricing.creditSystem.title" />
              </h3>
            </div>
            <p className="text-gray-600 mb-2">
              <Text tid="pricing.creditSystem.desc" />
            </p>
            <p className="text-xs text-gray-400">
              <Text tid="pricing.creditSystem.note" />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
