import Modal from "../../common/Modal";
import { Text } from "../../language/Text";
import { getTranslation } from "../../../i18n";
import { useLanguage } from "../../../context/LanguageContext";
import { CheckCircle, XCircle } from "lucide-react";

interface TranslationResultModalProps {
  open: boolean;
  success: boolean;
  onClose: () => void;
}

export function TranslationResultModal({
  open,
  success,
  onClose,
}: TranslationResultModalProps) {
  const { language } = useLanguage();

  const titleKey = success
    ? "questionBuilder.translationSuccessTitle"
    : "questionBuilder.translationErrorTitle";

  const descriptionKey = success
    ? "questionBuilder.translationSuccessDescription"
    : "questionBuilder.translationErrorDescription";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={getTranslation(titleKey, language)}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {success ? (
            <CheckCircle className="h-8 w-8 text-green-500" />
          ) : (
            <XCircle className="h-8 w-8 text-red-500" />
          )}
          <p className="text-gray-700">
            <Text tid={descriptionKey} />
          </p>
        </div>

        <div className="flex justify-end pt-4">
          <button
            className={`px-4 py-2 rounded text-white font-semibold ${
              success
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
            onClick={onClose}
          >
            <Text tid="questionBuilder.close" />
          </button>
        </div>
      </div>
    </Modal>
  );
}
