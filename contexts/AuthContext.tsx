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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (sessionUser: any) => {
    if (!sessionUser) {
      setUser(null)
      setLoading(false)
      return
    }

    const profile = await db.getUserProfile(sessionUser.id)
    if (profile) {
      setUser(profile)
    } else {
      setUser({
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.user_metadata?.name || "Usuário",
        role: "customer",
        loyaltyStamps: 0,
        isAdmin: false,
      })
    }
    setLoading(false)
  }

  const refreshUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    fetchProfile(session?.user)
  }

  useEffect(() => {
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
      fetchProfile(session?.user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[v0] Auth event:", event)

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        fetchProfile(session?.user)
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })

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

    return { success: true }
  }

  const register = async (name: string, email: string, password: string): Promise<AuthResponse> => {
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
      return { success: false, message: error.message }
    }

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

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth deve ser usado dentro de um AuthProvider")
  return context
}
