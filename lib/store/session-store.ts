"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface SetData {
  id: string
  weightKg: number | null
  reps: number | null
  rpe: number | null
  isCompleted: boolean
}

export interface ExerciseSessionData {
  exerciseId: string
  exerciseName: string
  category: string
  sets: SetData[]
  defaultRestSeconds: number
  previousSets: { weightKg: number | null; reps: number | null; rpe: number | null }[]
}

export interface TimerState {
  isActive: boolean
  endTime: number | null
  totalSeconds: number
  exerciseIndex: number
  setIndex: number
}

export interface SessionStoreState {
  sessionId: string | null
  routineId: string | null
  routineName: string
  startedAt: string | null
  exercises: ExerciseSessionData[]
  currentExerciseIndex: number
  timer: TimerState
  isActive: boolean

  // Actions
  startSession: (params: {
    sessionId: string
    routineId: string | null
    routineName: string
    exercises: ExerciseSessionData[]
  }) => void
  updateSet: (
    exerciseIndex: number,
    setIndex: number,
    data: Partial<Omit<SetData, "id">>
  ) => void
  completeSet: (exerciseIndex: number, setIndex: number) => void
  addSet: (exerciseIndex: number) => void
  removeSet: (exerciseIndex: number, setIndex: number) => void
  addExercise: (exercise: ExerciseSessionData) => void
  removeExercise: (exerciseIndex: number) => void
  startTimer: (seconds: number, exerciseIndex: number, setIndex: number) => void
  stopTimer: () => void
  setCurrentExercise: (index: number) => void
  endSession: () => void
  clearSession: () => void
}

const DEFAULT_TIMER: TimerState = {
  isActive: false,
  endTime: null,
  totalSeconds: 60,
  exerciseIndex: 0,
  setIndex: 0,
}

export const useSessionStore = create<SessionStoreState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      routineId: null,
      routineName: "",
      startedAt: null,
      exercises: [],
      currentExerciseIndex: 0,
      timer: DEFAULT_TIMER,
      isActive: false,

      startSession: ({ sessionId, routineId, routineName, exercises }) => {
        set({
          sessionId,
          routineId,
          routineName,
          startedAt: new Date().toISOString(),
          exercises,
          currentExerciseIndex: 0,
          timer: DEFAULT_TIMER,
          isActive: true,
        })
      },

      updateSet: (exerciseIndex, setIndex, data) => {
        const exercises = [...get().exercises]
        const exercise = { ...exercises[exerciseIndex] }
        const sets = [...exercise.sets]
        sets[setIndex] = { ...sets[setIndex], ...data }
        exercise.sets = sets
        exercises[exerciseIndex] = exercise
        set({ exercises })
      },

      completeSet: (exerciseIndex, setIndex) => {
        const exercises = [...get().exercises]
        const exercise = { ...exercises[exerciseIndex] }
        const sets = [...exercise.sets]
        sets[setIndex] = { ...sets[setIndex], isCompleted: true }
        exercise.sets = sets
        exercises[exerciseIndex] = exercise
        const restSeconds = exercise.defaultRestSeconds
        set({ exercises })
        get().startTimer(restSeconds, exerciseIndex, setIndex)
      },

      addSet: (exerciseIndex) => {
        const exercises = [...get().exercises]
        const exercise = { ...exercises[exerciseIndex] }
        const lastSet = exercise.sets[exercise.sets.length - 1]
        const newSet: SetData = {
          id: crypto.randomUUID(),
          weightKg: lastSet?.weightKg ?? null,
          reps: lastSet?.reps ?? null,
          rpe: null,
          isCompleted: false,
        }
        exercise.sets = [...exercise.sets, newSet]
        exercises[exerciseIndex] = exercise
        set({ exercises })
      },

      removeSet: (exerciseIndex, setIndex) => {
        const exercises = [...get().exercises]
        const exercise = { ...exercises[exerciseIndex] }
        if (exercise.sets.length <= 1) return
        exercise.sets = exercise.sets.filter((_, i) => i !== setIndex)
        exercises[exerciseIndex] = exercise
        set({ exercises })
      },

      addExercise: (exercise) => {
        const exercises = [...get().exercises, exercise]
        set({ exercises, currentExerciseIndex: exercises.length - 1 })
      },

      removeExercise: (exerciseIndex) => {
        const exercises = get().exercises.filter((_, i) => i !== exerciseIndex)
        const current = get().currentExerciseIndex
        const nextIndex =
          current >= exercises.length ? Math.max(0, exercises.length - 1) : current
        set({ exercises, currentExerciseIndex: nextIndex })
      },

      startTimer: (seconds, exerciseIndex, setIndex) => {
        set({
          timer: {
            isActive: true,
            endTime: Date.now() + seconds * 1000,
            totalSeconds: seconds,
            exerciseIndex,
            setIndex,
          },
        })
      },

      stopTimer: () => {
        set({ timer: { ...get().timer, isActive: false, endTime: null } })
      },

      setCurrentExercise: (index) => {
        set({ currentExerciseIndex: index })
      },

      endSession: () => {
        set({ isActive: false })
      },

      clearSession: () => {
        set({
          sessionId: null,
          routineId: null,
          routineName: "",
          startedAt: null,
          exercises: [],
          currentExerciseIndex: 0,
          timer: DEFAULT_TIMER,
          isActive: false,
        })
      },
    }),
    {
      name: "gym-note-session",
      partialize: (state) => ({
        sessionId: state.sessionId,
        routineId: state.routineId,
        routineName: state.routineName,
        startedAt: state.startedAt,
        exercises: state.exercises,
        currentExerciseIndex: state.currentExerciseIndex,
        isActive: state.isActive,
      }),
    }
  )
)
