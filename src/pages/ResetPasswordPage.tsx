import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import PublicNavbar from "../components/navigation/PublicNavbar";
import { Text } from "../components/language/Text";
import { useLanguage } from "../context/LanguageContext";
import { getTranslation } from "../i18n";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { language } = useLanguage();

  useEffect(() => {
    // When user lands with token, Supabase automatically sets session
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      // Supabase handles setting the session automatically.
      // You don't need to manually parse the token.
      console.log("Password recovery session active");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!password || !confirmPassword) {
      setError(getTranslation("resetPassword.fillAllFields", language));
      return;
    }
    if (password !== confirmPassword) {
      setError(getTranslation("resetPassword.passwordsDoNotMatch", language));
      return;
    }

    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setMessage(getTranslation("resetPassword.success", language));
      setTimeout(() => navigate("/login"), 2000);
    }
  };

  return (
    <>
      <PublicNavbar />
      <div className="flex min-h-screen items-center justify-center pt-24">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-center text-[#020B2C] mb-6">
            <Text tid="resetPassword.setNewPassword" />
          </h2>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-3 rounded-md mb-3">
              {error}
            </p>
          )}
          {message && (
            <p className="text-green-600 text-sm bg-green-50 p-3 rounded-md mb-3">
              {message}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Text tid="resetPassword.newPassword" />
              </label>
              <input
                type="password"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#020B2C] focus:ring-[#020B2C]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Text tid="resetPassword.confirmPassword" />
              </label>
              <input
                type="password"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#020B2C] focus:ring-[#020B2C]"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-[#020B2C] text-white font-medium py-2 hover:bg-[#020B2C]/90"
            >
              <Text tid="resetPassword.resetPassword" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
