import { type InputHTMLAttributes } from "react";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:border-indigo-500 focus:ring-2 ${className}`}
      {...props}
    />
  );
}
