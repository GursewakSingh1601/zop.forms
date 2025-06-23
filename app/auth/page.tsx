"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import { RegisterForm } from "@/components/auth/register-form"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { Logo } from "@/components/ui/logo"
import { useAuth } from "@/components/auth/auth-provider"

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login")
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Logo size="lg" className="mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Logo size="lg" className="mx-auto" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {mode === "login"
              ? "Sign in to your account"
              : mode === "register"
                ? "Create your account"
                : "Reset your password"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {mode === "login" ? "Welcome back to " : mode === "register" ? "Get started with " : "Recover access to "}
            <span className="font-medium text-primary-500">Zop Forms</span>
          </p>
        </div>

        {mode === "login" && (
          <LoginForm onToggleMode={() => setMode("register")} onForgotPassword={() => setMode("forgot")} />
        )}
        {mode === "register" && <RegisterForm onToggleMode={() => setMode("login")} />}
        {mode === "forgot" && <ForgotPasswordForm onBack={() => setMode("login")} />}
      </div>
    </div>
  )
}
