import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Text } from "../language/Text";
import { useLanguage } from "../../context/LanguageContext";
import { getTranslation } from "../../i18n";

interface User {
    id: string;
    name: string | null;
    email: string | null;
}

export default function FeaturedCreatorsSettings() {
    const [featuredCreators, setFeaturedCreators] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searching, setSearching] = useState(false);
    const { language } = useLanguage();

    // Load current featured creators
    useEffect(() => {
        loadFeaturedCreators();
    }, []);

    const loadFeaturedCreators = async () => {
        try {
            setLoading(true);

            // Get featured creator IDs from app_config
            const { data: configData, error: configError } = await supabase
                .from("app_config")
                .select("value")
                .eq("key", "featured_survey_creators")
                .single();

            if (configError) throw configError;

            const creatorIds = (configData?.value as string[]) || [];

            if (creatorIds.length === 0) {
                setFeaturedCreators([]);
                return;
            }

            // Get user details for featured creators
            const { data: usersData, error: usersError } = await supabase
                .from("profiles")
                .select("id, name, email")
                .in("id", creatorIds);

            if (usersError) throw usersError;

            setFeaturedCreators(usersData || []);
        } catch (error) {
            console.error("Error loading featured creators:", error);
        } finally {
            setLoading(false);
        }
    };

    const searchUsers = async () => {
        if (!searchTerm.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            setSearching(true);
            const { data, error } = await supabase
                .from("profiles")
                .select("id, name, email")
                .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
                .limit(10);

            if (error) throw error;

            // Filter out already featured creators
            const filteredResults = (data || []).filter(
                (user) => !featuredCreators.some((fc) => fc.id === user.id)
            );

            setSearchResults(filteredResults);
        } catch (error) {
            console.error("Error searching users:", error);
        } finally {
            setSearching(false);
        }
    };

    const addFeaturedCreator = async (user: User) => {
        try {
            const updatedCreators = [...featuredCreators, user];
            await saveFeaturedCreators(updatedCreators);
            setFeaturedCreators(updatedCreators);
            setSearchResults(searchResults.filter((u) => u.id !== user.id));
        } catch (error) {
            console.error("Error adding featured creator:", error);
            alert(getTranslation("admin.settings.save_error", language));
        }
    };

    const removeFeaturedCreator = async (userId: string) => {
        try {
            const updatedCreators = featuredCreators.filter((fc) => fc.id !== userId);
            await saveFeaturedCreators(updatedCreators);
            setFeaturedCreators(updatedCreators);
        } catch (error) {
            console.error("Error removing featured creator:", error);
            alert(getTranslation("admin.settings.save_error", language));
        }
    };

    const saveFeaturedCreators = async (creators: User[]) => {
        try {
            setSaving(true);
            const creatorIds = creators.map((c) => c.id);

            console.log("Saving featured creators:", creatorIds);

            // Update app_config - pass array directly for JSONB column
            const { data, error: updateError } = await supabase
                .from("app_config")
                .update({ value: creatorIds })
                .eq("key", "featured_survey_creators")
                .select();

            if (updateError) {
                console.error("Update error:", updateError);
                throw updateError;
            }

            console.log("Update successful:", data);

            // Refresh materialized view
            const { error: refreshError } = await supabase.rpc(
                "refresh_survey_summary_mv_manual"
            );

            if (refreshError) {
                console.warn("Failed to refresh materialized view:", refreshError);
            } else {
                console.log("Materialized view refreshed successfully");
            }
        } catch (error) {
            console.error("Error saving featured creators:", error);
            throw error;
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        const delaySearch = setTimeout(() => {
            searchUsers();
        }, 300);

        return () => clearTimeout(delaySearch);
    }, [searchTerm, featuredCreators]);

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    <Text tid="admin.settings.featured_creators" />
                </h2>
                <p className="text-gray-600">
                    <Text tid="admin.settings.featured_creators_desc" />
                </p>
            </div>

            {/* Current Featured Creators */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    <Text tid="admin.settings.current_featured" /> ({featuredCreators.length})
                </h3>
                {featuredCreators.length === 0 ? (
                    <p className="text-gray-500 italic">
                        <Text tid="admin.settings.no_featured" />
                    </p>
                ) : (
                    <div className="space-y-2">
                        {featuredCreators.map((creator) => (
                            <div
                                key={creator.id}
                                className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-full">
                                        <svg
                                            className="w-3 h-3"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                        <Text tid="surveyTable.featured" />
                                    </span>
                                    <div>
                                        <p className="font-medium text-gray-800">
                                            {creator.name || getTranslation("admin.settings.no_name", language)}
                                        </p>
                                        <p className="text-sm text-gray-500">{creator.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFeaturedCreator(creator.id)}
                                    disabled={saving}
                                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                                >
                                    <Text tid="admin.settings.remove" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Search and Add */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    <Text tid="admin.settings.add_creator" />
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Text tid="admin.settings.search_users" />
                        </label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={getTranslation("admin.settings.search_placeholder", language)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    {searching && (
                        <div className="flex justify-center p-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                        </div>
                    )}

                    {!searching && searchResults.length > 0 && (
                        <div className="space-y-2">
                            {searchResults.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                                >
                                    <div>
                                        <p className="font-medium text-gray-800">
                                            {user.name || getTranslation("admin.settings.no_name", language)}
                                        </p>
                                        <p className="text-sm text-gray-500">{user.email}</p>
                                    </div>
                                    <button
                                        onClick={() => addFeaturedCreator(user)}
                                        disabled={saving}
                                        className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition disabled:opacity-50"
                                    >
                                        <Text tid="admin.settings.add" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {!searching && searchTerm && searchResults.length === 0 && (
                        <p className="text-gray-500 italic text-center p-4">
                            <Text tid="admin.settings.no_results" /> "{searchTerm}"
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
