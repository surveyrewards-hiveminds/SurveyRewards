import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useProfile } from "../context/ProfileContext";

export interface Notification {
  id: string;
  user_id: string;
  survey_id?: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export function useNotifications() {
  const { userID } = useProfile();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!userID) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userID)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.read).length || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)
        .eq("user_id", userID);

      if (error) throw error;

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!userID || unreadCount === 0) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userID)
        .eq("read", false);

      if (error) throw error;

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Create a new notification (for testing purposes)
  const createNotification = async (
    type: Notification["type"],
    title: string,
    message: string,
    surveyId?: string,
    data?: any
  ) => {
    if (!userID) return;

    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: userID,
        survey_id: surveyId,
        type,
        title,
        message,
        data,
      });

      if (error) throw error;

      // Refresh notifications
      fetchNotifications();
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  };

  // Fetch notifications on mount and when userID changes
  useEffect(() => {
    fetchNotifications();
  }, [userID]);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!userID) return;

    const channel = supabase
      .channel(`notifications-hook-${userID}`) // Unique channel name for hook
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userID}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userID]);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    createNotification,
  };
}
