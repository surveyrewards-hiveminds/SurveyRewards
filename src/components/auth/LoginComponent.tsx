import React, { useState } from "react";
import { X, Mail, Lock, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import { Text } from "../language/Text";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Rename to LoginComponent
export function LoginComponent({ isOpen, onClose }: LoginModalProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    // Supabase login
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      return;
    }

    // On success, navigate to dashboard
    navigate("/dashboard");
  };

  const handleRegisterClick = () => {
    onClose();
    navigate("/register");
  };

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      {/* Removed Backdrop */}
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
            <Text tid="login.welcomeBack" />
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Text tid="login.emailLabel" />
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Text tid="login.passwordLabel" />
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="px-4 py-2 block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-[#020B2C] focus:ring-[#020B2C] sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-[#020B2C] focus:ring-[#020B2C]"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-gray-700"
                >
                  <Text tid="login.rememberMe" />
                </label>
              </div>

              <button
                type="button"
                className="text-sm text-[#020B2C] hover:text-[#020B2C]/80"
              >
                <Text tid="login.forgotPassword" />
              </button>
            </div>

            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#020B2C] hover:bg-[#020B2C]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#020B2C]"
            >
              <Text tid="login.signIn" />
            </button>

            <div className="text-center text-sm text-gray-500">
              <Text tid="login.noAccount" />{" "}
              <button
                type="button"
                onClick={handleRegisterClick}
                className="text-[#020B2C] hover:text-[#020B2C]/80 font-medium"
              >
                <Text tid="login.registerNow" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
