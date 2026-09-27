import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const inputBase =
  "block w-full rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 " +
  "transition-colors focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 " +
  "disabled:bg-slate-100 disabled:text-slate-500";

export const inputBorder = (invalid?: boolean) =>
  invalid ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "border-slate-300";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(inputBase, inputBorder(invalid), "h-10", className)}
      {...props}
    />
  );
});

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, rows = 3, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(inputBase, inputBorder(invalid), "py-2 leading-relaxed", className)}
      {...props}
    />
  );
});

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(inputBase, inputBorder(invalid), "h-10 pe-8 ps-3", className)}
      {...props}
    >
      {children}
    </select>
  );
});
