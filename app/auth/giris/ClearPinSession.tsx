"use client";
import { useEffect } from "react";
export default function ClearPinSession() {
  useEffect(() => {
    sessionStorage.removeItem("gastronom_rol");
  }, []);
  return null;
}
