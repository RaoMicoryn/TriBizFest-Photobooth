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
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-bold transition-all duration-200 select-none touch focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 active:translate-y-[1px] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45 disabled:active:translate-y-0 disabled:active:scale-100";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-navy-700 to-navy-900 text-cream shadow-[0_3px_0_#080926,0_16px_30px_-14px_rgba(13,14,60,0.75)] ring-1 ring-inset ring-white/12 hover:from-navy-600 hover:to-navy-800 active:shadow-[0_1px_0_#080926]",
  accent:
    "bg-gradient-to-b from-orange-500 to-orange-700 text-white shadow-[0_3px_0_#5c0716,0_16px_30px_-14px_rgba(200,16,46,0.75)] ring-1 ring-inset ring-white/20 hover:brightness-[1.04] active:shadow-[0_1px_0_#5c0716]",
  secondary:
    "bg-ink text-cream shadow-[0_3px_0_#000,0_14px_26px_-14px_rgba(20,16,42,0.8)] hover:bg-ink/90 active:shadow-[0_1px_0_#000]",
  outline:
    "border border-ink/12 bg-white/85 text-ink shadow-soft backdrop-blur hover:bg-white hover:border-ink/20",
  ghost: "text-ink-soft hover:bg-navy-100/60 hover:text-ink",
  danger:
    "bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-[0_3px_0_#5c0716,0_14px_26px_-14px_rgba(176,14,40,0.7)] ring-1 ring-inset ring-white/20 hover:brightness-105 active:shadow-[0_1px_0_#5c0716]",
  link: "text-navy-700 underline-offset-4 hover:text-orange-600 hover:underline px-0",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[12px]",
  md: "h-12 px-5 text-[13px]",
  lg: "h-14 px-7 text-[15px]",
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
