import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useProfile } from "../../context/ProfileContext";
import { supabase } from "../../lib/supabase";
import Layout from "../Layout";

export default function VerifiedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const { isVerified, loading: profileLoading } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !profileLoading && user && isVerified === false) {
      // Remove all local/session storage and Supabase session
      localStorage.clear();
      sessionStorage.clear();
      supabase.auth.signOut();
      navigate("/verification-pending", { replace: true });
    }
  }, [authLoading, profileLoading, user, isVerified, navigate]);

  // Only show loading if we don't have profile data yet
  if (authLoading || profileLoading) return <div>Loading...</div>;
  if (!user) return null;
  if (isVerified === false) {
    // Already handled by useEffect above
    return null;
  }

  return <Layout>{children}</Layout>;
}
