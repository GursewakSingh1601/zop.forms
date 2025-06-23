import { Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
  variant?: "default" | "light" | "minimal"
}

export function Logo({ className, size = "md", variant = "default" }: LogoProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  }

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-5 h-5",
    lg: "w-7 h-7",
  }

  const variants = {
    default: "bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25",
    light: "bg-gradient-to-br from-sky-300 via-blue-400 to-indigo-500 shadow-lg shadow-sky-400/30",
    minimal: "bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 shadow-md shadow-blue-400/20",
  }

  return (
    <div
      className={cn(
        "rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 hover:shadow-xl",
        sizeClasses[size],
        variants[variant],
        variant === "light" && "hover:shadow-sky-400/40",
        variant === "default" && "hover:shadow-blue-500/35",
        variant === "minimal" && "hover:shadow-blue-400/30",
        className,
      )}
    >
      <Zap className={cn("text-white drop-shadow-sm", iconSizes[size])} fill="currentColor" />
    </div>
  )
}
