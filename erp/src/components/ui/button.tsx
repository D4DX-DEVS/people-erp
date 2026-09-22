import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Hover sheen: a soft gradient band that sweeps across the button. It is a
// translucent overlay rather than a fixed colour, so it picks up whatever the
// button's own background is and works on solid, gradient and outline buttons
// alike — each variant only chooses how strong the band is.
//
// `isolate` + `before:-z-10` keeps the band above the button's background but
// behind its label: a plain absolute pseudo-element would paint over the text.
const SHEEN =
  "relative isolate overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:-z-10 " +
  "before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:to-transparent " +
  "before:transition-transform before:duration-700 before:ease-out hover:before:translate-x-full " +
  "motion-reduce:before:transition-none motion-reduce:hover:before:translate-x-full";

const buttonVariants = cva(
  `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 ${SHEEN}`,
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 before:via-white/25",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 before:via-white/25",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground before:via-foreground/10",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 before:via-white/40",
        ghost: "hover:bg-accent hover:text-accent-foreground before:via-foreground/10",
        // Link is bare text with no surface for a band to travel across.
        link: "text-primary underline-offset-4 hover:underline before:hidden",
      },
      size: {
        default: "h-9 px-3.5 py-1.5",
        sm: "h-8 rounded-md px-2.5 text-xs",
        lg: "h-10 rounded-md px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
