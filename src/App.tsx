import { useEffect } from "react";
import { AmbientBackground } from "./components/AmbientBackground";
import { CyclingDashboard } from "./components/CyclingDashboard";
import { useNetworkStore } from "./store/useNetworkStore";

export default function App() {
  const { locale, theme } = useNetworkStore();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale, theme]);

  return (
    <main className="cycling-intelligence-app">
      <AmbientBackground />
      <CyclingDashboard />
    </main>
  );
}
