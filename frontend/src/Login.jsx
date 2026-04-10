import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    const emailRule = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      setError("Please enter your email address.");
    } else if (!emailRule.test(email)) {
      setError("Oops! That does not look like a valid email.");
    } else {
      setError("");
      // Set auth flag for ProtectedRoute
      localStorage.setItem("isLoggedIn", "true");
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-[#E7E9F0] flex flex-col items-center justify-center p-4">
      {/* Logo and Title area */}
      <div className="flex flex-row items-center justify-center gap-3 mb-6">
        <div className="w-12 h-12 flex-shrink-0">
          <img
            src="/Tanuki-new 1.png"
            alt="Logo"
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="font-semibold text-black text-4xl tracking-tight leading-none">
          Dashboard
        </h1>
      </div>

      {/* The White Login Card */}
      <div className="bg-white w-full max-w-[440px] rounded-2xl shadow-sm border border-[#E7E9F0] p-10 flex flex-col items-center">
        <h2 className="text-xl font-semibold text-black mb-8 text-center">
          Log in with SSO
        </h2>

        <form onSubmit={handleLogin} className="w-full flex flex-col gap-5">
          {/* Email Input Section */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="text-sm font-semibold text-black"
            >
              Email
            </label>
            <input
              id="email"
              type="text"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="Enter your email address"
              className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all ${
                error
                  ? "border-red-300 focus:ring-red-100 bg-red-50/30"
                  : "border-[#E7E9F0] focus:border-[#007BC6] focus:ring-[#007BC6]/20"
              }`}
            />
            {error && (
              <span className="text-red-500 text-xs font-medium mt-1">
                {error}
              </span>
            )}
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="w-full bg-[#007BC6] hover:bg-[#006ba8] text-white font-medium py-3 rounded-lg hover:shadow-xl hover:shadow-[#007BC6]/30 hover:-translate-y-1 transition-all duration-300 mt-2"
          >
            Login
          </button>
        </form>

        {/* Button for alternative login method */}
        <p className="mt-6 text-sm font-medium text-gray-600">
          Not using SSO?{" "}
          <button
            type="button"
            className="text-[#007BC6] hover:underline bg-transparent border-none p-0 cursor-pointer"
          >
            Log in with a password
          </button>
        </p>
      </div>

      <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-500 font-medium">
        <a href="#" className="hover:text-black transition-colors">
          Terms of Service
        </a>
        <span className="text-gray-400">|</span>
        <a href="#" className="hover:text-black transition-colors">
          Privacy policy
        </a>
      </div>
    </div>
  );
}
