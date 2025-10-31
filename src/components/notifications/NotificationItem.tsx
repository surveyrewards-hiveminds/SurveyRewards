import {
  Bell,
  Check,
  AlertCircle,
  CreditCard,
  CheckCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { Text } from "../language/Text";
import {
  translateNotificationMessage,
  translateNotificationTitle,
  NotificationData,
} from "../../utils/notificationTranslation";
import { formatTimeAgo } from "../../utils/timeFormatting";

export interface Notification {
  id: string;
  user_id: string;
  survey_id?: string;
  type:
    | "survey_live"
    | "survey_invalid"
    | "survey_completed"
    | "credit_refund"
    | "payment_required"
    | "lottery_winner"
    | "lottery_distributed"
    | "survey_reward"
    | "withdrawal"
    | "withdrawal_failed"
    | "withdrawal_successful";
  title: string;
  message: string;
  data?: any;
  read: boolean;
  created_at: string;
  updated_at: string;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

const getNotificationIcon = (type: Notification["type"]) => {
  switch (type) {
    case "survey_live":
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case "survey_invalid":
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    case "survey_completed":
      return <CheckCircle className="h-5 w-5 text-blue-600" />;
    case "credit_refund":
      return <CreditCard className="h-5 w-5 text-blue-600" />;
    case "payment_required":
      return <AlertCircle className="h-5 w-5 text-orange-600" />;
    case "lottery_winner":
      return <CreditCard className="h-5 w-5 text-purple-600" />;
    case "lottery_distributed":
      return <CreditCard className="h-5 w-5 text-purple-600" />;
    case "survey_reward":
      return <CreditCard className="h-5 w-5 text-green-600" />;
    case "withdrawal":
      return <CreditCard className="h-5 w-5 text-blue-600" />;
    case "withdrawal_failed":
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    case "withdrawal_successful":
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    default:
      return <Bell className="h-5 w-5 text-gray-600" />;
  }
};

const getNotificationBgColor = (type: Notification["type"], read: boolean) => {
  const base = read ? "bg-gray-50" : "bg-white";
  if (read) return base;

  switch (type) {
    case "survey_live":
      return "bg-green-50 border-l-4 border-green-500";
    case "survey_invalid":
      return "bg-red-50 border-l-4 border-red-500";
    case "survey_completed":
      return "bg-blue-50 border-l-4 border-blue-500";
    case "credit_refund":
      return "bg-blue-50 border-l-4 border-blue-500";
    case "payment_required":
      return "bg-orange-50 border-l-4 border-orange-500";
    case "lottery_winner":
      return "bg-purple-50 border-l-4 border-purple-500";
    case "lottery_distributed":
      return "bg-purple-50 border-l-4 border-purple-500";
    case "survey_reward":
      return "bg-green-50 border-l-4 border-green-500";
    case "withdrawal":
      return "bg-blue-50 border-l-4 border-blue-500";
    case "withdrawal_failed":
      return "bg-red-50 border-l-4 border-red-500";
    case "withdrawal_successful":
      return "bg-green-50 border-l-4 border-green-500";
    default:
      return "bg-gray-50 border-l-4 border-gray-500";
  }
};

export function NotificationItem({
  notification,
  onMarkAsRead,
}: NotificationItemProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const handleMarkAsRead = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
  };

  const handleNotificationClick = () => {
    handleMarkAsRead();
    navigate(`/notifications/${notification.id}`);
  };

  const getTranslatedTitle = () => {
    return translateNotificationTitle(
      notification.type,
      notification.title,
      language
    );
  };

  const getTranslatedMessage = () => {
    return translateNotificationMessage(
      notification.type,
      notification.message,
      notification.data as NotificationData,
      language
    );
  };

  return (
    <div
      className={`p-4 border-b border-gray-200 cursor-pointer transition-colors hover:bg-gray-50 ${getNotificationBgColor(
        notification.type,
        notification.read
      )} ${!notification.read ? "font-medium" : ""}`}
      onClick={handleNotificationClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {getNotificationIcon(notification.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {getTranslatedTitle()}
            </h4>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {formatTimeAgo(notification.created_at, language)}
            </span>
          </div>

          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {getTranslatedMessage()}
          </p>

          {notification.data &&
            (notification.type === "credit_refund" ||
              notification.type === "lottery_winner" ||
              notification.type === "survey_reward") && (
              <div className="mt-2 text-xs text-gray-500">
                {notification.type === "credit_refund" && (
                  <>
                    <Text tid="notifications.creditsRefunded" />:{" "}
                    {notification.data.credits_refunded}{" "}
                  </>
                )}
                {notification.type === "lottery_winner" && (
                  <>
                    <Text tid="notifications.creditsWon" />:{" "}
                    {notification.data.prize_amount}{" "}
                  </>
                )}
                {notification.type === "survey_reward" && (
                  <>
                    <Text tid="notifications.creditsEarned" />:{" "}
                    {notification.data.reward_amount}{" "}
                  </>
                )}
                <Text tid="common.credit" />
              </div>
            )}

          {!notification.read && (
            <div className="flex items-center gap-1 mt-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <span className="text-xs text-blue-600">
                <Text tid="notifications.unread" />
              </span>
            </div>
          )}
        </div>

        {!notification.read && (
          <button
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
            title="Mark as read"
          >
            <Check className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
