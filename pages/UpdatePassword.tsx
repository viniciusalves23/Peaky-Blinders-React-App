"use client"

import type React from "react"
import { useState, useEffect } from "react"
import * as ReactRouterDOM from "react-router-dom"
const { useNavigate, useLocation } = ReactRouterDOM
import { useAuth } from "../contexts/AuthContext"
import { Lock, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react"
import { supabase } from "../services/supabaseClient"

export const UpdatePassword: React.FC = () => {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [verifyingSession, setVerifyingSession] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const { updateUserPassword } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const handlePasswordRecovery = async () => {
      console.log("[v0] URL hash:", location.hash)

      // Extrair tokens do hash da URL
      const hashParams = new URLSearchParams(location.hash.substring(1))
      const accessToken = hashParams.get("access_token")
      const refreshToken = hashParams.get("refresh_token")
      const type = hashParams.get("type")

      console.log("[v0] Token type:", type)
      console.log("[v0] Access token exists:", !!accessToken)
      console.log("[v0] Refresh token exists:", !!refreshToken)

      if (type === "recovery" && accessToken) {
        try {
          // Estabelecer sessão com os tokens da URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          })

          console.log("[v0] Session set result:", { success: !error, error })

          if (error) {
            setError("Link de recuperação inválido ou expirado.")
            setVerifyingSession(false)
            return
          }

          console.log("[v0] Session established successfully")
          setVerifyingSession(false)
        } catch (err) {
          console.error("[v0] Error setting session:", err)
          setError("Erro ao verificar link de recuperação.")
          setVerifyingSession(false)
        }
      } else {
        // Verificar se já existe uma sessão ativa
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
          setError("Link de recuperação não encontrado. Por favor, solicite um novo link.")
        }
        setVerifyingSession(false)
      }
    }

    handlePasswordRecovery()
  }, [location.hash])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.")
      return
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.")
      return
    }

    setLoading(true)
    const result = await updateUserPassword(password)
    setLoading(false)

    if (result.success) {
      setSuccess(true)
      setTimeout(() => {
        navigate("/login")
      }, 3000)
    } else {
      setError(result.message || "Erro ao atualizar senha. O link pode ter expirado.")
    }
  }

  if (verifyingSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-sm bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl">
          <div className="text-center space-y-4">
            <Loader2 size={48} className="animate-spin mx-auto text-gold-600" />
            <p className="text-zinc-600 dark:text-zinc-400">Verificando link de recuperação...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 animate-fade-in">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gold-600/10 rounded-full flex items-center justify-center mx-auto mb-4 text-gold-600">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white">Definir Nova Senha</h2>
        </div>

        {success ? (
          <div className="text-center space-y-4 animate-scale-in">
            <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-xl flex flex-col items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 size={32} />
              <p className="font-bold">Senha alterada com sucesso!</p>
            </div>
            <p className="text-sm text-zinc-500">Redirecionando para login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle size={16} /> {error}
              </div>
            )}

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 focus:border-gold-500 outline-none text-zinc-900 dark:text-white"
              placeholder="Nova Senha"
              required
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 focus:border-gold-500 outline-none text-zinc-900 dark:text-white"
              placeholder="Confirmar Nova Senha"
              required
            />

            <button
              disabled={loading}
              className="w-full py-4 bg-gold-600 text-white font-black uppercase rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "Atualizando..." : "Salvar Nova Senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
