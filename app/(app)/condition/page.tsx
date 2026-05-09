import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { Moon, Pill } from "lucide-react"
import type { DailyConditionLog, MealLog } from "@/lib/supabase/types"
import { ConditionForm } from "./condition-form"
import { MealsSection } from "./meals-section"
import { Big3Card } from "./big3-card"
import { TrendsSection } from "./trends-section"
import { WeightCard } from "./weight-card"

function todayJST(): string {
  // YYYY-MM-DD（日本時間）
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export default async function ConditionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = todayJST()

  const [
    { data: condition },
    { data: meals },
    { data: latestWeight },
  ] = await Promise.all([
    supabase
      .from("daily_condition_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle(),
    supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .order("created_at", { ascending: true }),
    supabase
      .from("body_measurements")
      .select("weight_kg, measured_at")
      .eq("user_id", user.id)
      .not("weight_kg", "is", null)
      .order("measured_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const cond = condition as DailyConditionLog | null
  const todaysMeals = (meals ?? []) as MealLog[]
  const bodyWeight = latestWeight?.weight_kg ? Number(latestWeight.weight_kg) : null

  return (
    <div className="min-h-dvh bg-surface-secondary">
      <Header title="コンディション管理" backHref="/" />

      <div className="px-4 py-4 space-y-4 pb-24">
        {/* 今日のコンディション */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon size={16} className="text-navy-500" />
              今日のコンディション
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="睡眠" value={fmtNum(cond?.sleep_hours)} unit="h" />
              <Stat label="体調" value={fmtScore(cond?.condition_score)} unit="/5" />
              <Stat label="疲労感" value={fmtScore(cond?.fatigue_score)} unit="/5" />
              <Stat label="食欲" value={fmtScore(cond?.appetite_score)} unit="/5" />
              <Stat label="水分" value={fmtNum(cond?.water_l)} unit="L" />
            </div>
          </CardContent>
        </Card>

        {/* 今日のサプリ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill size={16} className="text-navy-500" />
              今日のサプリ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <SuppRow
                label="クレアチン"
                taken={cond?.creatine_taken}
                detail={cond?.creatine_g ? `${cond.creatine_g}g` : null}
              />
              <SuppRow
                label="THE MACA PRO"
                taken={cond?.maca_taken}
                detail={cond?.maca_count ? `${cond.maca_count}回` : null}
              />
              <SuppRow
                label="プロテイン"
                taken={(cond?.protein_count ?? 0) > 0}
                detail={cond?.protein_count ? `${cond.protein_count}回` : null}
              />
              <SuppRow label="カフェイン" taken={cond?.caffeine_taken} />
            </div>
          </CardContent>
        </Card>

        {/* 今日の食事 (合計 + ログ + 入力) */}
        <MealsSection userId={user.id} date={today} initialMeals={todaysMeals} />

        {/* 今日の体重 */}
        <WeightCard
          userId={user.id}
          date={today}
          latestWeight={bodyWeight}
          latestDate={latestWeight?.measured_at ?? null}
        />

        {/* BIG3 */}
        <Big3Card userId={user.id} bodyWeight={bodyWeight} />

        {/* 入力フォーム */}
        <ConditionForm userId={user.id} date={today} initial={cond} />

        {/* 進捗グラフ + カレンダー */}
        <TrendsSection userId={user.id} />
      </div>
    </div>
  )
}

function fmtNum(v: number | null | undefined) {
  return v == null ? "—" : String(v)
}
function fmtScore(v: number | null | undefined) {
  return v == null ? "—" : String(v)
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string
  value: string
  unit?: string
}) {
  return (
    <div className="bg-surface-secondary rounded-xl px-3 py-2.5">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900 mt-0.5">
        {value}
        {unit && value !== "—" && (
          <span className="text-xs font-medium text-gray-500 ml-1">{unit}</span>
        )}
      </p>
    </div>
  )
}

function SuppRow({
  label,
  taken,
  detail,
}: {
  label: string
  taken?: boolean
  detail?: string | null
}) {
  return (
    <div className="flex items-center justify-between bg-surface-secondary rounded-xl px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs text-gray-700 truncate">{label}</p>
        {detail && <p className="text-[11px] text-gray-400 mt-0.5">{detail}</p>}
      </div>
      <span
        className={
          taken
            ? "text-[11px] font-semibold text-navy-500 bg-navy-50 px-2 py-0.5 rounded-full"
            : "text-[11px] font-medium text-gray-400 bg-white border border-border px-2 py-0.5 rounded-full"
        }
      >
        {taken ? "済" : "未"}
      </span>
    </div>
  )
}

