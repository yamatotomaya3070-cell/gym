import { cn } from "@/lib/utils/cn"
import { InputHTMLAttributes, forwardRef } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  suffix?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, suffix, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-xs font-medium text-gray-500">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <input
            id={id}
            ref={ref}
            className={cn(
              "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm",
              "placeholder:text-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error && "border-danger focus:ring-danger",
              suffix && "pr-10",
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 text-xs text-gray-400 pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    )
  }
)

Input.displayName = "Input"

export { Input }
