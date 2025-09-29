import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    const variantClasses = {
      default: 'button button-primary',
      destructive: 'button button-destructive',
      outline: 'button button-outline',
      secondary: 'button button-secondary',
      ghost: 'button button-ghost',
      link: 'button button-link',
    }
    
    const sizeClasses = {
      default: '',
      sm: 'button-sm',
      lg: 'button-lg',
      icon: 'button-icon',
    }
    
    return (
      <Comp
        className={cn(variantClasses[variant], sizeClasses[size], className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }