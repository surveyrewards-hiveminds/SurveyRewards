import React from "react";
import PublicNavbar from "../components/navigation/PublicNavbar";
import { ForgotPasswordComponent } from "../components/auth/ForgotPasswordComponent";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  React.useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        navigate("/dashboard");
      }
    };
    checkUser();
  }, [navigate]);

  return (
    <>
      <PublicNavbar />
      <div className="flex min-h-screen items-center justify-center pt-24">
        <div className="w-full max-w-xl">
          <ForgotPasswordComponent
            isOpen={true}
            onClose={() => navigate("/login")}
          />
        </div>
      </div>
    </>
  );
}
