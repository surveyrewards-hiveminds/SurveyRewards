import { useState, useEffect, useCallback, useMemo } from "react";
import { useProfile } from "../../context/ProfileContext";
import { useLanguage } from "../../context/LanguageContext";
import { getTranslation } from "../../i18n";
import { supabase } from "../../lib/supabase";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Award, DollarSign, Target, Calendar } from "lucide-react";
import { getTranslatedSurveyName } from "../../utils/surveyTranslation";

interface ParticipantStats {
  surveysAnsweredThisMonth: number;
  creditsEarnedThisMonth: number;
  totalSurveysAnswered: number;
  totalCreditsEarned: number;
  monthlyData: Array<{
    month: string;
    surveys: number;
    credits: number;
  }>;
  recentSurveys: Array<{
    surveyId: string; // Store survey ID instead of translated name
    creditsEarned: number;
    completedAt: string;
  }>;
  surveyData: Record<string, { name: string; title_translations?: any }>; // Store raw survey data
}

export function ParticipantAnalytics() {
  const { userID } = useProfile();
  const { language } = useLanguage();
  const [stats, setStats] = useState<ParticipantStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchParticipantStats = useCallback(async () => {
    if (!userID) return;

    try {
      setLoading(true);
      console.log("Fetching participant stats (data only)");

      // Get current month boundaries
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      // Fetch survey responses
      const { data: thisMonthResponses, error: responsesError } = await supabase
        .from("survey_responses")
        .select("id, reward_gained, submitted_at, survey_id")
        .eq("user_id", userID)
        .eq("status", "submitted")
        .gte("submitted_at", currentMonthStart.toISOString())
        .lt("submitted_at", nextMonthStart.toISOString());

      if (responsesError) throw responsesError;

      // Fetch all survey responses
      const { data: allResponses, error: allResponsesError } = await supabase
        .from("survey_responses")
        .select("id, reward_gained, submitted_at, survey_id")
        .eq("user_id", userID)
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false });

      if (allResponsesError) throw allResponsesError;

      // Fetch reward transactions for this month
      const { data: thisMonthRewards, error: rewardsError } = await supabase
        .from("credit_transactions")
        .select("credit_amount, created_at")
        .eq("user_id", userID)
        .eq("transaction_type", "reward")
        .gte("created_at", currentMonthStart.toISOString())
        .lt("created_at", nextMonthStart.toISOString());

      if (rewardsError) throw rewardsError;

      // Fetch all reward transactions
      const { data: allRewards, error: allRewardsError } = await supabase
        .from("credit_transactions")
        .select("credit_amount, created_at")
        .eq("user_id", userID)
        .eq("transaction_type", "reward");

      if (allRewardsError) throw allRewardsError;

      // Calculate stats
      const surveysAnsweredThisMonth = thisMonthResponses?.length || 0;
      const creditsEarnedThisMonth =
        thisMonthRewards?.reduce((sum, t) => sum + t.credit_amount, 0) || 0;
      const totalSurveysAnswered = allResponses?.length || 0;
      const totalCreditsEarned =
        allRewards?.reduce((sum, t) => sum + t.credit_amount, 0) || 0;

      // Generate monthly data for the last 6 months
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

        const monthSurveys =
          allResponses?.filter((r) => {
            const submittedAt = new Date(r.submitted_at);
            return submittedAt >= monthStart && submittedAt < monthEnd;
          }).length || 0;

        const monthCredits =
          allRewards
            ?.filter((t) => {
              const createdAt = new Date(t.created_at);
              return createdAt >= monthStart && createdAt < monthEnd;
            })
            .reduce((sum, t) => sum + t.credit_amount, 0) || 0;

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

      // Recent surveys (last 5) - store survey IDs and fetch survey data separately
      const recentResponses = allResponses?.slice(0, 5) || [];
      const surveyIds = [...new Set(recentResponses.map((r) => r.survey_id))];

      // Fetch survey names and translations for recent surveys
      const { data: surveys } = await supabase
        .from("surveys")
        .select("id, name, title_translations")
        .in("id", surveyIds);

      const surveyData =
        surveys?.reduce((acc, survey) => {
          acc[survey.id] = {
            name: survey.name,
            title_translations: survey.title_translations,
          };
          return acc;
        }, {} as Record<string, { name: string; title_translations?: any }>) ||
        {};

      const recentSurveys = recentResponses.map((response) => ({
        surveyId: response.survey_id, // Store survey ID instead of translated name
        creditsEarned: response.reward_gained || 0,
        completedAt: response.submitted_at,
      }));

      setStats({
        surveysAnsweredThisMonth,
        creditsEarnedThisMonth,
        totalSurveysAnswered,
        totalCreditsEarned,
        monthlyData,
        recentSurveys,
        surveyData, // Store raw survey data separately
      });
    } catch (error) {
      console.error("Error fetching participant stats:", error);
    } finally {
      setLoading(false);
    }
  }, [userID]); // Remove language dependency

  useEffect(() => {
    if (userID) {
      fetchParticipantStats();
    }
  }, [userID, fetchParticipantStats]); // Keep fetchParticipantStats but remove language dependency from callback

  // Memoized translated survey names that update only when language or surveyData change
  const translatedSurveyNames = useMemo(() => {
    if (!stats?.surveyData) return {};

    return Object.entries(stats.surveyData).reduce(
      (acc, [surveyId, surveyInfo]) => {
        acc[surveyId] = getTranslatedSurveyName(
          {
            id: surveyId,
            name: surveyInfo.name,
            title_translations: surveyInfo.title_translations,
          } as any,
          language
        );
        return acc;
      },
      {} as Record<string, string>
    );
  }, [stats?.surveyData, language]);

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
          <Award className="w-5 h-5 text-green-600" />
          {getTranslation("dashboard.participant.title", language)}
        </h2>
      </div>

      <div className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-green-600 font-medium">
                  {getTranslation(
                    "dashboard.participant.surveysThisMonth",
                    language
                  )}
                </p>
                <p className="text-2xl font-bold text-green-700">
                  {stats.surveysAnsweredThisMonth}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-600 font-medium">
                  {getTranslation(
                    "dashboard.participant.creditsThisMonth",
                    language
                  )}
                </p>
                <p className="text-2xl font-bold text-blue-700">
                  {stats.creditsEarnedThisMonth.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-purple-600 font-medium">
                  {getTranslation(
                    "dashboard.participant.totalSurveys",
                    language
                  )}
                </p>
                <p className="text-2xl font-bold text-purple-700">
                  {stats.totalSurveysAnswered}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-sm text-yellow-600 font-medium">
                  {getTranslation(
                    "dashboard.participant.totalCredits",
                    language
                  )}
                </p>
                <p className="text-2xl font-bold text-yellow-700">
                  {stats.totalCreditsEarned.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Trend */}
          <div className="lg:col-span-2">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {getTranslation(
                "dashboard.participant.monthlyActivity",
                language
              )}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.monthlyData} key={language}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) =>
                      `${getTranslation("dashboard.month", language)}: ${value}`
                    }
                    formatter={(value, name) => [
                      value,
                      name === "surveys"
                        ? getTranslation(
                            "dashboard.participant.surveys",
                            language
                          )
                        : getTranslation(
                            "dashboard.participant.credits",
                            language
                          ),
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="surveys"
                    stackId="1"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.6}
                    name="surveys"
                  />
                  <Area
                    type="monotone"
                    dataKey="credits"
                    stackId="2"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                    name="credits"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {getTranslation("dashboard.participant.recentActivity", language)}
            </h3>
            <div className="space-y-3">
              {stats.recentSurveys.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  {getTranslation("dashboard.participant.noActivity", language)}
                </p>
              ) : (
                stats.recentSurveys.map((survey, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {translatedSurveyNames[survey.surveyId] ||
                            "Unknown Survey"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(survey.completedAt).toLocaleDateString(
                            language === "en"
                              ? "en-US"
                              : language === "ja"
                              ? "ja-JP"
                              : language === "cn"
                              ? "zh-CN"
                              : "id-ID"
                          )}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-green-600">
                        +{survey.creditsEarned}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
