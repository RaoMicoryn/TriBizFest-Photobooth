"use client";

import * as React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { haptic } from "@/lib/haptics";

function cn(...inputs: unknown[]) {
  return twMerge(clsx(inputs));
}

type Variant = "primary" | "accent" | "secondary" | "outline" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-semibold transition-all duration-200 select-none touch focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 disabled:active:scale-100";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-navy-700 via-navy-600 to-navy-500 text-white shadow-lg shadow-navy-800/30 hover:shadow-xl hover:shadow-navy-800/40 hover:brightness-[1.04]",
  accent:
    "bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white shadow-lg shadow-orange-600/30 ring-1 ring-inset ring-white/20 hover:shadow-xl hover:shadow-orange-600/40 hover:brightness-[1.04]",
  secondary:
    "bg-ink text-white shadow-md shadow-ink/20 hover:bg-ink/90",
  outline:
    "border border-navy-200/70 bg-white/80 text-ink shadow-sm hover:bg-white hover:border-navy-300 backdrop-blur",
  ghost: "text-ink-soft hover:bg-navy-100/60 hover:text-ink",
  danger:
    "bg-gradient-to-br from-rose-500 to-red-500 text-white shadow-lg shadow-rose-500/30 hover:brightness-105",
  link: "text-navy-700 underline-offset-4 hover:text-orange-600 hover:underline px-0",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-12 px-5 text-sm",
  lg: "h-14 px-7 text-base",
  icon: "h-11 w-11 rounded-2xl",
};

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const Button: React.FC<ButtonProps> = ({
  className,
  variant = "primary",
  size = "md",
  disabled = false,
  type = "button",
  onClick,
  ...props
}) => {
  return (
    <button
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled}
      onClick={(e) => {
        haptic("tap");
        onClick?.(e);
      }}
      {...props}
    />
  );
};
Button.displayName = "Button";

export { Button, cn };
export type { Variant as ButtonVariant, Size as ButtonSize };
