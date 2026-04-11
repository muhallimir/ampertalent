'use client';

import { ThemeProvider } from "next-themes";
import { ToastProvider } from "@/components/ui/toast";

export function Provider(props: { children?: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
    >
      <ToastProvider>
        {props.children}
      </ToastProvider>
    </ThemeProvider>
  );
}