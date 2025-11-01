import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { format, Locale } from "date-fns";
import { useLanguage } from "../context/LanguageContext";
import { getTranslation } from "../i18n";
import { useProfile } from "../context/ProfileContext";
import { enUS, id, ja, zhCN } from "date-fns/locale";
import { Text } from "../components/language/Text";

interface Withdrawal {
  id: string;
  source_amount: number;
  target_currency: string;
  status: string;
  created_at: string;
  transfer_id?: string | null;
  wise_quote_id?: string | null;
  wise_recipient_id?: string | null;
}

const locales: Record<string, Locale> = { en: enUS, id, ja, zh: zhCN };

export default function WithdrawalsListPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const { userID } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userID) return;

    const fetchWithdrawals = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("user_id", userID)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch withdrawals:", error.message);
      } else {
        setWithdrawals(data || []);
      }

      setLoading(false);
    };

    fetchWithdrawals();
  }, [userID]);

  const getStatusBadge = (status: string) => {
    const base = "px-3 py-1 rounded-full text-xs font-semibold";
    switch (status) {
      case "success":
        return (
          <span className={`${base} bg-green-100 text-green-800`}>
            ✅ Success
          </span>
        );
      case "pending":
        return (
          <span className={`${base} bg-yellow-100 text-yellow-800`}>
            🕓 Pending
          </span>
        );
      case "failed":
        return (
          <span className={`${base} bg-red-100 text-red-800`}>❌ Failed</span>
        );
      default:
        return (
          <span className={`${base} bg-gray-100 text-gray-600`}>{status}</span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">
            {getTranslation("withdraw.history.title", language) ||
              "Withdrawal History"}
          </h1>
          <button
            onClick={() => navigate("/withdraw")}
            className="bg-blue-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-700 transition"
          >
            +{" "}
            {getTranslation("withdraw.history.newWithdrawal", language) ||
              "New Withdrawal"}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-500">
            {getTranslation("withdraw.history.loading", language) ||
              "Loading your withdrawals..."}
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="text-center py-10 text-gray-600">
            {getTranslation("withdraw.history.empty", language) ||
              "No withdrawals found. Start your first one!"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">
                    <Text tid="withdrawal_list.date" />
                  </th>
                  <th className="px-4 py-2 text-left">
                    <Text tid="withdrawal_list.credit_amount" />
                  </th>
                  <th className="px-4 py-2 text-left">
                    <Text tid="withdrawal_list.currency" />
                  </th>
                  <th className="px-4 py-2 text-left">
                    <Text tid="withdrawal_list.status" />
                  </th>
                  <th className="px-4 py-2 text-left">
                    <Text tid="withdrawal_list.transfer_id" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700">
                      {format(new Date(w.created_at), "PPP p", {
                        locale: locales[language],
                      })}
                    </td>
                    <td className="px-4 py-2 font-semibold">
                      {w.source_amount}
                    </td>
                    <td className="px-4 py-2">{w.target_currency}</td>
                    <td className="px-4 py-2">{getStatusBadge(w.status)}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">
                      {w.transfer_id || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
