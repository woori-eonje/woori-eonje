import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:     "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:   "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline:     "border border-primary bg-background text-primary hover:bg-secondary",
        ghost:       "bg-transparent text-foreground hover:bg-muted",
        destructive: "bg-background text-destructive border border-destructive/40 hover:bg-destructive/5",
        link:        "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm:      "h-9  rounded-md   px-3   text-sm  [&_svg]:size-3.5",
        default: "h-12 rounded-[var(--radius)] px-5 text-[15px] [&_svg]:size-4",
        lg:      "h-14 rounded-[var(--radius)] px-7 text-base  [&_svg]:size-5",
        icon:    "h-10 w-10 rounded-[var(--radius)] [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
