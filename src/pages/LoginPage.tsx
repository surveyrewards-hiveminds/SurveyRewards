import React from "react";
import { LoginComponent } from "../components/auth/LoginComponent";
import PublicNavbar from "../components/navigation/PublicNavbar";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
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
  }, []);

  return (
    <>
      <PublicNavbar />
      <div className="flex min-h-screen items-center justify-center pt-24">
        <div className="w-full max-w-xl">
          <LoginComponent isOpen={true} onClose={() => {}} />
        </div>
      </div>
    </>
  );
}
