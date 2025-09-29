import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantClasses = {
    default: 'badge',
    secondary: 'badge badge-secondary',
    destructive: 'badge badge-destructive',
    outline: 'badge badge-outline',
  }

  return (
    <div className={cn(variantClasses[variant], className)} {...props} />
  )
}

export { Badge }