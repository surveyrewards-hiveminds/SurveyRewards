import React, { useEffect, useState } from "react";
import { FileQuestion, TrendingUp } from "lucide-react";
import { useProfile } from "../../context/ProfileContext";
import { supabase } from "../../lib/supabase";
import { StatCard } from "./StatCard";
import { getTranslation } from "../../i18n";
import { useLanguage } from "../../context/LanguageContext";
import { Text } from "../language/Text";

function getPrevMonthYear(month: number, year: number) {
  if (month === 1) return { prevMonth: 12, prevYear: year - 1 };
  return { prevMonth: month - 1, prevYear: year };
}

interface DashboardStats {
  thisMonthAnswered: number;
  prevMonthAnswered: number;
  thisMonthEarning: number;
  prevMonthEarning: number;
  allTimeAnswered: number;
  allTimeEarning: number;
  loading: boolean;
}

export default function AnswerStatistics() {
  const [stats, setStats] = useState<DashboardStats>({
    thisMonthAnswered: 0,
    prevMonthAnswered: 0,
    thisMonthEarning: 0,
    prevMonthEarning: 0,
    allTimeAnswered: 0,
    allTimeEarning: 0,
    loading: true,
  });
  const { userID, loading: profileLoading } = useProfile();
  const { language } = useLanguage();

  useEffect(() => {
    const now = new Date();
    const month = now.getMonth() + 1; // JS months are 0-based
    const year = now.getFullYear();
    const { prevMonth, prevYear } = getPrevMonthYear(month, year);

    async function fetchStats() {
      setStats((s) => ({ ...s, loading: true }));

      const [
        { data: thisMonthAnswered },
        { data: prevMonthAnswered },
        { data: thisMonthEarning },
        { data: prevMonthEarning },
        { data: allTimeAnswered },
        { data: allTimeEarning },
      ] = await Promise.all([
        supabase.rpc("stat_total_survey_answered", {
          in_user_id: userID,
          in_month: month,
          in_year: year,
        }),
        supabase.rpc("stat_total_survey_answered", {
          in_user_id: userID,
          in_month: prevMonth,
          in_year: prevYear,
        }),
        supabase.rpc("stat_total_earning", {
          in_user_id: userID,
          in_month: month,
          in_year: year,
        }),
        supabase.rpc("stat_total_earning", {
          in_user_id: userID,
          in_month: prevMonth,
          in_year: prevYear,
        }),
        supabase.rpc("stat_total_survey_answered", {
          in_user_id: userID,
          in_month: null,
          in_year: null,
        }),
        supabase.rpc("stat_total_earning", {
          in_user_id: userID,
          in_month: null,
          in_year: null,
        }),
      ]);

      setStats({
        thisMonthAnswered: thisMonthAnswered ?? 0,
        prevMonthAnswered: prevMonthAnswered ?? 0,
        thisMonthEarning: Number(thisMonthEarning ?? 0),
        prevMonthEarning: Number(prevMonthEarning ?? 0),
        allTimeAnswered: allTimeAnswered ?? 0,
        allTimeEarning: Number(allTimeEarning ?? 0),
        loading: false,
      });
    }

    if (userID) fetchStats();
  }, [userID]);

  function getDiff(current: number, prev: number) {
    const diff = current - prev;
    const percent =
      prev === 0 ? (current === 0 ? 0 : 100) : (diff / prev) * 100;
    return { diff, percent };
  }

  const answeredDiff = getDiff(
    stats.thisMonthAnswered,
    stats.prevMonthAnswered
  );
  const earningDiff = getDiff(stats.thisMonthEarning, stats.prevMonthEarning);

  if (profileLoading) {
    return (
      <div>
        <Text tid="loading.loading" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard
        title={`${getTranslation(
          "statistics.surveyAnswered",
          language
        )} (${getTranslation("statistics.thisMonth", language)})`}
        value={stats.thisMonthAnswered}
        diff={answeredDiff}
        loading={stats.loading}
        icon={FileQuestion}
      />
      <StatCard
        title={`${getTranslation(
          "statistics.rewardGained",
          language
        )} (${getTranslation("statistics.thisMonth", language)})`}
        value={stats.thisMonthEarning}
        diff={earningDiff}
        loading={stats.loading}
        isCurrency
        icon={TrendingUp}
      />
      <StatCard
        title={`${getTranslation(
          "statistics.surveyAnswered",
          language
        )} (${getTranslation("statistics.allTime", language)})`}
        value={stats.allTimeAnswered}
        loading={stats.loading}
        icon={FileQuestion}
      />
      <StatCard
        title={`${getTranslation(
          "statistics.rewardGained",
          language
        )} (${getTranslation("statistics.allTime", language)})`}
        value={stats.allTimeEarning}
        loading={stats.loading}
        isCurrency
        icon={TrendingUp}
      />
    </div>
  );
}
