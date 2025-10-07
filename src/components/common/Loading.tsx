import React from "react";
import { Text } from "../language/Text";

export function Loading() {
  return (
    <div className="p-8 text-center text-gray-500 flex flex-col items-center">
      <span className="inline-block w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
      <span className="mb-2">
        <Text tid="loading.loading" />
      </span>
    </div>
  );
}
