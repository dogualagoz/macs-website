import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function AnalyticsTracker() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.va === "function") {
      window.va("pageview", { path: pathname + search });
    }
  }, [pathname, search]);

  return null;
}