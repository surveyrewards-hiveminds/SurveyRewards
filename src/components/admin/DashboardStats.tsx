
import { useAdminDashboardStats } from "../../hooks/useAdminDashboardStats";
import { useLanguage } from "../../context/LanguageContext";
import { countryTranslations } from "../../data/countries";
import { Text } from "../language/Text";

export default function DashboardStats() {
    const { stats, loading } = useAdminDashboardStats();
    const { language } = useLanguage();

    const getCountryName = (countryCode: string) => {
        if (countryCode === "Unknown") return countryCode;
        if (!language) return countryCode;
        return (
            countryTranslations[countryCode]?.[
            language as keyof (typeof countryTranslations)[string]
            ] || countryCode
        );
    };

    // Generate colors for pie chart
    const generateColors = (count: number) => {
        const colors = [
            "#4F46E5", // Indigo
            "#7C3AED", // Purple
            "#EC4899", // Pink
            "#F59E0B", // Amber
            "#10B981", // Emerald
            "#3B82F6", // Blue
            "#EF4444", // Red
            "#8B5CF6", // Violet
            "#14B8A6", // Teal
            "#F97316", // Orange
        ];
        return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
    };

    // Calculate pie chart segments
    const calculatePieSegments = () => {
        const colors = generateColors(stats.countryDistribution.length);
        let currentAngle = -90; // Start from top

        return stats.countryDistribution.map((country, index) => {
            const angle = (country.percentage / 100) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;

            return {
                ...country,
                color: colors[index],
                startAngle,
                endAngle,
            };
        });
    };

    const pieSegments = calculatePieSegments();

    // SVG pie chart helper
    const polarToCartesian = (
        centerX: number,
        centerY: number,
        radius: number,
        angleInDegrees: number
    ) => {
        const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
        return {
            x: centerX + radius * Math.cos(angleInRadians),
            y: centerY + radius * Math.sin(angleInRadians),
        };
    };

    const describeArc = (
        x: number,
        y: number,
        radius: number,
        startAngle: number,
        endAngle: number
    ) => {
        const start = polarToCartesian(x, y, radius, endAngle);
        const end = polarToCartesian(x, y, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

        return [
            "M",
            x,
            y,
            "L",
            start.x,
            start.y,
            "A",
            radius,
            radius,
            0,
            largeArcFlag,
            0,
            end.x,
            end.y,
            "Z",
        ].join(" ");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-500 mt-4">
                        <Text tid="admin.users.loading" />
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full mx-auto space-y-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
                <Text tid="admin.dashboard.title" />
            </h3>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-indigo-100 text-sm font-medium">
                                <Text tid="admin.dashboard.total_users" />
                            </p>
                            <p className="text-3xl font-bold mt-2">
                                {stats.totalUsers.toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-white/20 p-3 rounded-xl">
                            <svg
                                className="w-8 h-8"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-purple-100 text-sm font-medium">
                                <Text tid="admin.dashboard.total_surveys" />
                            </p>
                            <p className="text-3xl font-bold mt-2">
                                {stats.totalSurveys.toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-white/20 p-3 rounded-xl">
                            <svg
                                className="w-8 h-8"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-pink-100 text-sm font-medium">
                                <Text tid="admin.dashboard.total_responses" />
                            </p>
                            <p className="text-3xl font-bold mt-2">
                                {stats.totalResponses.toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-white/20 p-3 rounded-xl">
                            <svg
                                className="w-8 h-8"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                                />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Country Distribution Pie Chart */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h4 className="text-xl font-bold text-gray-800 mb-6">
                    <Text tid="admin.dashboard.country_distribution" />
                </h4>

                {stats.countryDistribution.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Text tid="admin.dashboard.no_data" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                        {/* Pie Chart */}
                        <div className="flex justify-center">
                            <div className="relative">
                                <svg width="300" height="300" viewBox="0 0 300 300">
                                    {pieSegments.map((segment, index) => (
                                        <g key={index}>
                                            <path
                                                d={describeArc(150, 150, 120, segment.startAngle, segment.endAngle)}
                                                fill={segment.color}
                                                stroke="white"
                                                strokeWidth="2"
                                                className="transition-all hover:opacity-80 cursor-pointer"
                                            />
                                        </g>
                                    ))}
                                    {/* Center circle for donut effect */}
                                    <circle cx="150" cy="150" r="60" fill="white" />
                                    <text
                                        x="150"
                                        y="145"
                                        textAnchor="middle"
                                        className="text-2xl font-bold fill-gray-800"
                                    >
                                        {stats.totalUsers}
                                    </text>
                                    <text
                                        x="150"
                                        y="165"
                                        textAnchor="middle"
                                        className="text-sm fill-gray-500"
                                    >
                                        Users
                                    </text>
                                </svg>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                            {pieSegments.map((segment, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <div
                                            className="w-4 h-4 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: segment.color }}
                                        ></div>
                                        <span className="text-sm font-medium text-gray-700 truncate">
                                            {getCountryName(segment.country)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 flex-shrink-0">
                                        <span className="text-sm text-gray-600">
                                            {segment.count.toLocaleString()}
                                        </span>
                                        <span className="text-sm font-semibold text-gray-800 min-w-[50px] text-right">
                                            {segment.percentage.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Additional Stats - Top Countries */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h4 className="text-xl font-bold text-gray-800 mb-6">
                    <Text tid="admin.dashboard.top_countries" />
                </h4>
                <div className="space-y-4">
                    {stats.countryDistribution.slice(0, 5).map((country, index) => (
                        <div key={index} className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-sm">
                                {index + 1}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-700">
                                        {getCountryName(country.country)}
                                    </span>
                                    <span className="text-sm text-gray-600">
                                        {country.count.toLocaleString()} users ({country.percentage.toFixed(1)}%)
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all"
                                        style={{ width: `${country.percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
