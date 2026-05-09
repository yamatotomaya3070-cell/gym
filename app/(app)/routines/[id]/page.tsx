"use client"

import { createClient } from "@/lib/supabase/client"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Modal } from "@/components/ui/modal"
import { MUSCLE_GROUP_LABELS, MuscleGroup } from "@/lib/supabase/types"
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  GripVertical,
  Plus,
  Save,
  Trash2,
  X,
  Copy,
  Clock,
  LayoutList,
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

interface Exercise {
  id: string
  name: string
  category: string
}

interface RoutineExerciseItem {
  id: string
  exercise_id: string
  exercise_name: string
  exercise_category: string
  order_index: number
  default_sets: number
  default_rest_seconds: number
}

function SortableExerciseItem({
  item,
  onRemove,
  onUpdate,
}: {
  item: RoutineExerciseItem
  onRemove: (id: string) => void
  onUpdate: (id: string, field: "default_sets" | "default_rest_seconds", value: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  // セット数：ローカル文字列で管理（空欄を許容）
  const [setsStr, setSetsStr] = useState(String(item.default_sets))

  // レスト時間：分・秒に分解して管理
  const [restMins, setRestMins] = useState(String(Math.floor(item.default_rest_seconds / 60)))
  const [restSecs, setRestSecs] = useState(String(item.default_rest_seconds % 60))

  // propsが外部から変わった場合に同期
  useEffect(() => { setSetsStr(String(item.default_sets)) }, [item.default_sets])
  useEffect(() => {
    setRestMins(String(Math.floor(item.default_rest_seconds / 60)))
    setRestSecs(String(item.default_rest_seconds % 60))
  }, [item.default_rest_seconds])

  const commitSets = (val: string) => {
    const n = parseInt(val)
    if (!isNaN(n) && n >= 1) onUpdate(item.id, "default_sets", Math.min(n, 20))
    setSetsStr(val === "" ? val : String(Math.min(Math.max(1, n || 1), 20)))
  }

  const commitRest = (minsVal: string, secsVal: string) => {
    const m = Math.max(0, parseInt(minsVal) || 0)
    const s = Math.min(59, Math.max(0, parseInt(secsVal) || 0))
    const total = Math.max(5, m * 60 + s)
    onUpdate(item.id, "default_rest_seconds", total)
    setRestMins(String(m))
    setRestSecs(String(s))
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-surface rounded-2xl border border-border shadow-card p-4 flex items-start gap-3"
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-1 text-gray-300 touch-none"
      >
        <GripVertical size={18} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm truncate">{item.exercise_name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {MUSCLE_GROUP_LABELS[item.exercise_category as MuscleGroup] ?? item.exercise_category}
        </p>
        <div className="flex gap-3 mt-2 flex-wrap">
          {/* セット数 */}
          <div className="flex items-center gap-1.5">
            <LayoutList size={14} className="text-gray-400" />
            <input
              type="number"
              inputMode="numeric"
              value={setsStr}
              onChange={(e) => setSetsStr(e.target.value)}
              onBlur={(e) => commitSets(e.target.value)}
              className="w-10 text-center text-sm border border-border rounded-lg h-7 focus:outline-none focus:ring-2 focus:ring-navy-500"
              min={1}
              max={20}
            />
            <span className="text-xs text-gray-400">セット</span>
          </div>
          {/* レスト時間（分・秒） */}
          <div className="flex items-center gap-1">
            <Clock size={14} className="text-gray-400" />
            <input
              type="number"
              inputMode="numeric"
              value={restMins}
              onChange={(e) => setRestMins(e.target.value)}
              onBlur={(e) => commitRest(e.target.value, restSecs)}
              className="w-9 text-center text-sm border border-border rounded-lg h-7 focus:outline-none focus:ring-2 focus:ring-navy-500"
              min={0}
              max={10}
              placeholder="0"
            />
            <span className="text-xs text-gray-400">分</span>
            <input
              type="number"
              inputMode="numeric"
              value={restSecs}
              onChange={(e) => setRestSecs(e.target.value)}
              onBlur={(e) => commitRest(restMins, e.target.value)}
              className="w-9 text-center text-sm border border-border rounded-lg h-7 focus:outline-none focus:ring-2 focus:ring-navy-500"
              min={0}
              max={59}
              placeholder="0"
            />
            <span className="text-xs text-gray-400">秒</span>
          </div>
        </div>
      </div>
      <button
        onClick={() => onRemove(item.id)}
        className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-300 hover:text-danger hover:bg-red-50"
      >
        <X size={16} />
      </button>
    </div>
  )
}

export default function RoutineEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const isNew = id === "new"

  const [name, setName] = useState("")
  const [note, setNote] = useState("")
  const [items, setItems] = useState<RoutineExerciseItem[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showExerciseModal, setShowExerciseModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [routineId, setRoutineId] = useState<string | null>(isNew ? null : id)
  const supabase = createClient()
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    const load = async () => {
      const { data: exList } = await supabase
        .from("exercises")
        .select("id, name, category")
        .order("name")
      if (exList) setExercises(exList)

      if (!isNew) {
        const { data } = await supabase
          .from("routines")
          .select(`
            id, name, note,
            routine_exercises (
              id, order_index, default_sets, default_rest_seconds,
              exercise:exercises (id, name, category)
            )
          `)
          .eq("id", id)
          .single()
        if (data) {
          setName(data.name)
          setNote(data.note ?? "")
          const re = (data.routine_exercises as unknown as { id: string; order_index: number; default_sets: number; default_rest_seconds: number; exercise: Exercise }[])
          setItems(
            re.sort((a, b) => a.order_index - b.order_index).map((r) => ({
              id: r.id,
              exercise_id: r.exercise.id,
              exercise_name: r.exercise.name,
              exercise_category: r.exercise.category,
              order_index: r.order_index,
              default_sets: r.default_sets,
              default_rest_seconds: r.default_rest_seconds,
            }))
          )
        }
      }
    }
    load()
  }, [id, isNew])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id)
        const newIndex = prev.findIndex((i) => i.id === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  const handleAddExercise = (ex: Exercise) => {
    if (items.find((i) => i.exercise_id === ex.id)) return
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        exercise_id: ex.id,
        exercise_name: ex.name,
        exercise_category: ex.category,
        order_index: prev.length,
        default_sets: 3,
        default_rest_seconds: 90,
      },
    ])
    setShowExerciseModal(false)
    setSearchQuery("")
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let rid = routineId
    if (!rid) {
      const { data } = await supabase
        .from("routines")
        .insert({ user_id: user.id, name: name.trim(), note: note.trim() || null })
        .select("id")
        .single()
      rid = data?.id ?? null
      setRoutineId(rid)
    } else {
      await supabase.from("routines").update({ name: name.trim(), note: note.trim() || null }).eq("id", rid)
    }

    if (rid) {
      await supabase.from("routine_exercises").delete().eq("routine_id", rid)
      if (items.length > 0) {
        await supabase.from("routine_exercises").insert(
          items.map((item, i) => ({
            routine_id: rid!,
            exercise_id: item.exercise_id,
            order_index: i,
            default_sets: item.default_sets,
            default_rest_seconds: item.default_rest_seconds,
          }))
        )
      }
    }
    setSaving(false)
    router.refresh()
    router.push("/routines")
  }

  const handleDelete = async () => {
    if (!routineId || !confirm("このルーティンを削除しますか？")) return
    setDeleting(true)
    await supabase.from("routines").delete().eq("id", routineId)
    router.refresh()
    router.push("/routines")
  }

  const filteredExercises = exercises.filter(
    (ex) =>
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !items.find((i) => i.exercise_id === ex.id)
  )

  return (
    <div className="min-h-dvh bg-surface-secondary">
      <Header
        title={isNew ? "新しいルーティン" : "ルーティン編集"}
        backHref="/routines"
        rightElement={
          !isNew && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-danger hover:bg-red-50"
            >
              <Trash2 size={18} />
            </button>
          )
        }
      />

      <div className="px-4 py-4 space-y-4 pb-44">
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Input
              label="ルーティン名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 胸の日 / Push Day"
            />
            <Input
              label="メモ（任意）"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例: 月・木に実施"
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">種目リスト</h2>
          <button
            onClick={() => setShowExerciseModal(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-navy-500 hover:text-navy-600"
          >
            <Plus size={14} />
            種目を追加
          </button>
        </div>

        {items.length === 0 && (
          <Card>
            <CardContent className="pt-6 pb-6 text-center text-sm text-gray-400">
              種目がありません。追加してください
            </CardContent>
          </Card>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item) => (
                <SortableExerciseItem
                  key={item.id}
                  item={item}
                  onRemove={(itemId) => setItems((prev) => prev.filter((i) => i.id !== itemId))}
                  onUpdate={(itemId, field, value) =>
                    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, [field]: value } : i))
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* 保存ボタン */}
      <div className="fixed bottom-above-nav left-0 right-0 p-4 bg-surface border-t border-border">
        <Button className="w-full" size="lg" loading={saving} onClick={handleSave} disabled={!name.trim()}>
          <Save size={18} />
          保存する
        </Button>
      </div>

      {/* 種目追加モーダル */}
      <Modal isOpen={showExerciseModal} onClose={() => setShowExerciseModal(false)} title="種目を選択">
        <div className="space-y-3">
          <Input
            placeholder="種目名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
            {filteredExercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => handleAddExercise(ex)}
                className="w-full text-left p-3 rounded-xl hover:bg-surface-secondary transition-colors flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{ex.name}</p>
                  <p className="text-xs text-gray-400">
                    {MUSCLE_GROUP_LABELS[ex.category as MuscleGroup] ?? ex.category}
                  </p>
                </div>
                <Plus size={16} className="text-navy-500" />
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}
