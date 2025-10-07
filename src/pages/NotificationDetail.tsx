import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Calendar,
  User,
  ExternalLink,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useProfile } from "../context/ProfileContext";
import { useLanguage } from "../context/LanguageContext";
import Layout from "../components/Layout";
import { Text } from "../components/language/Text";
import { Notification } from "../components/notifications/NotificationItem";
import {
  translateNotificationMessage,
  translateNotificationTitle,
  NotificationData,
} from "../utils/notificationTranslation";
import { formatNotificationDateTime } from "../utils/dateFormatting";

export function NotificationDetail() {
  const { notificationId } = useParams<{ notificationId: string }>();
  const navigate = useNavigate();
  const { userID } = useProfile();
  const { language } = useLanguage();
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userID || !notificationId) {
      setError("Invalid notification ID or user not authenticated");
      setLoading(false);
      return;
    }

    fetchNotification();
  }, [userID, notificationId]);

  const fetchNotification = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("id", notificationId)
        .eq("user_id", userID)
        .single();

      if (error) throw error;

      setNotification(data);

      // Mark as read if not already read
      if (!data.read) {
        await supabase
          .from("notifications")
          .update({ read: true })
          .eq("id", notificationId)
          .eq("user_id", userID);
      }
    } catch (error) {
      console.error("Error fetching notification:", error);
      setError("Failed to load notification");
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "survey_live":
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case "survey_invalid":
        return <AlertCircle className="h-8 w-8 text-red-600" />;
      case "survey_completed":
        return <CheckCircle className="h-8 w-8 text-blue-600" />;
      case "credit_refund":
        return <CreditCard className="h-8 w-8 text-blue-600" />;
      case "payment_required":
        return <AlertCircle className="h-8 w-8 text-orange-600" />;
      default:
        return <Bell className="h-8 w-8 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: Notification["type"]) => {
    switch (type) {
      case "survey_live":
        return "text-green-600 bg-green-50 border-green-200";
      case "survey_invalid":
        return "text-red-600 bg-red-50 border-red-200";
      case "survey_completed":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "credit_refund":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "payment_required":
        return "text-orange-600 bg-orange-50 border-orange-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const handleNavigateToSurvey = () => {
    if (notification?.survey_id) {
      navigate(`/my-surveys/${notification.survey_id}`);
    }
  };

  const getTranslatedTitle = () => {
    if (!notification) return "";
    return translateNotificationTitle(
      notification.type,
      notification.title,
      language
    );
  };

  const getTranslatedMessage = () => {
    if (!notification) return "";
    return translateNotificationMessage(
      notification.type,
      notification.message,
      notification.data as NotificationData,
      language
    );
  };

  if (loading) {
    return (
      <Layout hideSidebar>
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">
                <Text tid="common.loading" />
                ...
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !notification) {
    return (
      <Layout hideSidebar>
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h1 className="mt-4 text-xl font-bold text-gray-900">
              <Text tid="notifications.detail.notFound" />
            </h1>
            <p className="mt-2 text-gray-600">{error}</p>
            <button
              onClick={() => navigate("/notifications")}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              <Text tid="notifications.detail.backToNotifications" />
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/notifications")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          <Text tid="notifications.detail.title" />
        </h1>
      </div>

      {/* Notification Card */}
      <div
        className={`border rounded-lg p-6 ${getNotificationColor(
          notification.type
        )}`}
      >
        {/* Header with Icon and Type */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0">
            {getNotificationIcon(notification.type)}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {getTranslatedTitle()}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatNotificationDateTime(notification.created_at, language)}
              </div>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {notification.type.replace("_", " ").toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            <Text tid="notifications.detail.message" />
          </h3>
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {getTranslatedMessage()}
            </p>
          </div>
        </div>

        {/* Additional Data */}
        {notification.data && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              <Text tid="notifications.detail.additionalInfo" />
            </h3>
            <div className="bg-white p-4 rounded-lg border">
              {notification.data.survey_name && (
                <div className="mb-2">
                  <span className="font-medium text-gray-700">
                    <Text tid="notifications.detail.surveyName" />:
                  </span>
                  <span className="ml-2 text-gray-600">
                    {notification.data.survey_name}
                  </span>
                </div>
              )}
              {notification.data.validation_errors && (
                <div className="mb-2">
                  <span className="font-medium text-gray-700">
                    <Text tid="notifications.detail.validationErrors" />:
                  </span>
                  <ul className="mt-1 list-disc list-inside text-gray-600">
                    {notification.data.validation_errors.map(
                      (error: string, index: number) => (
                        <li key={index}>{error}</li>
                      )
                    )}
                  </ul>
                </div>
              )}
              {notification.data.amount && (
                <div className="mb-2">
                  <span className="font-medium text-gray-700">
                    <Text tid="notifications.detail.amount" />:
                  </span>
                  <span className="ml-2 text-gray-600">
                    ${notification.data.amount}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        {notification.survey_id &&
          (notification.type === "survey_live" ||
            notification.type === "survey_invalid" ||
            notification.type === "survey_completed" ||
            notification.type === "payment_required") && (
            <div className="flex gap-3">
              <button
                onClick={handleNavigateToSurvey}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                <Text tid="notifications.detail.viewSurvey" />
              </button>
            </div>
          )}
      </div>
    </div>
  );
}

export default NotificationDetail;
