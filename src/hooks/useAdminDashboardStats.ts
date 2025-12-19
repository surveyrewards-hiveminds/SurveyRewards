import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type CountryStats = {
    country: string;
    count: number;
    percentage: number;
};

export type DashboardStats = {
    totalUsers: number;
    totalSurveys: number;
    totalResponses: number;
    countryDistribution: CountryStats[];
};

export function useAdminDashboardStats() {
    const [stats, setStats] = useState<DashboardStats>({
        totalUsers: 0,
        totalSurveys: 0,
        totalResponses: 0,
        countryDistribution: [],
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchDashboardStats() {
            setLoading(true);

            try {
                // Fetch total users
                const { count: totalUsers } = await supabase
                    .from("profiles")
                    .select("*", { count: "exact", head: true });

                // Fetch total surveys
                const { count: totalSurveys } = await supabase
                    .from("surveys")
                    .select("*", { count: "exact", head: true });

                // Fetch total responses
                const { count: totalResponses } = await supabase
                    .from("survey_responses")
                    .select("*", { count: "exact", head: true });

                // Fetch country distribution
                const { data: profiles } = await supabase
                    .from("profiles")
                    .select("country_of_residence");

                // Calculate country distribution
                const countryMap: Record<string, number> = {};
                let total = 0;

                if (profiles) {
                    profiles.forEach((profile) => {
                        const country = profile.country_of_residence || "Unknown";
                        countryMap[country] = (countryMap[country] || 0) + 1;
                        total++;
                    });
                }

                // Convert to array and calculate percentages
                const countryDistribution: CountryStats[] = Object.entries(countryMap)
                    .map(([country, count]) => ({
                        country,
                        count,
                        percentage: total > 0 ? (count / total) * 100 : 0,
                    }))
                    .sort((a, b) => b.count - a.count);

                setStats({
                    totalUsers: totalUsers || 0,
                    totalSurveys: totalSurveys || 0,
                    totalResponses: totalResponses || 0,
                    countryDistribution,
                });
            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchDashboardStats();
    }, []);

    return { stats, loading };
}
