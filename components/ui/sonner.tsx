"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-black group-[.toaster]:border-zinc-200 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-zinc-500",
          actionButton: "group-[.toast]:bg-black group-[.toast]:text-white",
          cancelButton: "group-[.toast]:bg-zinc-100 group-[.toast]:text-zinc-500",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
