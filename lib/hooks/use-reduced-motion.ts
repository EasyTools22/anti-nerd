"use client";
import { createContext, useContext, useSyncExternalStore } from "react";
const query = "(prefers-reduced-motion: reduce)";
const subscribe = (callback: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
export const MotionPreferenceContext = createContext({
  reduce: false,
  setReduce: (_value: boolean) => {
    void _value;
  },
});
export function useMotionPreference() {
  return useContext(MotionPreferenceContext);
}
export function useReducedMotion() {
  const preference = useMotionPreference();
  const systemReduced = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => true,
  );
  return preference.reduce || systemReduced;
}
