import React, { useState } from "react";
import { SurveyAnalytics } from "../components/survey/analytics/SurveyAnalytics";
import { BackButton } from "../components/common/BackButton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/common/Tabs";
import {
  Download,
  Copy,
  XCircle,
  Pencil,
  Eye,
  Play,
  MoreVertical,
  Link,
  AlertTriangle,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Modal from "../components/common/Modal";
import { SurveyResponsesTable } from "../components/survey/responses/SurveyResponsesTable";
import { useSurveyResponses } from "../hooks/useSurveyResponses";
import { useSurveyDetails } from "../hooks/useSurveyDetailWithTags";
import { useManualStartSurvey } from "../hooks/useManualStartSurvey";
import { Loading } from "../components/common/Loading";
import { Text } from "../components/language/Text";
import { getTranslation } from "../i18n";
import { useLanguage } from "../context/LanguageContext";
import { surveyResponsesToCSVData } from "../utils/surveyCSV";
import {
  getParticipantDataHeaders,
  extractParticipantData,
  getParticipantDataCSVHeaders,
} from "../utils/participantDataMapping";
import { cloneSurvey, endSurvey, cancelSurvey } from "../utils/survey";
import { useProfile } from "../context/ProfileContext";
import { SurveyWithTags } from "../types/survey";
import { exportCSV } from "../utils/exportCSV";
import { ConfirmationModal } from "../components/common/ConfirmationModal";
import { NotificationModal } from "../components/common/NotificationModal";
import { SurveyAccessUrl } from "../components/survey/SurveyAccessUrl";
import SurveyInfoDisplay from "../components/survey/management/ViewSettings";
import { DropdownButton } from "../components/common/DropdownButton";
import { SurveyDetailsPanel } from "../components/survey/management/SurveyDetailsPanel";
import { CustomUrlInput } from "../components/survey/builder/settings/CustomUrlInput";
import {
  getTranslatedSurveyName,
  getTranslatedSurveyDescription,
} from "../utils/surveyTranslation";
import { mapBackendMessage } from "../utils/messageMapping";
import { fetchSurveyTagsWithTranslations } from "../utils/surveyTags";
import { TagWithTranslations } from "../types/survey";
import { checkSurveyPaymentStatus } from "../utils/paymentStatus";

export default function SurveyManagement() {
  const { language } = useLanguage();
  const { userID } = useProfile(); // Ensure profile is loaded for user permissions
  const navigate = useNavigate();
  const { surveyId } = useParams();
  const [activeTab, setActiveTab] = useState("responses");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(false);
  const [translatedTags, setTranslatedTags] = useState<TagWithTranslations[]>(
    []
  );
  const [hasPaymentIssues, setHasPaymentIssues] = useState(false);
  const [checkingPayments, setCheckingPayments] = useState(false);

  // Add style for images in survey description
  React.useEffect(() => {
    const styleId = "survey-description-img-style";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.innerHTML = `
        .survey-description-html img {
          max-width: 100%;
          height: auto;
          max-height: 350px;
          display: block;
          margin: 0.5em auto;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: React.ReactNode;
    style: "danger" | "warning" | "success" | "information";
    code?: string;
    buttonText?: string | null;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    style: "information",
    code: undefined,
    buttonText: undefined,
    onConfirm: () => {},
  });

  // Success/Error modal state
  const [notificationModal, setNotificationModal] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "warning";
    title: string;
    message: string;
    onConfirm?: () => void;
    confirmText?: string;
  }>({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
  });

  // Responses
  const {
    responses,
    loading: loadingResponses,
    total,
  } = useSurveyResponses(surveyId as string, page, pageSize);

  // Modal for answers
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<any[]>([]);

  // Modal for custom URL editing
  const [showCustomUrlModal, setShowCustomUrlModal] = useState(false);
  const [customUrlValue, setCustomUrlValue] = useState("");

  // Fetch survey details, tags, and questions
  const {
    survey,
    loading: loadingSurvey,
    refresh: refreshSurvey,
  } = useSurveyDetails(surveyId);

  // Manual start survey hook
  const {
    startSurvey,
    loading: startingManually,
    error: manualStartError,
  } = useManualStartSurvey();

  // Fetch translated tags when survey and language change
  React.useEffect(() => {
    const fetchTranslatedTags = async () => {
      if (survey?.id) {
        try {
          const translatedTagsMap = await fetchSurveyTagsWithTranslations(
            [survey.id],
            language
          );
          setTranslatedTags(translatedTagsMap[survey.id] || []);
        } catch (error) {
          console.error("Error fetching translated tags:", error);
          setTranslatedTags([]);
        }
      }
    };

    fetchTranslatedTags();
  }, [survey?.id, language]);

  // Check payment status when survey loads or changes
  React.useEffect(() => {
    const checkPayments = async () => {
      if (survey?.status === "draft" && surveyId) {
        setCheckingPayments(true);
        const paymentStatus = await checkSurveyPaymentStatus(surveyId);
        setHasPaymentIssues(
          paymentStatus.hasPendingPayments || !!paymentStatus.error
        );
        setCheckingPayments(false);
      }
    };

    checkPayments();
  }, [survey?.status, surveyId]);

  // Generate code: survey name, lowercased, no special chars, spaces to underscores
  const code =
    survey?.name
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "delete";

  // Fetch answers for a response
  const handleViewAnswers = async (response: any) => {
    // direct to preview answer same with history
    navigate(
      `/survey-preview/${surveyId}?mode=history&responseId=${response.id}&viewRespondent=true`
    );
  };

  const handleCloseModal = () => {
    setShowAnswerModal(false);
    setSelectedAnswers([]);
  };

  const handleDownloadCSV = async () => {
    function toSnakeCase(str: string) {
      return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_") // replace non-alphanumeric with _
        .replace(/^_+|_+$/g, ""); // trim leading/trailing underscores
    }

    if (!survey || !responses) {
      console.error(
        getTranslation("surveyManagement.csvDownloadError", language)
      );
      return;
    }

    // Fetch all answers for the responses
    const { data: allAnswers, error: answersError } = await supabase
      .from("survey_answers")
      .select("*")
      .in(
        "response_id",
        responses.map((r) => r.id)
      );

    if (answersError) {
      alert(getTranslation("surveyManagement.fetchAnswersError", language));
      return;
    }

    const responsesWithAnswers = responses.map((resp) => ({
      ...resp,
      answers: (allAnswers || []).filter((a) => a.response_id === resp.id),
    }));
    const { headers, rows } = await surveyResponsesToCSVData(
      survey.questions,
      responsesWithAnswers,
      language
    );

    // Get participant data headers and include them in CSV
    const participantHeaders = getParticipantDataHeaders(
      survey.required_info || {},
      language
    );
    const participantCSVHeaders = getParticipantDataCSVHeaders(
      survey.required_info || {},
      language
    );

    const numberedHeaders = [
      getTranslation("csvExport.number", language),
      getTranslation("surveyTable.participant", language),
      ...participantCSVHeaders,
      ...headers,
    ];

    const numberedRows = rows.map((row, idx) => {
      const response = responsesWithAnswers[idx];
      const participantData = extractParticipantData(
        response.user_info_snapshot,
        survey.required_info || {},
        language
      );
      const participantValues = participantHeaders.map(
        (h) => participantData[h.key] || ""
      );

      return [
        idx + 1,
        response.user_info_snapshot?.name ||
          getTranslation("csvExport.anonymous", language),
        ...participantValues,
        ...row,
      ];
    });

    exportCSV({
      filename: `${toSnakeCase(survey.name) || "survey"}_responses.csv`,
      headers: numberedHeaders,
      rows: numberedRows,
    });
  };

  const handleCloneSurvey = async () => {
    setConfirmModal({
      open: true,
      title: getTranslation("surveyManagement.clone", language),
      description: getTranslation(
        "confirmationModal.cloneSurveyDescription",
        language
      ),
      style: "information",
      code: code,
      buttonText: getTranslation("confirmationModal.clone", language),
      onConfirm: async () => {
        setConfirmModal((m) => ({ ...m, open: false }));
        setLoading(true);
        try {
          if (!surveyId) {
            throw new Error("Survey ID is required to clone the survey.");
          }
          if (!userID) {
            throw new Error("User ID is required to clone the survey.");
          }
          const clonedSurvey = await cloneSurvey(surveyId, userID);
          if (!clonedSurvey) {
            throw new Error(
              getTranslation("alert.error.cloneSurvey", language)
            );
          }
          navigate(`/my-surveys/${clonedSurvey.id}/edit`);
        } catch (error) {
          console.error("Error cloning survey:", error);
          alert(getTranslation("alert.error.cloneSurvey", language));
        }
        setLoading(false);
      },
    });
  };

  const handleEndSurvey = () => {
    setConfirmModal({
      open: true,
      title: getTranslation("surveyManagement.endSurvey", language),
      description: getTranslation(
        "confirmationModal.endSurveyDescription",
        language
      ),
      style: "danger",
      code: code,
      buttonText: getTranslation("confirmationModal.end", language),
      onConfirm: async () => {
        setConfirmModal((m) => ({ ...m, open: false }));
        if (!surveyId) {
          console.error("Survey ID is required to end the survey.");
          return;
        }
        try {
          const result = await endSurvey(surveyId);
          if (result.success) {
            setNotificationModal({
              isOpen: true,
              type: "success",
              title:
                getTranslation("alert.success.endSurvey", language) ||
                "Survey Ended Successfully",
              message: mapBackendMessage(result.message, "end", language),
              onConfirm: () => {
                setNotificationModal((prev) => ({ ...prev, isOpen: false }));
                refreshSurvey();
              },
              confirmText: getTranslation("common.ok", language),
            });
          } else {
            setNotificationModal({
              isOpen: true,
              type: "error",
              title:
                getTranslation("alert.error.endSurvey", language) || "Error",
              message: mapBackendMessage(result.message, "end", language),
            });
          }
        } catch (error) {
          setNotificationModal({
            isOpen: true,
            type: "error",
            title: getTranslation("alert.error.endSurvey", language) || "Error",
            message:
              getTranslation("alert.error.endSurvey", language) ||
              "Failed to end survey.",
          });
        }
      },
    });
  };

  const handleCancelSurvey = () => {
    setConfirmModal({
      open: true,
      title:
        getTranslation("surveyManagement.cancelSurvey", language) ||
        "Cancel Survey",
      description: (
        <>
          <div>
            {getTranslation(
              "confirmationModal.cancelSurveyDescription",
              language
            ) ||
              "Are you sure you want to cancel this survey? This action cannot be undone."}
          </div>
          {(survey?.status === "waiting-for-live" ||
            (survey?.status === "draft" &&
              survey.payment_status === "paid")) && (
            <div className="mt-2 text-sm">
              <p className="font-semibold">
                {getTranslation(
                  "cancelSurveyModal.waitingForLiveRefund",
                  language
                ) ||
                  "You will receive a full refund of credits minus any translation fees."}
              </p>
            </div>
          )}
          {survey?.status === "live" && (
            <div className="mt-2 text-sm">
              <p className="font-semibold">
                {getTranslation("cancelSurveyModal.liveRefund", language) ||
                  "You will receive a prorated refund for unused participation slots."}
              </p>
            </div>
          )}
        </>
      ),
      style: "danger",
      code: code,
      buttonText: getTranslation("common.yes", language) || "Cancel Survey",
      onConfirm: async () => {
        setConfirmModal((m) => ({ ...m, open: false }));
        setLoading(true);

        if (!surveyId) {
          console.error("Survey ID is required to cancel the survey.");
          setLoading(false);
          return;
        }

        try {
          const result = await cancelSurvey(surveyId);

          if (result.success) {
            // Show success modal instead of alert
            setNotificationModal({
              isOpen: true,
              type: "success",
              title:
                getTranslation("alert.success.cancelSurveyTitle", language) ||
                "Survey Cancelled Successfully",
              message: mapBackendMessage(result.message, "cancel", language),
              onConfirm: () => {
                setNotificationModal((prev) => ({ ...prev, isOpen: false }));
                refreshSurvey();
              },
              confirmText: getTranslation("common.ok", language),
            });
          } else {
            setNotificationModal({
              isOpen: true,
              type: "error",
              title:
                getTranslation("alert.error.cancelSurvey", language) ||
                "Cancel Failed",
              message:
                getTranslation("alert.error.cancelSurvey", language) +
                ": " +
                mapBackendMessage(result.message, "cancel", language),
            });
          }
        } catch (error) {
          setNotificationModal({
            isOpen: true,
            type: "error",
            title:
              getTranslation("alert.error.cancelSurvey", language) || "Error",
            message: "An error occurred while cancelling the survey.",
          });
          console.error("Error cancelling survey:", error);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // Handle delete survey
  const handleDeleteSurvey = (surveyId: string) => {
    setConfirmModal({
      open: true,
      title: getTranslation("editSurvey.deleteSurvey", language),
      description: getTranslation(
        "confirmationModal.deleteSurveyDescription",
        language
      ),
      style: "danger",
      code: code,
      buttonText: getTranslation("confirmationModal.delete", language),
      onConfirm: async () => {
        setConfirmModal((m) => ({ ...m, open: false }));
        setLoading(true);
        const { error } = await supabase
          .from("surveys")
          .update({ status: "deleted" })
          .eq("id", surveyId);
        if (error) {
          setNotificationModal({
            isOpen: true,
            type: "error",
            title:
              getTranslation("alert.error.deleteSurvey", language) ||
              "Delete Failed",
            message:
              getTranslation("alert.error.deleteSurvey", language) +
              ": " +
              error.message,
          });
        } else {
          setNotificationModal({
            isOpen: true,
            type: "success",
            title: getTranslation("alert.success.surveyDeletedTitle", language),
            message: getTranslation("alert.success.surveyDeleted", language),
            onConfirm: () => {
              setNotificationModal((prev) => ({ ...prev, isOpen: false }));
              refreshSurvey();
            },
            confirmText: getTranslation("common.ok", language),
          });
        }
        setLoading(false);
      },
    });
  };

  // --- Custom URL Update ---
  const handleEditCustomUrl = async () => {
    if (!surveyId) return;

    try {
      // Fetch the current active custom URL for this survey
      const { data: customUrlData, error } = await supabase
        .from("survey_custom_urls")
        .select("custom_url")
        .eq("survey_id", surveyId)
        .neq("status", "deleted")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error fetching custom URL:", error);
        setCustomUrlValue(""); // Default to empty if can't fetch
      } else {
        setCustomUrlValue(customUrlData?.[0]?.custom_url || "");
      }
    } catch (error) {
      console.error("Error fetching custom URL:", error);
      setCustomUrlValue(""); // Default to empty if can't fetch
    }

    setShowCustomUrlModal(true);
  };

  const handleUpdateCustomUrl = async () => {
    if (!surveyId) return;

    try {
      setLoading(true);

      // First, mark the old custom URL record as deleted (if it exists)
      const { error: deleteError } = await supabase
        .from("survey_custom_urls")
        .update({ status: "deleted" })
        .eq("survey_id", surveyId)
        .neq("status", "deleted"); // Only update records that aren't already deleted

      if (deleteError) {
        console.error("Error deleting old custom URL:", deleteError);
        // Continue anyway as this might not exist
      }

      // Only create a new record if customUrlValue is not empty
      if (customUrlValue.trim()) {
        const { error: insertError } = await supabase
          .from("survey_custom_urls")
          .insert({
            survey_id: surveyId,
            custom_url: customUrlValue.trim(),
            status: survey?.status || "draft", // Use current survey status
          });

        if (insertError) {
          setNotificationModal({
            isOpen: true,
            type: "error",
            title: getTranslation("editCustomUrl.errorTitle", language),
            message: getTranslation(
              "editCustomUrl.errorCreateFailed",
              language
            ).replace("{error}", insertError.message),
          });
          return;
        }
      }
      setShowCustomUrlModal(false);
      setNotificationModal({
        isOpen: true,
        type: "success",
        title: getTranslation("editCustomUrl.successTitle", language),
        message: customUrlValue.trim()
          ? getTranslation("editCustomUrl.successUpdated", language)
          : getTranslation("editCustomUrl.successRemoved", language),
        onConfirm: () => {
          setNotificationModal((prev) => ({ ...prev, isOpen: false }));
        },
        confirmText: getTranslation("common.ok", language),
      });
    } catch (error) {
      console.error("Error updating custom URL:", error);
      setNotificationModal({
        isOpen: true,
        type: "error",
        title: getTranslation("editCustomUrl.errorTitle", language),
        message: getTranslation("editCustomUrl.errorUpdateFailed", language),
      });
    } finally {
      setLoading(false);
    }
  };

  // --- Go Live ---
  const handleGoLive = async () => {
    if (!survey || !surveyId) return;

    // Double-check payment status before proceeding
    setLoading(true);
    const paymentStatus = await checkSurveyPaymentStatus(surveyId);
    setLoading(false);

    if (paymentStatus.error) {
      setNotificationModal({
        isOpen: true,
        type: "error",
        title:
          getTranslation("alert.error.checkPayment", language) ||
          "Payment Check Failed",
        message:
          getTranslation("alert.error.checkPaymentMessage", language) ||
          "Unable to verify payment status. Please try again.",
      });
      return;
    }

    if (paymentStatus.hasPendingPayments) {
      setNotificationModal({
        isOpen: true,
        type: "warning",
        title:
          getTranslation("alert.warning.pendingPayment", language) ||
          "Payment Required",
        message:
          getTranslation("alert.warning.pendingPaymentMessage", language) ||
          "You have pending payments for this survey. Please complete your payment before going live.",
        onConfirm: () => {
          setNotificationModal((prev) => ({ ...prev, isOpen: false }));
          navigate(`/my-surveys/${surveyId}/edit?tab=payment`);
        },
        confirmText:
          getTranslation("alert.warning.completePayment", language) ||
          "Complete Payment",
      });
      return;
    }

    // Ask user to confirm going live (only if no pending payments)
    setConfirmModal({
      open: true,
      title: getTranslation("editSurvey.goLive", language),
      description: getTranslation(
        "confirmationModal.goLiveSurveyDescription",
        language
      ),
      style: "success",
      code: code,
      buttonText: getTranslation("confirmationModal.live", language),
      onConfirm: async () => {
        setConfirmModal((m) => ({ ...m, open: false }));
        setLoading(true);

        // Simply update survey status to waiting-for-live
        const { error: surveyError } = await supabase
          .from("surveys")
          .update({
            status: "waiting-for-live",
          })
          .eq("id", surveyId);

        if (surveyError) {
          setNotificationModal({
            isOpen: true,
            type: "error",
            title:
              getTranslation("alert.error.surveyLiveFail", language) || "Error",
            message:
              getTranslation("alert.error.surveyLiveFail", language) +
              ": " +
              surveyError.message,
          });
          setLoading(false);
          return;
        }

        setLoading(false);
        setNotificationModal({
          isOpen: true,
          type: "success",
          title: getTranslation("alert.surveyLive", language) || "Survey Live",
          message:
            getTranslation("alert.surveyLive", language) ||
            "Survey is now waiting to go live.",
          onConfirm: () => {
            setNotificationModal((prev) => ({ ...prev, isOpen: false }));
            refreshSurvey();
          },
          confirmText: getTranslation("common.ok", language),
        });
      },
    });
  };

  // --- Manual Start ---
  const handleManualStart = async () => {
    if (!survey || !surveyId) return;

    setConfirmModal({
      open: true,
      title: getTranslation("editSurvey.goLive", language), // Use same title as regular go live
      description:
        "Are you sure you want to make this survey live? Once live, it will become active immediately and be available for responses.",
      style: "success",
      code: code,
      buttonText: getTranslation("confirmationModal.live", language), // Use same button text
      onConfirm: async () => {
        setConfirmModal((m) => ({ ...m, open: false }));

        const success = await startSurvey(surveyId);

        if (success) {
          setNotificationModal({
            isOpen: true,
            type: "success",
            title:
              getTranslation("alert.surveyLive", language) || "Survey Live",
            message: "Your survey is now live and accepting responses.",
            onConfirm: () => {
              setNotificationModal((prev) => ({ ...prev, isOpen: false }));
              refreshSurvey();
            },
            confirmText: getTranslation("common.ok", language),
          });
        } else {
          setNotificationModal({
            isOpen: true,
            type: "error",
            title: "Go Live Failed",
            message:
              manualStartError ||
              "Failed to make survey live. Please try again.",
            onConfirm: () =>
              setNotificationModal((prev) => ({ ...prev, isOpen: false })),
            confirmText: getTranslation("common.ok", language),
          });
        }
      },
    });
  };

  // function to get status translation text
  const getStatusTranslation = (status: SurveyWithTags["status"]) => {
    switch (status) {
      case "draft":
        return getTranslation("surveyFilters.statusTypes.draft", language);
      case "waiting-for-live":
        return getTranslation(
          "surveyFilters.statusTypes.waiting-for-live",
          language
        );
      case "live":
        return getTranslation("surveyFilters.statusTypes.live", language);
      case "finished":
        return getTranslation("surveyFilters.statusTypes.finished", language);
      case "canceled":
        return getTranslation("surveyFilters.statusTypes.canceled", language);
      case "deleted":
        return getTranslation("surveyFilters.statusTypes.deleted", language);
      default:
        return status;
    }
  };

  const getStatusColor = (status: SurveyWithTags["status"]) => {
    switch (status) {
      case "draft":
        return "bg-cyan-100 text-cyan-800";
      case "waiting-for-live":
        return "bg-blue-100 text-blue-800";
      case "finished":
        return "bg-yellow-100 text-yellow-800";
      case "deleted":
        return "bg-rose-100 text-rose-800";
      case "live":
        return "bg-green-100 text-green-800";
      case "canceled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };
  // Add style for images in survey description
  // This can be moved to a global CSS if preferred
  React.useEffect(() => {
    const styleId = "survey-description-img-style";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.innerHTML = `
        .survey-description-html img {
          max-width: 100%;
          height: auto;
          max-height: 350px;
          display: block;
          margin: 0.5em auto;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  if (loadingSurvey || loadingResponses || loading) {
    return <Loading />;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <BackButton onClick={() => navigate("/my-surveys")} />
        <div className="flex items-center gap-3">
          {/* Primary Actions - Always visible */}
          {survey?.status === "draft" && survey?.payment_status !== "paid" && (
            <button
              onClick={() => navigate(`/my-surveys/${surveyId}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={!surveyId}
            >
              <Pencil className="h-4 w-4" />
              <Text tid="surveyManagement.edit" />
            </button>
          )}

          {survey?.status === "draft" && survey?.payment_status !== "paid" && (
            <button
              onClick={handleGoLive}
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                hasPaymentIssues || checkingPayments
                  ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
              disabled={hasPaymentIssues || checkingPayments || loading}
              title={
                hasPaymentIssues
                  ? getTranslation(
                      "alert.warning.pendingPaymentTooltip",
                      language
                    ) || "Complete payment before going live"
                  : undefined
              }
            >
              <Play className="h-4 w-4" />
              <Text tid="editSurvey.goLive" />
              {checkingPayments && (
                <div className="ml-1 w-3 h-3 border border-gray-600 border-t-transparent rounded-full animate-spin"></div>
              )}
            </button>
          )}

          {survey?.status === "waiting-for-live" &&
            survey?.manual_start &&
            survey?.payment_status === "paid" && (
              <button
                onClick={handleManualStart}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                disabled={startingManually}
              >
                <Play className="h-4 w-4" />
                <Text tid="editSurvey.goLive" />
                {startingManually && (
                  <div className="ml-1 w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                )}
              </button>
            )}

          {/* Secondary Actions - Grouped in dropdown */}
          <DropdownButton
            label={<Text tid="surveyManagement.settings" />}
            icon={<MoreVertical className="h-4 w-4" />}
            options={[
              {
                id: "preview",
                label: <Text tid="surveyManagement.preview" />,
                icon: <Eye className="h-4 w-4" />,
                onClick: () => navigate(`/my-surveys/${surveyId}/preview`),
                disabled: !surveyId,
              },
              {
                id: "clone",
                label: <Text tid="surveyManagement.clone" />,
                icon: <Copy className="h-4 w-4" />,
                onClick: handleCloneSurvey,
              },
              ...(survey?.status === "live" ||
              survey?.status === "waiting-for-live"
                ? [
                    {
                      id: "editCustomUrl",
                      label: <Text tid="surveyManagement.editCustomUrl" />,
                      icon: <Link className="h-4 w-4" />,
                      onClick: handleEditCustomUrl,
                    },
                  ]
                : []),
              ...(survey?.manual_end && survey?.status === "live"
                ? [
                    {
                      id: "end",
                      label: <Text tid="surveyManagement.endSurvey" />,
                      icon: <XCircle className="h-4 w-4" />,
                      onClick: handleEndSurvey,
                      className: "text-red-600 hover:bg-red-50",
                    },
                  ]
                : []),
              ...(survey?.status === "waiting-for-live"
                ? [
                    {
                      id: "cancel",
                      label: <Text tid="surveyManagement.cancelSurvey" />,
                      icon: <XCircle className="h-4 w-4" />,
                      onClick: handleCancelSurvey,
                      className: "text-red-600 hover:bg-red-50",
                    },
                  ]
                : []),
              ...(survey?.status === "draft"
                ? [
                    {
                      id: "delete",
                      label: <Text tid="editSurvey.deleteSurvey" />,
                      icon: <XCircle className="h-4 w-4" />,
                      onClick: () => handleDeleteSurvey(surveyId || ""),
                      className: "text-red-600 hover:bg-red-50",
                    },
                  ]
                : []),
            ]}
          />
        </div>
      </div>

      {/* Show payment warning if there are payment issues */}
      {survey?.status === "draft" && hasPaymentIssues && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
            <p className="text-sm text-yellow-800">
              {getTranslation("alert.warning.pendingPaymentBanner", language) ||
                "You have pending payments for this survey. Complete your payment to go live."}
            </p>
            <button
              onClick={() =>
                navigate(`/my-surveys/${surveyId}/edit?tab=payment`)
              }
              className="ml-auto text-sm bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
            >
              {getTranslation("alert.warning.completePayment", language) ||
                "Complete Payment"}
            </button>
          </div>
        </div>
      )}

      {/* Survey Details */}
      {survey && (
        <div className="mb-6 p-4 bg-gray-100 rounded">
          <div className="flex items-center mb-2 gap-2">
            <h2 className="text-xl font-bold">
              {getTranslatedSurveyName(
                {
                  title_translations: survey.title_translations,
                  name: survey.name,
                },
                language
              )}
            </h2>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                survey.status
              )}`}
            >
              {getStatusTranslation(survey.status)}
            </span>
          </div>
          {/* Render description as HTML */}
          {(survey.description ||
            getTranslatedSurveyDescription(survey, language)) && (
            <div
              className="mb-2 survey-description-html"
              dangerouslySetInnerHTML={{
                __html:
                  getTranslatedSurveyDescription(survey, language) ||
                  survey.description ||
                  "",
              }}
            />
          )}

          {/* Survey metadata panel */}
          <SurveyDetailsPanel survey={survey} totalResponses={total || 0} />

          <div className="flex flex-wrap gap-2 mb-3">
            {(translatedTags.length > 0
              ? translatedTags
              : survey.tags?.map((tagName, index) => ({
                  id: `fallback-${index}`,
                  name: tagName,
                  translated_name: tagName,
                })) || []
            ).map((tag) => (
              <span
                key={tag.id}
                className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
              >
                {tag.translated_name || tag.name}
              </span>
            ))}
          </div>
          {/* Survey Access URL */}
          <SurveyAccessUrl surveyId={survey.id || ""} />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="responses">
            <Text tid="surveyManagement.responses" />
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Text tid="surveyManagement.settings" />
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <Text tid="surveyManagement.analytics" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="responses">
          <div className="flex justify-end mb-4">
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Download className="h-4 w-4" />
              <Text tid="surveyManagement.downloadCSV" />
            </button>
          </div>
          {/* Responses Table */}
          <SurveyResponsesTable
            responses={responses}
            loading={loadingResponses}
            onViewAnswers={handleViewAnswers}
            requiredInfo={survey?.required_info || {}}
          />

          {/* Pagination Controls */}
          {total > pageSize && (
            <div className="flex items-center justify-between mt-4 px-4 py-3 bg-white border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-700">
                {getTranslation("pagination.showing", language)
                  .replace(
                    "{start}",
                    Math.min((page - 1) * pageSize + 1, total).toString()
                  )
                  .replace("{end}", Math.min(page * pageSize, total).toString())
                  .replace("{total}", total.toString())}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {getTranslation("pagination.previous", language)}
                </button>
                <span className="text-sm text-gray-700">
                  {getTranslation("pagination.pageOf", language)
                    .replace("{current}", page.toString())
                    .replace("{total}", Math.ceil(total / pageSize).toString())}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= Math.ceil(total / pageSize)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {getTranslation("pagination.next", language)}
                </button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings">
          <SurveyInfoDisplay requiredInfo={survey?.required_info} />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="flex justify-end mb-4">
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Download className="h-4 w-4" />
              <Text tid="surveyManagement.downloadCSV" />
            </button>
          </div>
          {survey?.id && <SurveyAnalytics surveyId={survey.id} />}
        </TabsContent>
      </Tabs>

      {/* Answer Modal */}
      {showAnswerModal && (
        <Modal
          open={showAnswerModal}
          onClose={handleCloseModal}
          title={getTranslation("surveyResponses.modal.title", language)}
        >
          <div>
            {survey?.questions.map((q) => {
              const answerObj = selectedAnswers.find(
                (a) => a.question_id === q.id
              );
              return (
                <div key={q.id} className="mb-4">
                  <div
                    className="font-semibold"
                    dangerouslySetInnerHTML={{ __html: q.question }}
                  />
                  {q.type?.slice(0, 2) != "i_" && ( // to filter only input questions
                    <div className="ml-2 text-gray-700">
                      {answerObj ? (
                        answerObj.answer.value || (
                          <span className="italic text-gray-400">
                            {getTranslation(
                              "surveyManagement.noAnswer",
                              language
                            )}
                          </span>
                        )
                      ) : (
                        <span className="italic text-gray-400">
                          {getTranslation(
                            "surveyManagement.noAnswer",
                            language
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      <NotificationModal
        isOpen={notificationModal.isOpen}
        onClose={() =>
          setNotificationModal((prev) => ({ ...prev, isOpen: false }))
        }
        type={notificationModal.type}
        title={notificationModal.title}
        message={notificationModal.message}
        onConfirm={notificationModal.onConfirm}
        confirmText={notificationModal.confirmText}
      />

      <ConfirmationModal
        open={confirmModal.open}
        title={confirmModal.title}
        description={confirmModal.description}
        style={confirmModal.style}
        code={confirmModal.code}
        buttonText={confirmModal.buttonText}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((m) => ({ ...m, open: false }))}
      />

      {/* Custom URL Edit Modal */}
      {showCustomUrlModal && userID && (
        <Modal
          open={showCustomUrlModal}
          onClose={() => setShowCustomUrlModal(false)}
          title={getTranslation("editCustomUrl.title", language)}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {getTranslation("editCustomUrl.description", language)}
            </p>
            <CustomUrlInput
              userId={userID}
              value={customUrlValue}
              onChange={setCustomUrlValue}
            />
            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => setShowCustomUrlModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={loading}
              >
                {getTranslation("editCustomUrl.cancel", language)}
              </button>
              <button
                onClick={handleUpdateCustomUrl}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading
                  ? getTranslation("editCustomUrl.updating", language)
                  : getTranslation("editCustomUrl.updateUrl", language)}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
