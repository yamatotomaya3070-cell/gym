export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { MUSCLE_GROUP_LABELS, MUSCLE_GROUPS, MuscleGroup } from "@/lib/supabase/types"
import { BookOpen, ChevronRight, Plus } from "lucide-react"
import Link from "next/link"

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; muscle?: string; q?: string }>
}) {
  const { group, muscle, q } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const activeGroup = MUSCLE_GROUPS.find((g) => g.key === group) ?? null

  let query = supabase
    .from("exercises")
    .select("id, name, category, primary_muscles, is_custom, user_id")
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order("name")

  // 大分類フィルター
  if (group && !muscle) {
    query = query.eq("category", group)
  }
  // 筋肉フィルター（primary_muscles 配列に含まれるか）
  if (muscle) {
    query = query.contains("primary_muscles", [muscle])
  }
  // テキスト検索
  if (q) {
    query = query.ilike("name", `%${q}%`)
  }

  const { data: exercises } = await query

  return (
    <div className="min-h-dvh bg-surface-secondary">
      <Header
        title="種目ライブラリ"
        rightElement={
          <Link
            href="/exercises/new"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-navy-50 text-navy-500 hover:bg-navy-100"
          >
            <Plus size={20} />
          </Link>
        }
      />

      {/* 検索 */}
      <div className="px-4 pt-4">
        <form>
          <input
            name="q"
            defaultValue={q}
            placeholder="種目名で検索..."
            className="w-full h-10 px-4 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
          />
          {group && <input type="hidden" name="group" value={group} />}
          {muscle && <input type="hidden" name="muscle" value={muscle} />}
        </form>
      </div>

      {/* 大分類フィルター（1段目）*/}
      <div className="flex gap-2 px-4 pt-3 pb-1.5 overflow-x-auto scrollbar-hide">
        <Link
          href={q ? `/exercises?q=${q}` : "/exercises"}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            !group && !muscle
              ? "bg-navy-500 text-white"
              : "bg-surface border border-border text-gray-600"
          }`}
        >
          すべて
        </Link>
        {MUSCLE_GROUPS.map((g) => (
          <Link
            key={g.key}
            href={`/exercises?group=${g.key}${q ? `&q=${q}` : ""}`}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              group === g.key
                ? "bg-navy-500 text-white"
                : "bg-surface border border-border text-gray-600"
            }`}
          >
            {g.label}
          </Link>
        ))}
      </div>

      {/* 筋肉フィルター（2段目：大分類選択時のみ）*/}
      {activeGroup && (
        <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto scrollbar-hide">
          <Link
            href={`/exercises?group=${group}${q ? `&q=${q}` : ""}`}
            className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
              !muscle
                ? "bg-navy-100 text-navy-600 border border-navy-200"
                : "bg-surface border border-border text-gray-500"
            }`}
          >
            全{activeGroup.label}
          </Link>
          {activeGroup.subMuscles.map((m) => (
            <Link
              key={m}
              href={`/exercises?group=${group}&muscle=${encodeURIComponent(m)}${q ? `&q=${q}` : ""}`}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                muscle === m
                  ? "bg-navy-100 text-navy-600 border border-navy-200"
                  : "bg-surface border border-border text-gray-500"
              }`}
            >
              {m}
            </Link>
          ))}
        </div>
      )}

      <div className="px-4 pb-28 space-y-2">
        {exercises?.length === 0 && (
          <Card>
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-3 text-center">
              <BookOpen size={40} className="text-gray-300" />
              <p className="text-sm text-gray-400">該当する種目がありません</p>
            </CardContent>
          </Card>
        )}
        {exercises?.map((ex) => (
          <Link key={ex.id} href={`/exercises/${ex.id}`}>
            <div className="bg-surface rounded-2xl border border-border shadow-card p-4 flex items-center gap-3 hover:shadow-card-hover transition-shadow active:scale-[0.99]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 text-sm">{ex.name}</p>
                  {ex.is_custom && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-navy-50 text-navy-500 font-medium">
                      カスタム
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">
                    {MUSCLE_GROUP_LABELS[ex.category as MuscleGroup] ?? ex.category}
                  </span>
                  {(ex.primary_muscles as string[] | null)?.length && (
                    <>
                      <span className="text-gray-200">·</span>
                      <span className="text-xs text-gray-400">
                        {(ex.primary_muscles as string[]).slice(0, 2).join("・")}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
            </div>
          </Link>
        ))}
      </div>

      {/* フローティング追加ボタン */}
      <div className="fixed bottom-above-nav left-0 right-0 p-4 bg-surface border-t border-border">
        <Link
          href="/exercises/new"
          className="flex items-center justify-center gap-2 w-full h-12 bg-navy-500 text-white rounded-xl text-sm font-medium hover:bg-navy-600 active:scale-[0.98] transition-all"
        >
          <Plus size={18} />
          カスタム種目を追加
        </Link>
      </div>
    </div>
  )
}
