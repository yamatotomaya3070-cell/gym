import { cn } from "@/lib/utils/cn"
import { ButtonHTMLAttributes, forwardRef } from "react"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline"
  size?: "sm" | "md" | "lg" | "icon"
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-navy-500 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none select-none"

    const variants = {
      primary: "bg-navy-500 text-white hover:bg-navy-600 active:bg-navy-700",
      secondary: "bg-navy-50 text-navy-500 hover:bg-navy-100 active:bg-navy-200",
      ghost: "text-gray-600 hover:bg-surface-secondary active:bg-gray-100",
      danger: "bg-danger text-white hover:bg-red-600 active:bg-red-700",
      outline: "border border-border text-gray-700 hover:bg-surface-secondary active:bg-gray-100",
    }

    const sizes = {
      sm: "px-3 py-1.5 text-sm h-8",
      md: "px-4 py-2.5 text-sm h-10",
      lg: "px-6 py-3 text-base h-12",
      icon: "w-10 h-10 p-0",
    }

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = "Button"

export { Button }
