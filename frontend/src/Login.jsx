import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogin = (e) => {
    e.preventDefault();

    const authMode = import.meta.env.VITE_AUTH_MODE || "dev";

    if (authMode === "prod") {
      // Prod mode delegates auth to oauth2-proxy via NGINX
      alert(
        "PROD MODE: Redirecting to Microsoft Azure AD (/oauth2/sign_in)...",
      );
      window.location.href = "/oauth2/sign_in";
    } else {
      // Keep existing auth flow behavior for local development
      localStorage.setItem("isLoggedIn", "true");
      navigate("/dashboard");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <img
        src="/background_image.jpg"
        alt="FUSO truck background"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-[#0A2A59]/35" />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-107.5">
          <div className="rounded-2xl border border-[#DCE1EA] bg-white/95 px-7 py-8 shadow-[0_24px_60px_rgba(0,27,77,0.28)] backdrop-blur-[2px] sm:px-9 sm:py-9">
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="text-base font-semibold text-center text-black">
                Welcome to the Connectivity Dashboard
              </span>
            </div>
            <div className="my-4 h-px bg-[#E5E8EF]" />
            <div className="flex justify-center">
              <img src="/fuso-logo.svg" alt="FUSO" className="h-8 w-auto" />
            </div>

            <div className="my-8 h-px bg-[#E5E8EF]" />

            <form onSubmit={handleLogin}>
              <button
                type="submit"
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#1087CF] px-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#0B78B9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1087CF]/45 focus-visible:ring-offset-2"
              >
                <span>
                  {t("login.daimlerButton", "Login With Daimler Credentials")}
                </span>
                <ArrowRight
                  size={16}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
