export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, ListChecks, ChevronRight } from "lucide-react"
import Link from "next/link"

export default async function RoutinesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: routines } = await supabase
    .from("routines")
    .select(`
      id, name, note, created_at,
      routine_exercises (count)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-dvh bg-surface-secondary">
      <Header
        title="ルーティン"
        rightElement={
          <Link
            href="/routines/new"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-navy-50 text-navy-500 hover:bg-navy-100"
          >
            <Plus size={20} />
          </Link>
        }
      />

      <div className="px-4 py-4 space-y-3 pb-28">
        {routines?.length === 0 && (
          <Card>
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
              <ListChecks size={40} className="text-gray-300" />
              <div>
                <p className="text-gray-600 font-medium">ルーティンがありません</p>
                <p className="text-sm text-gray-400 mt-1">
                  ルーティンを作成して効率よくトレーニングしましょう
                </p>
              </div>
              <Link
                href="/routines/new"
                className="flex items-center gap-2 px-5 py-2.5 bg-navy-500 text-white rounded-xl text-sm font-medium hover:bg-navy-600"
              >
                <Plus size={16} />
                ルーティンを作成
              </Link>
            </CardContent>
          </Card>
        )}

        {routines?.map((routine) => (
          <Link key={routine.id} href={`/routines/${routine.id}`}>
            <div className="bg-surface rounded-2xl border border-border shadow-card p-4 flex items-center gap-3 hover:shadow-card-hover transition-shadow active:scale-[0.99]">
              <div className="w-10 h-10 bg-navy-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <ListChecks size={20} className="text-navy-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{routine.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {(routine.routine_exercises as unknown as { count: number }[])?.[0]?.count ?? 0} 種目
                </p>
                {routine.note && (
                  <p className="text-xs text-gray-500 mt-1 truncate">{routine.note}</p>
                )}
              </div>
              <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
            </div>
          </Link>
        ))}
      </div>

      {/* フローティング作成ボタン */}
      <div className="fixed bottom-above-nav left-0 right-0 p-4 bg-surface border-t border-border">
        <Link
          href="/routines/new"
          className="flex items-center justify-center gap-2 w-full h-12 bg-navy-500 text-white rounded-xl text-sm font-medium hover:bg-navy-600 active:scale-[0.98] transition-all"
        >
          <Plus size={18} />
          新しいルーティンを作成
        </Link>
      </div>
    </div>
  )
}
