import * as React from "react"

export function Badge({ children, variant = "default", className = "", ...props }: { children: React.ReactNode, variant?: "default" | "secondary" | "destructive", className?: string } & React.HTMLAttributes<HTMLSpanElement>) {
  let color = "bg-green-100 text-green-800 border-green-200"
  if (variant === "secondary") color = "bg-gray-100 text-gray-800 border-gray-200"
  if (variant === "destructive") color = "bg-red-100 text-red-800 border-red-200"
  return (
    <span className={`inline-block px-2 py-1 rounded border text-xs font-semibold ${color} ${className}`} {...props}>
      {children}
    </span>
  )
}
