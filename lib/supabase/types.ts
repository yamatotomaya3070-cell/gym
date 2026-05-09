export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// 6大分類（DBのcategoryカラム値）
export type MuscleGroup = "chest" | "back" | "shoulder" | "arm" | "leg" | "core"

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest:    "胸",
  back:     "背中",
  shoulder: "肩",
  arm:      "腕",
  leg:      "脚",
  core:     "体幹",
}

// UIフィルター用：大分類 → サブ筋肉タグ
export interface MuscleGroupDef {
  key: MuscleGroup
  label: string
  subMuscles: string[]
}

export const MUSCLE_GROUPS: MuscleGroupDef[] = [
  {
    key: "chest",
    label: "胸",
    subMuscles: [
      "大胸筋上部",
      "大胸筋中部",
      "大胸筋下部",
      "前鋸筋",
    ],
  },
  {
    key: "back",
    label: "背中",
    subMuscles: [
      "広背筋",
      "僧帽筋上部",
      "僧帽筋中部",
      "僧帽筋下部",
      "脊柱起立筋",
      "大円筋",
      "菱形筋",
    ],
  },
  {
    key: "shoulder",
    label: "肩",
    subMuscles: [
      "三角筋前部",
      "三角筋中部",
      "三角筋後部",
      "回旋筋腱板",
    ],
  },
  {
    key: "arm",
    label: "腕",
    subMuscles: [
      "上腕二頭筋長頭",
      "上腕二頭筋短頭",
      "上腕三頭筋長頭",
      "上腕三頭筋外側頭",
      "上腕三頭筋内側頭",
      "上腕筋",
      "腕橈骨筋",
      "前腕屈筋群",
      "前腕伸筋群",
    ],
  },
  {
    key: "leg",
    label: "脚",
    subMuscles: [
      "大腿四頭筋",
      "大腿直筋",
      "外側広筋",
      "内側広筋",
      "ハムストリングス",
      "大腿二頭筋",
      "大臀筋",
      "中臀筋",
      "内転筋群",
      "腓腹筋",
      "ヒラメ筋",
    ],
  },
  {
    key: "core",
    label: "体幹",
    subMuscles: [
      "腹直筋上部",
      "腹直筋下部",
      "腹斜筋",
      "腹横筋",
      "腸腰筋",
    ],
  },
]

export type PhotoAngle = "front" | "side" | "back"

export interface Exercise {
  id: string
  user_id: string | null
  name: string
  category: string
  description: string | null
  form_points: string[] | null
  primary_muscles: string[] | null
  secondary_muscles: string[] | null
  is_custom: boolean
  created_at: string
}

export interface Routine {
  id: string
  user_id: string
  name: string
  note: string | null
  created_at: string
}

export interface RoutineExercise {
  id: string
  routine_id: string
  exercise_id: string
  order_index: number
  default_sets: number
  default_rest_seconds: number
  exercise?: Exercise
}

export interface Session {
  id: string
  user_id: string
  routine_id: string | null
  started_at: string
  ended_at: string | null
  note: string | null
}

export interface SessionSet {
  id: string
  session_id: string
  exercise_id: string
  set_number: number
  weight_kg: number | null
  reps: number | null
  rpe: number | null
  is_completed: boolean
  created_at: string
}

export interface Goal {
  id: string
  user_id: string
  gym_days_per_week: number
  created_at: string
}

export interface ExerciseGoal {
  id: string
  user_id: string
  exercise_id: string
  weekly_weight_increase_kg: number
}

export interface BodyMeasurement {
  id: string
  user_id: string
  weight_kg: number | null
  body_fat_pct: number | null
  chest_cm: number | null
  waist_cm: number | null
  hip_cm: number | null
  thigh_cm: number | null
  arm_cm: number | null
  measured_at: string
}

export interface ProgressPhoto {
  id: string
  user_id: string
  photo_url: string
  angle: PhotoAngle
  body_measurement_id: string | null
  note: string | null
  taken_at: string
}

// Enriched types for UI
export interface RoutineWithExercises extends Routine {
  routine_exercises: (RoutineExercise & { exercise: Exercise })[]
}

export interface SessionWithSets extends Session {
  session_sets: SessionSet[]
  routine?: Routine | null
}
