import React, { useState } from "react";
import { X, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import { Text } from "../language/Text";

interface ForgotPasswordProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ForgotPasswordComponent({
  isOpen,
  onClose,
}: ForgotPasswordProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess("A password reset link has been sent to your email.");
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
        <div className="absolute right-4 top-4">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-8">
          <h2 className="mb-6 text-2xl font-bold text-center text-[#020B2C]">
            <Text tid="forgotPassword.title" />
          </h2>

          <p className="text-sm text-gray-600 text-center mb-6">
            <Text tid="forgotPassword.subtitle" />
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-md">
                <CheckCircle2 className="h-4 w-4" />
                <Text tid="forgotPassword.success" />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Text tid="forgotPassword.emailLabel" />
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="px-4 py-2 block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-[#020B2C] focus:ring-[#020B2C] sm:text-sm"
                  placeholder="example@example.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#020B2C] hover:bg-[#020B2C]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#020B2C]"
            >
              {loading ? (
                <Text tid="forgotPassword.sending" />
              ) : (
                <Text tid="forgotPassword.sendLink" />
              )}
            </button>

            <div className="text-center text-sm text-gray-500">
              <Text tid="forgotPassword.remembered" />{" "}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate("/login");
                }}
                className="text-[#020B2C] hover:text-[#020B2C]/80 font-medium"
              >
                <Text tid="forgotPassword.backToLogin" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
