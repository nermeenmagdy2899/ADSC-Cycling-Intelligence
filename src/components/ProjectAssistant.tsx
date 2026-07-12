import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrainCircuit, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { designPrinciples, milestones, networkRoutes, personas, strategyPrinciples } from "../data/network";
import { formatForecast, personaAr, routeDescription, routeLabel, routeName, routeTypeDescription, routeTypeName, uiCopy } from "../i18n";
import { useNetworkStore } from "../store/useNetworkStore";
import { useClickOutside } from "../hooks/useClickOutside";

type Message = {
  role: "assistant" | "user";
  text: string;
};

const suggestions = {
  en: [
    "Which track completes first?",
    "Compare Track 1 and Track 2",
    "What are the user groups?",
    "Explain the route types"
  ],
  ar: [
    "أي مسار يكتمل أولاً؟",
    "قارن المسار 1 والمسار 2",
    "ما فئات المستخدمين؟",
    "اشرح أنواع المسارات"
  ]
};

export function ProjectAssistant() {
  const { locale, setSelectedRouteId, setSoloRouteId, setPlayback } = useNetworkStore();
  const c = uiCopy[locale];
  const thinkingLabel = locale === "ar" ? "\u062c\u0627\u0631\u064d \u062a\u062d\u0644\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0634\u0631\u0648\u0639" : "Analysing project intelligence";
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [thinking, setThinking] = useState(false);
  const reduceMotion = useReducedMotion();
  const dockRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const closeAssistant = useCallback(() => setOpen(false), []);
  useClickOutside(dockRef, closeAssistant, open);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text:
        locale === "ar"
          ? "أنا المساعد. اسألني عن الرؤية، مبادئ التخطيط، فئات المستخدمين، أنواع المسارات، المقاولين، التقدم، أو مواعيد الإنجاز."
          : "I’m assistant. Ask me about the vision, planning principles, user groups, route types, contractors, progress, or forecast dates."
    }
  ]);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        text:
          locale === "ar"
            ? "أنا المساعد. اسألني عن الرؤية، مبادئ التخطيط، فئات المستخدمين، أنواع المسارات، المقاولين، التقدم، أو مواعيد الإنجاز."
            : "I’m assistant. Ask me about the vision, planning principles, user groups, route types, contractors, progress, or forecast dates."
      }
    ]);
  }, [locale]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const node = messagesRef.current;
      node?.scrollTo({ top: node.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, thinking, open, reduceMotion]);

  const highlighted = useMemo(() => networkRoutes.find((route) => route.forecast.includes("2026")) ?? networkRoutes[0], []);

  const ask = async (question: string) => {
    const clean = question.trim();
    if (!clean || thinking) return;
    const route = findMentionedRoute(clean);
    if (route) {
      setSelectedRouteId(route.id);
      setSoloRouteId(route.id);
      setPlayback("playing");
    }
    setMessages((current) => [...current, { role: "user", text: clean }]);
    setPrompt("");
    setOpen(true);
    setThinking(true);
    const responseStartedAt = performance.now();
    let answer: string;
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean, locale, context: buildProjectContext(locale) })
      });
      if (!response.ok) throw new Error("assistant unavailable");
      const payload = (await response.json()) as { answer?: string };
      if (!payload.answer) throw new Error("empty assistant response");
      answer = payload.answer;
    } catch {
      answer = answerQuestion(clean, locale);
    } finally {
      const remainingDelay = Math.max(0, 520 - (performance.now() - responseStartedAt));
      if (remainingDelay) await new Promise((resolve) => setTimeout(resolve, remainingDelay));
      setMessages((current) => [...current, { role: "assistant", text: answer }]);
      setThinking(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    ask(prompt);
  };

  return (
    <div ref={dockRef} className="assistant-dock" aria-live="polite">
      <motion.button className="assistant-toggle" aria-label={open ? c.closeAssistant : c.openAssistant} onClick={() => setOpen((value) => !value)} whileHover={reduceMotion ? undefined : { y: -3, scale: 1.035 }} whileTap={reduceMotion ? undefined : { scale: 0.94 }}>
        <span className="assistant-toggle-ring" />
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </motion.button>
      <AnimatePresence>
      {open ? (
        <motion.aside className="assistant-panel" role="dialog" aria-label={c.assistant} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }} transition={{ duration: reduceMotion ? 0.1 : 0.28, ease: [0.16, 1, 0.3, 1] }}>
          <div className="assistant-header">
            <div className="assistant-orb">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <p>{c.assistant}</p>
              <strong>{locale === "ar" ? "طبقة معرفة تنفيذية" : "Executive knowledge layer"}</strong>
            </div>
            <span className="assistant-online"><i />{locale === "ar" ? "\u0645\u062a\u0635\u0644" : "Online"}</span>
          </div>
          <p className="assistant-subtitle">{c.assistantSubtitle}</p>
          <div className="assistant-insight">
            <Sparkles className="h-4 w-4" />
            <span>
              {locale === "ar"
                ? `${routeLabel(highlighted, locale)} ضمن نافذة الإنجاز الأقرب: ${formatForecast(highlighted.forecast, locale)}.`
                : `${routeLabel(highlighted, locale)} is in the nearest completion window: ${formatForecast(highlighted.forecast, locale)}.`}
            </span>
          </div>
          <div className="assistant-messages" ref={messagesRef}>
            {messages.map((message, index) => (
              <motion.div className={`assistant-message ${message.role}`} key={`${message.role}-${index}`} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reduceMotion ? 0.1 : 0.24, delay: reduceMotion ? 0 : Math.min(index * 0.025, 0.14) }}>
                {message.text}
              </motion.div>
            ))}
            {thinking ? (
              <div className="assistant-message assistant is-thinking" role="status">
                <span className="assistant-typing-dots" aria-hidden="true"><i /><i /><i /></span>
                <span>{thinkingLabel}</span>
              </div>
            ) : null}
          </div>
          <div className="assistant-suggestions">
            <span>{c.suggested}</span>
            {suggestions[locale].map((item) => (
              <button key={item} onClick={() => ask(item)}>
                {item}
              </button>
            ))}
          </div>
          <form className="assistant-form" onSubmit={onSubmit}>
            <input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={c.askPlaceholder} disabled={thinking} aria-label={c.askPlaceholder} />
            <button aria-label={c.send} type="submit" disabled={thinking || !prompt.trim()}>
              <Send className="h-4 w-4" />
            </button>
          </form>
        </motion.aside>
      ) : null}
      </AnimatePresence>
    </div>
  );
}

