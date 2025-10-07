import { useState, useEffect, useMemo } from "react";
import { useProfile } from "../../context/ProfileContext";
import { useLanguage } from "../../context/LanguageContext";
import { getTranslation } from "../../i18n";
import { supabase } from "../../lib/supabase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { FileText, CreditCard, TrendingUp, Calendar } from "lucide-react";

interface CreatorStats {
  surveysCreatedThisMonth: number;
  creditsSpentThisMonth: number;
  totalSurveys: number;
  totalCreditsSpent: number;
  monthlyData: Array<{
    month: string;
    surveys: number;
    credits: number;
  }>;
  statusCounts: Record<string, number>; // Raw status counts without translation
}

export function CreatorAnalytics() {
  const { userID } = useProfile();
  const { language } = useLanguage();
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userID) {
      fetchCreatorStats();
    }
  }, [userID]); // Remove language dependency since we'll handle translation separately

  // Memoized status distribution that updates only when language or statusCounts change
  const statusDistribution = useMemo(() => {
    if (!stats?.statusCounts) return [];

    const statusColors = {
      draft: "#94a3b8",
      "waiting-for-live": "#f59e0b",
      live: "#10b981",
      finished: "#3b82f6",
      canceled: "#ef4444",
    };

    return Object.entries(stats.statusCounts).map(([status, count]) => {
      const statusKey = `dashboard.creator.status.${status}`;
      const translatedName = getTranslation(statusKey as any, language);
      return {
        name: translatedName,
        value: count,
        color: statusColors[status as keyof typeof statusColors] || "#6b7280",
      };
    });
  }, [stats?.statusCounts, language]);

  const fetchCreatorStats = async () => {
    if (!userID) return;

    try {
      setLoading(true);

      // Get current month boundaries
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      // Fetch surveys created this month
      const { data: thisMonthSurveys, error: surveysError } = await supabase
        .from("surveys")
        .select("id, status, payment_amount, created_at")
        .eq("creator_id", userID)
        .gte("created_at", currentMonthStart.toISOString())
        .lt("created_at", nextMonthStart.toISOString());

      if (surveysError) throw surveysError;

      // Fetch all surveys for total count
      const { data: allSurveys, error: allSurveysError } = await supabase
        .from("surveys")
        .select("id, status, payment_amount, created_at")
        .eq("creator_id", userID);

      if (allSurveysError) throw allSurveysError;

      // Fetch credit transactions for spending
      const { data: thisMonthTransactions, error: transactionsError } =
        await supabase
          .from("credit_transactions")
          .select("credit_amount, created_at, transaction_type")
          .eq("user_id", userID)
          .in("transaction_type", ["survey_payment", "translation_fee"])
          .gte("created_at", currentMonthStart.toISOString())
          .lt("created_at", nextMonthStart.toISOString());

      if (transactionsError) throw transactionsError;

      // Fetch all spending transactions
      const { data: allTransactions, error: allTransactionsError } =
        await supabase
          .from("credit_transactions")
          .select("credit_amount, created_at, transaction_type")
          .eq("user_id", userID)
          .in("transaction_type", ["survey_payment", "translation_fee"]);

      if (allTransactionsError) throw allTransactionsError;

      // Calculate stats
      const surveysCreatedThisMonth = thisMonthSurveys?.length || 0;
      const creditsSpentThisMonth =
        thisMonthTransactions?.reduce(
          (sum, t) => sum + Math.abs(t.credit_amount),
          0
        ) || 0;
      const totalSurveys = allSurveys?.length || 0;
      const totalCreditsSpent =
        allTransactions?.reduce(
          (sum, t) => sum + Math.abs(t.credit_amount),
          0
        ) || 0;

      // Generate monthly data for the last 6 months
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

        const monthSurveys =
          allSurveys?.filter((s) => {
            const createdAt = new Date(s.created_at);
            return createdAt >= monthStart && createdAt < monthEnd;
          }).length || 0;

        const monthCredits =
          allTransactions
            ?.filter((t) => {
              const createdAt = new Date(t.created_at);
              return createdAt >= monthStart && createdAt < monthEnd;
            })
            .reduce((sum, t) => sum + Math.abs(t.credit_amount), 0) || 0;

        monthlyData.push({
          month: monthStart.toLocaleDateString(
            language === "en"
              ? "en-US"
              : language === "ja"
              ? "ja-JP"
              : language === "cn"
              ? "zh-CN"
              : "id-ID",
            { month: "short" }
          ),
          surveys: monthSurveys,
          credits: monthCredits,
        });
      }

      // Status distribution - store raw counts
      const statusCounts =
        allSurveys?.reduce((acc, survey) => {
          acc[survey.status] = (acc[survey.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

      setStats({
        surveysCreatedThisMonth,
        creditsSpentThisMonth,
        totalSurveys,
        totalCreditsSpent,
        monthlyData,
        statusCounts, // Store raw counts instead of translated distribution
      });
    } catch (error) {
      console.error("Error fetching creator stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          {getTranslation("dashboard.creator.title", language)}
        </h2>
      </div>

      <div className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-600 font-medium">
                  {getTranslation(
                    "dashboard.creator.surveysThisMonth",
                    language
                  )}
                </p>
                <p className="text-2xl font-bold text-blue-700">
                  {stats.surveysCreatedThisMonth}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-purple-600 font-medium">
                  {getTranslation(
                    "dashboard.creator.creditsThisMonth",
                    language
                  )}
                </p>
                <p className="text-2xl font-bold text-purple-700">
                  {stats.creditsSpentThisMonth.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-green-600 font-medium">
                  {getTranslation("dashboard.creator.totalSurveys", language)}
                </p>
                <p className="text-2xl font-bold text-green-700">
                  {stats.totalSurveys}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-orange-600 font-medium">
                  {getTranslation("dashboard.creator.totalCredits", language)}
                </p>
                <p className="text-2xl font-bold text-orange-700">
                  {stats.totalCreditsSpent.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trend */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {getTranslation("dashboard.creator.monthlyTrend", language)}
            </h3>
            <div className="h-64">
              {stats.monthlyData.some((d) => d.surveys > 0 || d.credits > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthlyData} key={language}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) =>
                        `${getTranslation(
                          "dashboard.month",
                          language
                        )}: ${value}`
                      }
                      formatter={(value, name) => [
                        value,
                        name === "surveys"
                          ? getTranslation(
                              "dashboard.creator.surveys",
                              language
                            )
                          : getTranslation(
                              "dashboard.creator.credits",
                              language
                            ),
                      ]}
                    />
                    <Bar
                      dataKey="surveys"
                      fill="#3b82f6"
                      name="surveys"
                      radius={[2, 2, 0, 0]}
                    />
                    <Bar
                      dataKey="credits"
                      fill="#8b5cf6"
                      name="credits"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Status Distribution */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {getTranslation("dashboard.creator.statusDistribution", language)}
            </h3>
            <div className="h-64">
              {statusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart key={language}>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No surveys created yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
