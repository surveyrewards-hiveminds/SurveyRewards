import React from "react";
import { ArrowLeft } from "lucide-react";
import { Text } from "../language/Text";

interface BackButtonProps {
  onClick: () => void;
  label?: string;
}

export function BackButton({
  onClick,
  label = "backButton.back",
}: BackButtonProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center text-gray-700 hover:text-gray-900 mb-4"
    >
      <ArrowLeft className="h-5 w-5 mr-1" />
      <span>
        <Text tid={label as any} />
      </span>
    </button>
  );
}
