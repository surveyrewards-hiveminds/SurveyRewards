import { useState } from "react";
import { ModularTable, TableColumn } from "../ModularTable";
import { useAdminUsers, UserWithCounts } from "../../hooks/useAdminUsers";
import { useLanguage } from "../../context/LanguageContext";
import { countryTranslations } from "../../data/countries";
import { Text } from "../language/Text";
import { getTranslation } from "../../i18n";

const USER_PAGE_SIZE = 10;

export default function UserTable() {
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [userPage, setUserPage] = useState(1);
    const { language } = useLanguage();

    const getCountryName = (countryCode: string | null) => {
        if (!countryCode || !language) return countryCode;
        return (
            countryTranslations[countryCode]?.[
            language as keyof (typeof countryTranslations)[string]
            ] || countryCode
        );
    };

    const {
        users,
        total: usersTotal,
        loading: usersLoading,
    } = useAdminUsers(userPage, USER_PAGE_SIZE);

    const userColumns: TableColumn<UserWithCounts>[] = [
        { key: "id", label: getTranslation("admin.users.id", language) },
        { key: "name", label: getTranslation("admin.users.name", language) },
        { key: "email", label: getTranslation("admin.users.email", language) },
        {
            key: "surveyCreated",
            label: getTranslation("admin.users.surveys_created", language),
        },
        {
            key: "surveyResponded",
            label: getTranslation("admin.users.surveys_responded", language),
        },
    ];

    return (
        <div className="w-full mx-auto">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
                <Text tid="admin.users.user_list" />
            </h3>

            <div className="relative bg-white overflow-hidden">
                {/* Loading Overlay */}
                {usersLoading && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                        <div className="flex flex-col items-center">
                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm text-gray-500 mt-2">
                                <Text tid="admin.users.loading" />
                            </p>
                        </div>
                    </div>
                )}

                <ModularTable
                    columns={userColumns}
                    data={users}
                    page={userPage}
                    pageSize={USER_PAGE_SIZE}
                    total={usersTotal}
                    onPageChange={setUserPage}
                    actions={(user: UserWithCounts) => (
                        <button
                            className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition"
                            onClick={() => {
                                setSelectedUser(user.id);
                                setShowUserModal(true);
                            }}
                        >
                            <Text tid="admin.users.view_detail" />
                        </button>
                    )}
                />
            </div>

            {/* User Detail Modal */}
            {showUserModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    onClick={() => {
                        setShowUserModal(false);
                        setSelectedUser(null);
                    }}
                >
                    <div
                        className="relative w-[90%] sm:max-w-md md:max-w-lg max-h-[80vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-8 transition-transform duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-lg font-bold"
                            onClick={() => {
                                setShowUserModal(false);
                                setSelectedUser(null);
                            }}
                        >
                            ×
                        </button>

                        <h4 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            👤 <Text tid="admin.users.user_detail" />
                        </h4>

                        {(() => {
                            const user = users.find((u) => u.id === selectedUser);
                            if (!user)
                                return (
                                    <div className="text-gray-500 italic">
                                        <Text tid="admin.users.user_not_found" />
                                    </div>
                                );

                            return (
                                <div className="flex flex-col gap-6">
                                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                                        <h2 className="text-base font-semibold text-gray-700 mb-3">
                                            🧬 <Text tid="admin.users.biodata" />
                                        </h2>
                                        <div className="space-y-1.5 text-gray-800 text-sm sm:text-base">
                                            <div>
                                                <strong>
                                                    <Text tid="admin.users.id" />:
                                                </strong>{" "}
                                                {user.id}
                                            </div>
                                            <div>
                                                <strong>
                                                    <Text tid="admin.users.name" />:
                                                </strong>{" "}
                                                {user.name}
                                            </div>
                                            <div>
                                                <strong>
                                                    <Text tid="admin.users.email" />:
                                                </strong>{" "}
                                                {user.email || "-"}
                                            </div>
                                            <div>
                                                <strong>
                                                    <Text tid="admin.users.country_of_residence" />:
                                                </strong>{" "}
                                                {getCountryName(user.country_of_residence)}
                                            </div>
                                            <div>
                                                <strong>
                                                    <Text tid="admin.users.birth_date" />:
                                                </strong>{" "}
                                                {user.birth_date || "-"}
                                            </div>
                                            <div>
                                                <strong>
                                                    <Text tid="admin.users.country_of_birth" />:
                                                </strong>{" "}
                                                {getCountryName(user.country_of_birth)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                                        <h2 className="text-base font-semibold text-gray-700 mb-3">
                                            💼 <Text tid="admin.users.employment_section" />
                                        </h2>
                                        <div className="space-y-1.5 text-gray-800 text-sm sm:text-base">
                                            <div>
                                                <strong>
                                                    <Text tid="admin.users.employment" />:
                                                </strong>{" "}
                                                {user.employment || "-"}
                                            </div>
                                            <div>
                                                <strong>
                                                    <Text tid="admin.users.business_category" />:
                                                </strong>{" "}
                                                {user.business_category || "-"}
                                            </div>
                                            <div>
                                                <strong>
                                                    <Text tid="admin.users.company_name" />:
                                                </strong>{" "}
                                                {user.company_name || "-"}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                                        <h2 className="text-base font-semibold text-gray-700 mb-3">
                                            📝 <Text tid="admin.users.surveys" />
                                        </h2>
                                        <div className="space-y-1.5 text-gray-800 text-sm sm:text-base">
                                            <div>
                                                <strong>
                                                    <Text tid="admin.users.surveys_created" />:
                                                </strong>{" "}
                                                {user.surveyCreated}
                                            </div>
                                            <div>
                                                <strong>
                                                    <Text tid="admin.users.surveys_responded" />:
                                                </strong>{" "}
                                                {user.surveyResponded}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}
