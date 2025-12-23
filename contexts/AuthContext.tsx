"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import type { User } from "../types"
import { db } from "../services/db"
import { supabase } from "../services/supabaseClient"

interface AuthResponse {
  success: boolean
  message?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<AuthResponse>
  register: (name: string, email: string, password: string) => Promise<AuthResponse>
  requestPasswordReset: (email: string) => Promise<AuthResponse>
  updateUserPassword: (password: string) => Promise<AuthResponse>
  logout: () => Promise<void>
  refreshUser: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth deve ser usado dentro de um AuthProvider")
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (sessionUser: any) => {
    console.log("[v0] Fetching profile for user:", sessionUser?.id)

    if (!sessionUser) {
      console.log("[v0] No session user, clearing state")
      setUser(null)
      setLoading(false)
      return
    }

    const profile = await db.getUserProfile(sessionUser.id)
    console.log("[v0] Profile from DB:", profile)

    if (profile) {
      setUser(profile)
    } else {
      const fallbackUser: User = {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.user_metadata?.name || "Usuário",
        role: "customer",
        loyaltyStamps: 0,
        isAdmin: false,
      }
      console.log("[v0] Creating fallback user:", fallbackUser)
      setUser(fallbackUser)
    }
    setLoading(false)
  }

  const refreshUser = async () => {
    console.log("[v0] Refreshing user session")
    const {
      data: { session },
    } = await supabase.auth.getSession()
    console.log("[v0] Current session:", session)
    await fetchProfile(session?.user)
  }

  useEffect(() => {
    console.log("[v0] AuthContext initializing")

    const handleEmailConfirmation = () => {
      const hash = window.location.hash
      // Check if this is an email confirmation redirect
      if (hash.includes("type=signup") || hash.includes("type=email_change")) {
        // Store success message for login page
        localStorage.setItem("email_confirmed", "true")
      }
    }

    handleEmailConfirmation()

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("[v0] Initial session:", session)
      fetchProfile(session?.user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[v0] Auth state changed - Event:", event, "Session:", session)

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        console.log("[v0] User signed in or token refreshed")
        await fetchProfile(session?.user)
      } else if (event === "SIGNED_OUT") {
        console.log("[v0] User signed out")
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      console.log("[v0] Cleaning up auth subscription")
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    console.log("[v0] Attempting login for:", email)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      console.log("[v0] Login error:", error.message)

      // Check for email not confirmed
      if (error.message.includes("Email not confirmed")) {
        return { success: false, message: "Email não confirmado. Favor confirmar." }
      }

      // For invalid credentials, check if email exists to give specific error
      if (error.message.includes("Invalid login credentials")) {
        const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).single()

        if (!profile) {
          return { success: false, message: "Email não cadastrado." }
        } else {
          return { success: false, message: "Senha inválida." }
        }
      }

      return { success: false, message: "Erro ao realizar login. Tente novamente." }
    }

    console.log("[v0] Login successful:", data)
    await fetchProfile(data.user)
    return { success: true }
  }

  const register = async (name: string, email: string, password: string): Promise<AuthResponse> => {
    console.log("[v0] Attempting registration for:", email)
    const { data: existing } = await supabase.from("profiles").select("id").eq("email", email).single()

    if (existing) {
      return { success: false, message: "Este e-mail já está cadastrado." }
    }

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        // Redirect to login after email confirmation
        emailRedirectTo: `${window.location.origin}/#/login`,
      },
    })

    if (error) {
      console.log("[v0] Registration error:", error.message)
      return { success: false, message: error.message }
    }

    console.log("[v0] Registration successful:", data)
    // If registration successful but needs email confirmation
    if (data.user && !data.session) {
      return { success: true, message: "CONFIRM_EMAIL" }
    }

    return { success: true }
  }

  const requestPasswordReset = async (email: string): Promise<AuthResponse> => {
    const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).single()

    if (!profile) {
      return { success: false, message: "Não existe conta com este e-mail cadastrado." }
    }

    // Send password reset email
    const redirectTo = `${window.location.origin}/#/update-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo,
    })

    if (error) {
      return { success: false, message: error.message }
    }

    return { success: true }
  }

  const updateUserPassword = async (password: string): Promise<AuthResponse> => {
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      return { success: false, message: error.message }
    }

    return { success: true }
  }

  const logout = async () => {
    console.log("[v0] Logging out user")
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        refreshUser,
        loading,
        requestPasswordReset,
        updateUserPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
