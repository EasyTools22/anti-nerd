"use client";
import { useState, type ReactNode } from "react";
import { MotionPreferenceContext } from "@/lib/hooks/use-reduced-motion";
export function MotionPreferences({ children }: { children: ReactNode }) {
  const [reduce, setReduce] = useState(false);
  return (
    <MotionPreferenceContext.Provider value={{ reduce, setReduce }}>
      {children}
    </MotionPreferenceContext.Provider>
  );
}
