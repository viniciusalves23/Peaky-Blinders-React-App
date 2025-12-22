"use client"

import type React from "react"
import { useState } from "react"
import * as ReactRouterDOM from "react-router-dom"
const { useNavigate, Link } = ReactRouterDOM
import { useAuth } from "../contexts/AuthContext"
import { ChevronLeft, Eye, EyeOff, Mail, AlertTriangle } from "lucide-react"

export const Register: React.FC = () => {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [successMode, setSuccessMode] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.")
      return
    }

    setLoading(true)
    const result = await register(name, email, password)
    setLoading(false)

    if (result.success) {
      if (result.message === "CONFIRM_EMAIL") {
        setSuccessMode(true)
      } else {
        navigate("/")
      }
    } else {
      setError(result.message || "Erro ao criar conta.")
    }
  }

  if (successMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 animate-fade-in text-center">
        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mb-6 border border-green-500/20">
          <Mail size={40} />
        </div>
        <h2 className="text-3xl font-serif text-zinc-900 dark:text-white mb-4 font-bold">Confirme seu E-mail</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mb-2 max-w-sm leading-relaxed">
          Um link de ativação foi enviado para:
        </p>
        <p className="text-gold-600 font-bold mb-6">{email}</p>
        <div className="bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-8 max-w-sm">
          <p className="text-sm text-amber-800 dark:text-amber-400 flex items-start gap-2">
            <AlertTriangle className="shrink-0 mt-0.5" size={16} />
            <span>Você precisa clicar no link para ativar sua conta antes de fazer login.</span>
          </p>
        </div>
        <button
          onClick={() => navigate("/login")}
          className="bg-gold-600 text-white font-black uppercase py-4 px-10 rounded-xl shadow-lg hover:bg-gold-500 transition-colors"
        >
          Ir para Login
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 animate-fade-in relative">
      <Link
        to="/"
        className="absolute top-6 left-6 text-zinc-400 flex items-center text-sm hover:text-white transition-colors"
      >
        <ChevronLeft size={20} /> Voltar ao Início
      </Link>

      <h2 className="text-3xl font-serif text-zinc-900 dark:text-white mb-2 font-bold">Junte-se ao Clube</h2>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-center text-sm">
        Crie sua conta para agendamentos exclusivos.
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs rounded-xl text-center font-bold flex items-center gap-2 justify-center">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <div>
          <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Nome Completo</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-zinc-900 dark:text-white focus:border-gold-500 focus:outline-none"
            placeholder="Thomas Shelby"
            required
          />
        </div>

        <div>
          <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-zinc-900 dark:text-white focus:border-gold-500 focus:outline-none"
            placeholder="seu@email.com"
            required
          />
        </div>

        <div>
          <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Senha</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 pr-12 text-zinc-900 dark:text-white focus:border-gold-500 focus:outline-none"
              placeholder="Min. 6 caracteres"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-gold-500 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <button
          disabled={loading}
          type="submit"
          className="w-full bg-gold-600 hover:bg-gold-500 text-white font-bold py-3 rounded-lg uppercase tracking-wider transition-colors disabled:opacity-70"
        >
          {loading ? "Criando Conta..." : "Criar Conta"}
        </button>
      </form>

      <p className="mt-6 text-zinc-500 text-sm">
        Já tem uma conta?{" "}
        <Link to="/login" className="text-gold-600 font-bold hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  )
}
