import React, { useState } from "react";
import Modal from "./Modal";
import { Text } from "../language/Text";

type ConfirmationStyle = "danger" | "warning" | "success" | "information";

import { ReactNode } from "react";
interface ConfirmationModalProps {
  open: boolean;
  title: string;
  description: string | ReactNode;
  style: ConfirmationStyle;
  code?: string;
  buttonText?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const styleMap: Record<
  ConfirmationStyle,
  { colorClass: string; label: string }
> = {
  danger: { colorClass: "bg-red-600 hover:bg-red-700", label: "DELETE" },
  warning: {
    colorClass: "bg-yellow-600 hover:bg-yellow-700",
    label: "CONFIRM",
  },
  success: { colorClass: "bg-green-600 hover:bg-green-700", label: "LIVE" },
  information: { colorClass: "bg-blue-600 hover:bg-blue-700", label: "OK" },
};

export function ConfirmationModal({
  open,
  title,
  description,
  style,
  code,
  buttonText,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const [input, setInput] = useState("");

  const { colorClass, label } = styleMap[style];
  const disabled = !!code && input.trim().toLowerCase() !== code.toLowerCase();

  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <div className="mb-4">{description}</div>
      {code && (
        <div className="mb-4">
          <label className="block text-sm mb-1">
            <Text tid="confirmationModal.typeCodeToConfirm" />{" "}
          </label>
          <div className="font-mono bg-gray-200 px-2 py-1 rounded mb-2">
            {code}
          </div>
          <input
            className="border rounded px-3 py-2 w-full"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button
          className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
          onClick={onCancel}
        >
          <Text tid="confirmationModal.cancel" />
        </button>
        <button
          className={`px-4 py-2 rounded text-white font-semibold ${colorClass} ${
            disabled ? "opacity-60 cursor-not-allowed" : ""
          }`}
          onClick={onConfirm}
          disabled={!!disabled}
        >
          {buttonText ?? label ?? "OK"}
        </button>
      </div>
    </Modal>
  );
}
