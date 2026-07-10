import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";
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
  const { locale, setSelectedRouteId, setPlayback } = useNetworkStore();
  const c = uiCopy[locale];
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const dockRef = useRef<HTMLDivElement | null>(null);
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

  const highlighted = useMemo(() => networkRoutes.find((route) => route.forecast.includes("2026")) ?? networkRoutes[0], []);

  const ask = (question: string) => {
    const clean = question.trim();
    if (!clean) return;
    const answer = answerQuestion(clean, locale);
    const route = findMentionedRoute(clean);
    if (route) {
      setSelectedRouteId(route.id);
      setPlayback("playing");
    }
    setMessages((current) => [...current, { role: "user", text: clean }, { role: "assistant", text: answer }]);
    setPrompt("");
    setOpen(true);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    ask(prompt);
  };

  return (
    <div ref={dockRef} className="assistant-dock" aria-live="polite">
      <button className="assistant-toggle" aria-label={open ? c.closeAssistant : c.openAssistant} onClick={() => setOpen((value) => !value)}>
        <span className="assistant-toggle-ring" />
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
      {open ? (
        <aside className="assistant-panel" role="dialog" aria-label={c.assistant}>
          <div className="assistant-header">
            <div className="assistant-orb">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p>{c.assistant}</p>
              <strong>{locale === "ar" ? "طبقة معرفة تنفيذية" : "Executive knowledge layer"}</strong>
            </div>
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
          <div className="assistant-messages">
            {messages.map((message, index) => (
              <div className={`assistant-message ${message.role}`} key={`${message.role}-${index}`}>
                {message.text}
              </div>
            ))}
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
            <input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={c.askPlaceholder} />
            <button aria-label={c.send} type="submit">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </aside>
      ) : null}
    </div>
  );
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
