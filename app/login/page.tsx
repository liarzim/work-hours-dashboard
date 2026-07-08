"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { GoogleIcon, ShieldIcon, FingerprintIcon, ArrowLeftIcon } from "@/components/Icons";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [hasPasskey, setHasPasskey] = useState(false);

  // Check if browser/device supports WebAuthn and if user has registered a passkey
  useEffect(() => {
    const checkPasskeySupport = async () => {
      if (window.PublicKeyCredential) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        const storedKey = localStorage.getItem("has_registered_passkey");
        if (available && storedKey === "true") {
          setHasPasskey(true);
        }
      }
    };
    checkPasskeySupport();
  }, []);

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "שגיאה בחיבור ל-Google");
      setLoading(false);
    }
  }

  async function handlePasswordAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!email || !password) {
      setError("יש למלא את כל השדות");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/");
        router.refresh();
      } else {
        // Sign Up
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage("הרשמה בוצעה בהצלחה! יש לבדוק את תיבת המייל לאימות החשבון.");
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || "שגיאה בביצוע הפעולה");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasskeyLogin() {
    setLoading(true);
    setError(null);
    try {
      // Trigger WebAuthn Biometric Login Simulation
      // In a full implementation, we enroll/verify WebAuthn challenge with Supabase MFA
      // Here we check credentials using browser's credential API
      if (!window.PublicKeyCredential) {
        throw new Error("מכשיר זה אינו תומך בזיהוי ביומטרי");
      }

      // Simulate credential challenge
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array([1, 2, 3, 4]),
          rpId: window.location.hostname,
          userVerification: "required",
          timeout: 60000
        }
      });

      if (credential) {
        // Retrieve temporary passwordless token / perform sign-in
        const storedEmail = localStorage.getItem("passkey_email");
        if (storedEmail) {
          // Log in the user using their biometric session token
          const { error } = await supabase.auth.signInWithOtp({
            email: storedEmail,
            options: {
              shouldCreateUser: false
            }
          });
          if (error) throw error;
          setMessage("נשלח קוד כניסה מהיר למייל שלך לאימות ביומטרי ראשוני.");
        } else {
          throw new Error("לא נמצא משתמש משויך למפתח הביומטרי בדפדפן זה");
        }
      }
    } catch (err: any) {
      setError(err.message || "אימות ביומטרי נכשל או בוטל");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8 dir-rtl" style={{ direction: "rtl" }}>
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-slate-100 bg-white p-8 shadow-xl">
        {/* Brand Logo & Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-100">
            <ShieldIcon className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
            ניהול דיווח שעות
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            24H WORK DASHBOARD
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => { setIsLogin(true); setError(null); setMessage(null); }}
            className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold transition ${
              isLogin ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            התחברות
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(null); setMessage(null); }}
            className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold transition ${
              !isLogin ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            הרשמה
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handlePasswordAuth} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500">כתובת אימייל</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="name@company.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500">סיסמה</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
          >
            {isLogin ? "התחבר לחשבון" : "צור חשבון חדש"}
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
        </form>

        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute w-full border-t border-slate-200"></div>
          <span className="relative bg-white px-4 text-xs font-semibold text-slate-400">או באמצעות</span>
        </div>

        {/* Social / Biometric Logins */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <GoogleIcon className="h-5 w-5" />
            התחבר באמצעות Google
          </button>

          {hasPasskey && isLogin && (
            <button
              type="button"
              onClick={handlePasskeyLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/50 py-2.5 text-sm font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:opacity-60"
            >
              <FingerprintIcon className="h-5 w-5 text-indigo-600" />
              התחבר עם זיהוי ביומטרי (Face ID / טביעת אצבע)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
