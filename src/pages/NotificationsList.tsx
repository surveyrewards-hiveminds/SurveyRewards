import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Calendar,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Filter,
  Search,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useProfile } from "../context/ProfileContext";
import { useLanguage } from "../context/LanguageContext";
import { getTranslation } from "../i18n";
import Layout from "../components/Layout";
import {
  translateNotificationMessage,
  translateNotificationTitle,
  NotificationData,
} from "../utils/notificationTranslation";
import { formatTimeAgo } from "../utils/timeFormatting";
import { Text } from "../components/language/Text";
import { Notification } from "../components/notifications/NotificationItem";

export function NotificationsList() {
  const navigate = useNavigate();
  const { userID } = useProfile();
  const { language } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<
    Notification[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!userID) return;
    fetchNotifications();
  }, [userID]);

  useEffect(() => {
    applyFilters();
  }, [notifications, filter, typeFilter, searchQuery]);

  const fetchNotifications = async () => {
    if (!userID) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userID)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...notifications];

    // Apply read/unread filter
    if (filter === "unread") {
      filtered = filtered.filter((n) => !n.read);
    } else if (filter === "read") {
      filtered = filtered.filter((n) => n.read);
    }

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((n) => n.type === typeFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.message.toLowerCase().includes(query) ||
          (n.data?.survey_name &&
            n.data.survey_name.toLowerCase().includes(query))
      );
    }

    setFilteredNotifications(filtered);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)
        .eq("user_id", userID);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .in("id", unreadIds)
        .eq("user_id", userID);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

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

  const getNotificationBgColor = (
    type: Notification["type"],
    read: boolean
  ) => {
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <Layout hideSidebar>
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading notifications...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-gray-700" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              <Text tid="navigation.notifications" />
            </h1>
            <p className="text-gray-600">
              {unreadCount > 0 ? (
                `${unreadCount} ${getTranslation(
                  unreadCount === 1
                    ? ("notifications.list.unreadNotification" as any)
                    : ("notifications.list.unreadNotifications" as any),
                  language as any
                )}`
              ) : (
                <Text tid="notifications.list.allCaughtUp" />
              )}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Text tid="notifications.list.markAllRead" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={getTranslation(
                  "notifications.list.searchPlaceholder" as any,
                  language as any
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Read/Unread Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">
                <Text tid="notifications.list.filterAll" />
              </option>
              <option value="unread">
                <Text tid="notifications.list.filterUnread" />
              </option>
              <option value="read">
                <Text tid="notifications.list.filterRead" />
              </option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">
                <Text tid="notifications.list.typeAll" />
              </option>
              <option value="survey_live">
                <Text tid="notifications.list.typeSurvey" /> Live
              </option>
              <option value="survey_invalid">
                <Text tid="notifications.list.typeSurvey" /> Issues
              </option>
              <option value="credit_refund">
                <Text tid="notifications.list.typeCredit" /> Refunds
              </option>
              <option value="payment_required">
                <Text tid="notifications.list.typePayment" /> Required
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              <Text tid="notifications.noNotifications" />
            </h3>
            <p className="text-gray-600">
              {notifications.length === 0
                ? "You don't have any notifications yet."
                : "No notifications match your current filters."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => {
                if (!notification.read) {
                  markAsRead(notification.id);
                }
                navigate(`/notifications/${notification.id}`);
              }}
              className={`${getNotificationBgColor(
                notification.type,
                notification.read
              )} 
                  border border-gray-200 rounded-lg p-4 cursor-pointer transition-colors`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3
                        className={`text-base font-medium ${
                          notification.read ? "text-gray-700" : "text-gray-900"
                        }`}
                      >
                        {translateNotificationTitle(
                          notification.type,
                          notification.title,
                          language
                        )}
                      </h3>
                      <p
                        className={`mt-1 text-sm line-clamp-2 ${
                          notification.read ? "text-gray-500" : "text-gray-700"
                        }`}
                      >
                        {translateNotificationMessage(
                          notification.type,
                          notification.message,
                          notification.data as NotificationData,
                          language
                        )}
                      </p>
                      {notification.data?.survey_name && (
                        <p className="mt-1 text-xs text-blue-600 font-medium">
                          <Text tid="notifications.list.survey" />:{" "}
                          {notification.data.survey_name}
                        </p>
                      )}
                    </div>

                    <div className="flex-shrink-0 ml-4 text-right">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(notification.created_at, language)}
                        </span>
                      </div>
                      {!notification.read && (
                        <div className="mt-1">
                          <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More (if needed) */}
      {filteredNotifications.length > 0 &&
        filteredNotifications.length === notifications.length &&
        notifications.length >= 50 && (
          <div className="text-center mt-8">
            <button
              onClick={() => {
                /* Implement load more */
              }}
              className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Load More Notifications
            </button>
          </div>
        )}
    </div>
  );
}

export default NotificationsList;
