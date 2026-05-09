"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dumbbell } from "lucide-react"
import { useState } from "react"

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        window.location.href = "/"
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${location.origin}/api/auth/callback` },
        })
        if (error) throw error
        setMessage("確認メールを送信しました。メールのリンクをクリックして登録を完了してください。")
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "エラーが発生しました"
      if (message.includes("Invalid login credentials")) {
        setError("メールアドレスまたはパスワードが正しくありません")
      } else if (message.includes("Email already registered")) {
        setError("このメールアドレスは既に登録されています")
      } else {
        setError("エラーが発生しました。もう一度お試しください")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/api/auth/callback` },
    })
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 bg-surface-secondary">
      <div className="w-full max-w-sm space-y-8">
        {/* ロゴ */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-navy-500 rounded-2xl flex items-center justify-center">
            <Dumbbell size={32} className="text-white" strokeWidth={2} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-navy-500">GymNote</h1>
            <p className="text-sm text-gray-500 mt-1">
              {mode === "login" ? "ログインして続ける" : "無料アカウントを作成"}
            </p>
          </div>
        </div>

        {/* フォーム */}
        <div className="bg-surface rounded-2xl border border-border shadow-card p-6 space-y-5">
          {message && (
            <div className="bg-green-50 text-success text-sm rounded-xl p-3 border border-green-100">
              {message}
            </div>
          )}
          {error && (
            <div className="bg-red-50 text-danger text-sm rounded-xl p-3 border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="メールアドレス"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <Input
              label="パスワード"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8文字以上"
              required
              minLength={8}
            />
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              {mode === "login" ? "ログイン" : "アカウント作成"}
            </Button>
          </form>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-gray-400">または</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={handleGoogle}
            type="button"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Googleでログイン
          </Button>
        </div>

        <p className="text-center text-sm text-gray-500">
          {mode === "login" ? "アカウントをお持ちでない方 " : "既にアカウントをお持ちの方 "}
          <button
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError("") }}
            className="text-navy-500 font-medium hover:underline"
          >
            {mode === "login" ? "新規登録" : "ログイン"}
          </button>
        </p>
      </div>
    </div>
  )
}
