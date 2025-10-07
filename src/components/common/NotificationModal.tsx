import { CheckCircle, XCircle, AlertTriangle, X } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { getTranslation } from "../../i18n";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "success" | "error" | "warning";
  title: string;
  message: string;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function NotificationModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  onConfirm,
  confirmText,
  cancelText,
}: NotificationModalProps) {
  const { language } = useLanguage();

  // Use provided text or fall back to translated defaults
  const defaultConfirmText =
    confirmText || getTranslation("common.ok", language);
  const defaultCancelText =
    cancelText || getTranslation("confirmationModal.cancel", language);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case "error":
        return <XCircle className="w-16 h-16 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-16 h-16 text-yellow-500" />;
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case "success":
        return "bg-green-600 hover:bg-green-700";
      case "error":
        return "bg-red-600 hover:bg-red-700";
      case "warning":
        return "bg-yellow-600 hover:bg-yellow-700";
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header with close button */}
        <div className="flex justify-end p-4 pb-0">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className={`px-6 pb-6 pt-2`}>
          {/* Icon */}
          <div className="flex justify-center mb-4">{getIcon()}</div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 text-center mb-3">
            {title}
          </h3>

          {/* Message */}
          <p className="text-gray-600 text-center mb-6">{message}</p>

          {/* Buttons */}
          <div className="flex justify-center gap-3">
            {onConfirm ? (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {defaultCancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`px-4 py-2 text-white rounded-md transition-colors ${getButtonColor()}`}
                >
                  {defaultConfirmText}
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className={`px-6 py-2 text-white rounded-md transition-colors ${getButtonColor()}`}
              >
                {defaultConfirmText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
