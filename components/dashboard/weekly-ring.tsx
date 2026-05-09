"use client"

interface WeeklyRingProps {
  completed: number
  goal: number
  size?: number
}

export function WeeklyRing({ completed, goal, size = 80 }: WeeklyRingProps) {
  const percent = goal > 0 ? Math.min(1, completed / goal) : 0
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDash = circumference * percent
  const isGoalMet = completed >= goal

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E8ECF4"
          strokeWidth={10}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isGoalMet ? "#22C55E" : "#1B3A6B"}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${strokeDash} ${circumference}`}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-lg font-bold text-gray-900 leading-none">{completed}</span>
        <span className="text-[10px] text-gray-400">/{goal}回</span>
      </div>
    </div>
  )
}