function buildProjectContext(locale: "en" | "ar") {
  const routeRows = networkRoutes.map((route) => ({
    id: route.id,
    name: routeName(route, locale),
    label: routeLabel(route, locale),
    description: routeDescription(route, locale),
    type: routeTypeName[locale][route.type],
    plannedKm: route.plannedKm,
    completedKm: route.completedKm,
    completionPct: Math.round((route.completedKm / route.plannedKm) * 100),
    status: route.status,
    contractor: route.contractor,
    forecast: formatForecast(route.forecast, locale),
    structures: route.structures
  }));
  return {
    routes: routeRows,
    milestones,
    planningPrinciples: strategyPrinciples.map((item) => item.title),
    designPrinciples,
    userGroups: personas.map((persona) => ({ name: personaAr[persona.name]?.name ?? persona.name, requirements: persona.requirements })),
    routeTypes: (["type-01", "type-02", "type-03", "hsct"] as const).map((type) => ({ name: routeTypeName[locale][type], description: routeTypeDescription[locale][type] }))
  };
}

function findMentionedRoute(question: string) {
  const text = question.toLowerCase();
  return networkRoutes.find((route) => {
    const aliases = [route.id, route.name, route.label, route.packageName].map((item) => item.toLowerCase());
    if (route.id === "hsct") aliases.push("high-speed", "high speed", "hsct");
    if (route.id === "track-2-b") aliases.push("track 2b", "2b");
    if (route.id === "track-2-a") aliases.push("track 2a", "2a");
    if (route.id === "track-3") aliases.push("track 3");
    if (route.id === "track-4") aliases.push("track 4");
    if (route.id === "track-1-p12") aliases.push("track 1 p1", "packages 1", "حزم 1");
    if (route.id === "track-1-p34") aliases.push("track 1 p3", "packages 3", "حزم 3");
    return aliases.some((alias) => text.includes(alias));
  });
}

