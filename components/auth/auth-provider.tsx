"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface User {
  id: string
  email: string
  name: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const queryClient = useQueryClient()

  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        console.log("Checking authentication status...")
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        })

        if (!response.ok) {
          if (response.status === 401) {
            console.log("User not authenticated (401)")
            return null
          }
          console.error("Auth check failed with status:", response.status)
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        console.log("User authenticated:", data.user)
        return data.user
      } catch (error) {
        console.log("Auth check failed:", error)
        return null
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const registerMutation = useMutation({
    mutationFn: async ({ email, password, name }: { email: string; password: string; name: string }) => {
      console.log("=== AUTH PROVIDER REGISTER ===")
      console.log("Sending registration request for:", email)

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password, name }),
      })

      console.log("Registration response status:", response.status)

      const data = await response.json()
      console.log("Registration response data:", data)

      if (!response.ok) {
        console.error("Registration failed:", data)
        throw new Error(data.error || data.details || "Registration failed")
      }

      console.log("Registration successful in auth provider")
      return data
    },
    onSuccess: (data) => {
      console.log("Registration mutation successful, invalidating queries...")
      queryClient.invalidateQueries({ queryKey: ["user"] })
    },
    onError: (error) => {
      console.error("Registration mutation failed:", error)
    },
  })

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      console.log("=== AUTH PROVIDER LOGIN ===")
      console.log("Sending login request for:", email)

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })

      console.log("Login response status:", response.status)

      const data = await response.json()
      console.log("Login response data:", data)

      if (!response.ok) {
        console.error("Login failed:", data)
        throw new Error(data.error || data.details || "Login failed")
      }

      console.log("Login successful in auth provider")
      return data
    },
    onSuccess: () => {
      console.log("Login mutation successful, invalidating queries...")
      queryClient.invalidateQueries({ queryKey: ["user"] })
    },
    onError: (error) => {
      console.error("Login mutation failed:", error)
    },
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log("Logging out...")
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
      const data = await response.json()
      console.log("Logout response:", data)
      return data
    },
    onSuccess: () => {
      console.log("Logout successful, clearing queries...")
      queryClient.clear()
      setIsAuthenticated(false)
    },
  })

  useEffect(() => {
    const wasAuthenticated = isAuthenticated
    const nowAuthenticated = !!user
    setIsAuthenticated(nowAuthenticated)

    if (wasAuthenticated !== nowAuthenticated) {
      console.log("Authentication status changed:", { from: wasAuthenticated, to: nowAuthenticated })
    }
  }, [user, isAuthenticated])

  const login = async (email: string, password: string) => {
    console.log("Login function called with email:", email)
    await loginMutation.mutateAsync({ email, password })
  }

  const register = async (email: string, password: string, name: string) => {
    console.log("Register function called with:", { email, name })
    await registerMutation.mutateAsync({ email, password, name })
  }

  const logout = async () => {
    console.log("Logout function called")
    await logoutMutation.mutateAsync()
  }

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        login,
        register,
        logout,
        isLoading,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