function answerQuestion(question: string, locale: "en" | "ar") {
  const text = question.toLowerCase();
  const mentioned = findMentionedRoute(question);
  const totals = {
    planned: networkRoutes.reduce((sum, route) => sum + route.plannedKm, 0),
    completed: networkRoutes.reduce((sum, route) => sum + route.completedKm, 0)
  };
  const closest = [...networkRoutes].sort((a, b) => b.completedKm / b.plannedKm - a.completedKm / a.plannedKm)[0];
  const latest = milestones.slice(-4);

  if (mentioned) {
    const pct = Math.round((mentioned.completedKm / mentioned.plannedKm) * 100);
    return locale === "ar"
      ? `${routeName(mentioned, locale)}: ${routeDescription(mentioned, locale)} المخطط ${mentioned.plannedKm} كم، المنجز ${mentioned.completedKm} كم (${pct}%). المقاول: ${mentioned.contractor}. التوقع: ${formatForecast(mentioned.forecast, locale)}.`
      : `${routeName(mentioned, locale)}: ${routeDescription(mentioned, locale)} Planned ${mentioned.plannedKm} km, completed ${mentioned.completedKm} km (${pct}%). Contractor: ${mentioned.contractor}. Forecast: ${formatForecast(mentioned.forecast, locale)}.`;
  }

  if (text.includes("closest") || text.includes("nearest") || text.includes("completion") || text.includes("\u0627\u0644\u0623\u0642\u0631\u0628") || text.includes("\u0627\u0643\u062a\u0645\u0627\u0644")) {
    const pct = Math.round((closest.completedKm / closest.plannedKm) * 100);
    return locale === "ar"
      ? `${routeName(closest, locale)} \u0647\u0648 \u0627\u0644\u0623\u0642\u0631\u0628 \u0644\u0644\u0627\u0643\u062a\u0645\u0627\u0644 \u0628\u0646\u0633\u0628\u0629 ${pct}%\u060c \u062d\u064a\u062b \u062a\u0645 \u0625\u0646\u062c\u0627\u0632 ${closest.completedKm} \u0643\u0645 \u0645\u0646 \u0623\u0635\u0644 ${closest.plannedKm} \u0643\u0645.`
      : `${routeName(closest, locale)} is closest to completion at ${pct}%, with ${closest.completedKm} km completed out of ${closest.plannedKm} km.`;
  }

  if (text.includes("contractor") || text.includes("مقاول")) {
    const rows = networkRoutes.map((route) => `${routeLabel(route, locale)}: ${route.contractor}`).join(locale === "ar" ? "؛ " : "; ");
    return locale === "ar" ? `المقاولون حسب المسارات: ${rows}.` : `Contractors by route: ${rows}.`;
  }

  if (text.includes("date") || text.includes("forecast") || text.includes("complete") || text.includes("موعد") || text.includes("يكتمل") || text.includes("إنجاز")) {
    const rows = latest.map((item) => `${formatForecast(item.date, locale)} - ${locale === "ar" ? item.title.replace("Forecast", "توقع") : item.title}`).join(locale === "ar" ? "؛ " : "; ");
    return locale === "ar"
      ? `${routeName(closest, locale)} هو الأقرب للاكتمال. المواعيد الرئيسية: ${rows}.`
      : `${routeName(closest, locale)} is closest to completion. Key forecast dates: ${rows}.`;
  }

  if (text.includes("user") || text.includes("persona") || text.includes("مستخدم") || text.includes("فئات")) {
    return locale === "ar"
      ? `فئات المستخدمين هي: ${personas.map((persona) => personaAr[persona.name]?.name ?? persona.name).join("، ")}. وتترجم إلى متطلبات مثل الوصول، الراحة، الإرشاد، التكامل مع النقل، وتقليل التعارض.`
      : `The user groups are ${personas.map((persona) => persona.name).join(", ")}. They drive requirements for access, rest, wayfinding, transit integration, comfort, and conflict reduction.`;
  }

  if (text.includes("type") || text.includes("route type") || text.includes("نوع") || text.includes("أنواع")) {
    const types = (["type-01", "type-02", "type-03", "hsct"] as const)
      .map((type) => `${routeTypeName[locale][type]}: ${routeTypeDescription[locale][type]}`)
      .join(locale === "ar" ? "؛ " : "; ");
    return types;
  }

  if (text.includes("vision") || text.includes("principle") || text.includes("رؤية") || text.includes("مبادئ")) {
    return locale === "ar"
      ? `الرؤية هي تحويل أبوظبي إلى شبكة تنقل نشط واضحة ومتكاملة. مبادئ التخطيط السبعة: ${strategyPrinciples.map((item) => item.title).join(", ")}. وتتوسع أسس التصميم إلى ${designPrinciples.length} مبدأ تصميم.`
      : `The vision is to translate Abu Dhabi's active mobility ambition into a clear cycling network. The seven planning principles are ${strategyPrinciples.map((item) => item.title).join(", ")}. The design framework expands into ${designPrinciples.length} design principles.`;
  }

  if (text.includes("track 1") && text.includes("track 2")) {
    const track1 = networkRoutes.filter((route) => route.id.startsWith("track-1"));
    const track2 = networkRoutes.filter((route) => route.id.startsWith("track-2"));
    const summarize = (routes: typeof networkRoutes) => ({
      planned: routes.reduce((sum, route) => sum + route.plannedKm, 0),
      completed: routes.reduce((sum, route) => sum + route.completedKm, 0)
    });
    const one = summarize(track1);
    const two = summarize(track2);
    return locale === "ar"
      ? `المسار 1: ${one.planned.toFixed(1)} كم مخطط و${one.completed.toFixed(1)} كم منجز. المسار 2: ${two.planned.toFixed(1)} كم مخطط و${two.completed.toFixed(1)} كم منجز، مع القسم B لم يبدأ بعد.`
      : `Track 1: ${one.planned.toFixed(1)} km planned and ${one.completed.toFixed(1)} km completed. Track 2: ${two.planned.toFixed(1)} km planned and ${two.completed.toFixed(1)} km completed, with Section B not started.`;
  }

  return locale === "ar"
    ? `إجمالي الشبكة المخططة ${totals.planned.toFixed(1)} كم والمنجز ${totals.completed.toFixed(1)} كم. اسألني عن مسار محدد، نوع مسار، المقاولين، فئات المستخدمين، أو مواعيد الإنجاز.`
    : `The planned network is ${totals.planned.toFixed(1)} km with ${totals.completed.toFixed(1)} km completed. Ask about a specific route, route type, contractor, user group, or completion date.`;
}
