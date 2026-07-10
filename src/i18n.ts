import type { NetworkRoute, RouteStatus, RouteType } from "./data/network";

export type Locale = "en" | "ar";

export const rtl = (locale: Locale) => locale === "ar";

export const uiCopy = {
  en: {
    plannedNetwork: "Planned Network",
    language: "Language",
    theme: "Theme",
    lightMode: "Light mode",
    darkMode: "Dark mode",
    displayOptions: "Display options",
    completed: "Completed",
    remaining: "Remaining",
    completion: "Completion",
    executiveView: "Executive view",
    dashboardEyebrow: "Construction Progress Dashboard",
    dashboardTitle: "Abu Dhabi Cycling Network Programme Status",
    liveSpatialStory: "Live Spatial Story",
    chapterNav: "Story chapter navigation",
    previousChapter: "Previous chapter",
    nextChapter: "Next chapter",
    chapterPosition: "Chapter position",
    mapBadgeTitle: "Live network map",
    mapBadgeText: "GeoJSON route intelligence — hover, select, and watch delivery draw itself.",
    complete: "complete",
    gisControlRoom: "GIS Control Room",
    networkMap: "Network map",
    searchRoutes: "Search routes",
    streets: "Streets",
    satellite: "Satellite",
    visible: "Visible",
    hidden: "Hidden",
    tracks: "Tracks",
    source: "Source",
    planned: "Planned",
    forecast: "Forecast",
    speed: "Speed",
    contractor: "Contractor",
    structures: "Structures",
    hover: "Hover",
    drawingRoute: "Drawing route",
    routePaused: "Route paused",
    restartRoute: "Restart route draw",
    playRoute: "Play route draw",
    pauseRoute: "Pause route draw",
    routeDrawSpeed: "Route draw speed",
    fullscreenMap: "Fullscreen map",
    progressStatus: "Progress Status",
    execDashboard: "ADCN Construction Dashboard",
    execDashboardText: "Package progress, contractor accountability, forecasts, and delivery risk in one executive view.",
    totalPlanned: "Total Planned",
    completedAsphalt: "Completed Asphalt",
    remainingScope: "Remaining Scope",
    portfolioCompletion: "Portfolio Completion",
    activePackages: "Active Packages",
    completedPackages: "Completed Packages",
    designBuild: "Design-Build",
    notStarted: "Not Started",
    nextForecast: "Next Forecast",
    contractors: "Contractors",
    forecastWindow: "Forecast Window",
    leadershipFocus: "Leadership Focus",
    progressByRoute: "Progress by Route",
    plannedScopeMix: "Planned Scope Mix",
    plannedKm: "planned km",
    fromStrategy: "From strategy to spatial delivery",
    fromStrategyText: "The map remains the presentation anchor while the narrative changes what leadership sees.",
    designPrinciples: "design principles",
    routeAlignmentFigure: "Route Alignment figure and progress deck",
    aiInsights: "AI Completion Insights",
    aiInsightsText: "Date-driven signals from the progress deck for executive attention.",
    assistant: "assistant",
    assistantSubtitle: "Ask about vision, users, route types, tracks, dates, contractors, and progress.",
    askPlaceholder: "Ask about the project PDFs...",
    send: "Send",
    suggested: "Suggested",
    openAssistant: "Open assistant",
    closeAssistant: "Close assistant",
    sourceEyebrow: "Source & Evidence",
    sourceTitle: "The original documents, verbatim",
    sourceText: "Every figure in this story traces back to two source documents. Open or download them as evidence.",
    openPdf: "Open PDF",
    download: "Download",
    reportImagery: "Report imagery",
    viewImage: "View image",
    flyNetwork: "Fly the network",
    stopTour: "Stop tour",
    presenterMode: "Presenter",
    exitPresenter: "Exit presenter",
    presenterHint: "Arrow keys to navigate · Space to fly · Esc to exit",
    liveTour: "Live tour"
  },
  ar: {
    plannedNetwork: "الشبكة المخططة",
    language: "اللغة",
    theme: "المظهر",
    lightMode: "الوضع الفاتح",
    darkMode: "الوضع الداكن",
    displayOptions: "خيارات العرض",
    completed: "المنجز",
    remaining: "المتبقي",
    completion: "نسبة الإنجاز",
    executiveView: "عرض تنفيذي",
    dashboardEyebrow: "لوحة تقدم الإنشاء",
    dashboardTitle: "حالة برنامج شبكة أبوظبي للدراجات",
    liveSpatialStory: "قصة مكانية مباشرة",
    chapterNav: "تنقل فصول القصة",
    previousChapter: "الفصل السابق",
    nextChapter: "الفصل التالي",
    chapterPosition: "موضع الفصل",
    mapBadgeTitle: "خريطة الشبكة المباشرة",
    mapBadgeText: "بيانات GeoJSON — مرر واختر وشاهد رسم المسارات مباشرة.",
    complete: "منجز",
    gisControlRoom: "غرفة التحكم الجغرافي",
    networkMap: "خريطة الشبكة",
    searchRoutes: "ابحث عن المسارات",
    streets: "الشوارع",
    satellite: "الأقمار الصناعية",
    visible: "ظاهر",
    hidden: "مخفي",
    tracks: "المسارات",
    source: "المصدر",
    planned: "المخطط",
    forecast: "التوقع",
    speed: "السرعة",
    contractor: "المقاول",
    structures: "الأعمال الإنشائية",
    hover: "المرور",
    drawingRoute: "رسم المسار",
    routePaused: "إيقاف الرسم",
    restartRoute: "إعادة رسم المسار",
    playRoute: "تشغيل رسم المسار",
    pauseRoute: "إيقاف رسم المسار",
    routeDrawSpeed: "سرعة رسم المسار",
    fullscreenMap: "عرض الخريطة بكامل الشاشة",
    progressStatus: "حالة التقدم",
    execDashboard: "لوحة تنفيذ شبكة أبوظبي للدراجات",
    execDashboardText: "تقدم الحزم، المقاولون، التوقعات، ومخاطر التنفيذ في عرض تنفيذي واحد.",
    totalPlanned: "إجمالي المخطط",
    completedAsphalt: "الأسفلت المنجز",
    remainingScope: "النطاق المتبقي",
    portfolioCompletion: "إنجاز المحفظة",
    activePackages: "الحزم النشطة",
    completedPackages: "الحزم المكتملة",
    designBuild: "تصميم وتنفيذ",
    notStarted: "لم يبدأ",
    nextForecast: "أقرب موعد",
    contractors: "المقاولون",
    forecastWindow: "نافذة التوقعات",
    leadershipFocus: "تركيز القيادة",
    progressByRoute: "التقدم حسب المسار",
    plannedScopeMix: "توزيع النطاق المخطط",
    plannedKm: "كم مخطط",
    fromStrategy: "من الاستراتيجية إلى التنفيذ المكاني",
    fromStrategyText: "تبقى الخريطة محور العرض بينما تغير القصة ما يشاهده صناع القرار.",
    designPrinciples: "مبدأ تصميم",
    routeAlignmentFigure: "مخطط محاور المسارات وحالة التقدم",
    aiInsights: "رؤى ذكية لمواعيد الإنجاز",
    aiInsightsText: "إشارات زمنية من تقرير التقدم لدعم القرار التنفيذي.",
    assistant: "المساعد",
    assistantSubtitle: "اسأل عن الرؤية، المستخدمين، أنواع المسارات، المقاولين، المواعيد، والتقدم.",
    askPlaceholder: "اسأل عن مستندات المشروع...",
    send: "إرسال",
    suggested: "أسئلة مقترحة",
    openAssistant: "فتح المساعد",
    closeAssistant: "إغلاق المساعد",
    sourceEyebrow: "المصدر والأدلة",
    sourceTitle: "المستندات الأصلية كما هي",
    sourceText: "كل رقم في هذه القصة يعود إلى مستندين مصدرين. افتحهما أو نزّلهما كدليل.",
    openPdf: "فتح الملف",
    download: "تنزيل",
    reportImagery: "صور من التقارير",
    viewImage: "عرض الصورة",
    flyNetwork: "جوّل في الشبكة",
    stopTour: "إيقاف الجولة",
    presenterMode: "وضع العرض",
    exitPresenter: "إنهاء وضع العرض",
    presenterHint: "الأسهم للتنقل · مسافة للجولة · Esc للخروج",
    liveTour: "جولة مباشرة"
  }
} as const;

export const routeNames: Record<Locale, Record<string, string>> = {
  en: {},
  ar: {
    "track-1-p12": "المسار 1 - الحزمتان 1 و2",
    "track-1-p34": "المسار 1 - الحزمتان 3 و4",
    "track-2-a": "المسار 2 - القسم A",
    "track-2-b": "المسار 2 - القسم B",
    "track-3": "المسار 3 - البر الرئيسي إلى القدرة",
    "track-4": "المسار 4 - البر الرئيسي إلى الوثبة",
    hsct: "مسار الدراجات عالي السرعة"
  }
};

export const routeLabels: Record<Locale, Record<string, string>> = {
  en: {},
  ar: {
    "track-1-p12": "المسار 1 حزم 1-2",
    "track-1-p34": "المسار 1 حزم 3-4",
    "track-2-a": "المسار 2A",
    "track-2-b": "المسار 2B",
    "track-3": "المسار 3",
    "track-4": "المسار 4",
    hsct: "HSCT"
  }
};

export const statusText: Record<Locale, Record<RouteStatus, string>> = {
  en: {
    construction: "Construction",
    "design-build": "Design & Build",
    design: "Design",
    "not-started": "Not Started"
  },
  ar: {
    construction: "قيد الإنشاء",
    "design-build": "تصميم وتنفيذ",
    design: "مرحلة التصميم",
    "not-started": "لم يبدأ"
  }
};

export const routeTypeName: Record<Locale, Record<RouteType, string>> = {
  en: {
    "type-01": "Type 01",
    "type-02": "Type 02",
    "type-03": "Type 03",
    hsct: "HSCT"
  },
  ar: {
    "type-01": "النوع 01",
    "type-02": "النوع 02",
    "type-03": "النوع 03",
    hsct: "HSCT"
  }
};

export const routeTypeDescription: Record<Locale, Record<RouteType, string>> = {
  en: {
    "type-01": "Urban at-grade island network serving all user groups through streets, parks, bus stops, and daily destinations.",
    "type-02": "Strategic connectors between Abu Dhabi Island, Yas, Saadiyat, Jubail, Fahid, and Mussafah.",
    "type-03": "Mainland long-distance sport and utility corridors with rest stops, hydration, bridges, and rural operating speeds.",
    hsct: "Dedicated elevated high-speed sports loop with controlled access and a 40 kph design speed."
  },
  ar: {
    "type-01": "شبكة حضرية على مستوى الشارع داخل الجزيرة تخدم الاستخدام اليومي والترفيهي والرياضي.",
    "type-02": "روابط استراتيجية بين جزيرة أبوظبي وياس والسعديات وجبيل وفاهد ومصفح.",
    "type-03": "محاور طويلة على البر الرئيسي للرياضة والتنقل مع محطات راحة ومياه وجسور.",
    hsct: "حلقة رياضية مرتفعة عالية السرعة مع وصول منضبط وسرعة تصميمية 40 كم/س."
  }
};

export const mapPlaceNames: Record<Locale, Record<string, string>> = {
  en: {
    island: "ABU DHABI ISLAND",
    yasSaadiyat: "YAS / SAADIYAT",
    mainland: "MAINLAND CORRIDORS",
    yas: "Yas Island",
    saadiyat: "Saadiyat",
    corniche: "Corniche",
    wathba: "Al Wathba"
  },
  ar: {
    island: "جزيرة أبوظبي",
    yasSaadiyat: "ياس / السعديات",
    mainland: "محاور البر الرئيسي",
    yas: "جزيرة ياس",
    saadiyat: "السعديات",
    corniche: "الكورنيش",
    wathba: "الوثبة"
  }
};

export const storyText = {
  en: [
    {
      id: "vision",
      eyebrow: "Project Vision",
      title: "Abu Dhabi Cycling Network Vision",
      body: "The project turns Abu Dhabi's active mobility ambition into a legible network of island streets, strategic connectors, mainland corridors, and a signature high-speed cycling loop.",
      metric: "UCI",
      metricLabel: "Bike City context",
      source: "Active Recreation and Cycling Strategy / Basis of Design",
      camera: "Portfolio overview"
    },
    {
      id: "principles",
      eyebrow: "Planning Principles",
      title: "Planning Principles",
      body: "Impact, creativity, accessibility, inclusion, benefit, achievability, and demographic fit become the operating language for the network.",
      metric: "7",
      metricLabel: "Planning principles",
      source: "2022 Basis of Design",
      camera: "Planning framework"
    },
    {
      id: "users",
      eyebrow: "User Groups",
      title: "Cycling User Groups",
      body: "Recreational riders, explorers, utility cyclists, and sports cyclists each create different requirements for speed, directness, comfort, rest, access, and safety.",
      metric: "4",
      metricLabel: "User groups",
      source: "Basis of Design user group framework",
      camera: "Island coverage"
    },
    {
      id: "strategy",
      eyebrow: "Network Strategy",
      title: "Route Alignments within the Abu Dhabi Cycling Network",
      body: "The map moves from urban at-grade streets to inter-island connectors, long-distance mainland routes, and the high-speed cycle track.",
      metric: "7",
      metricLabel: "Tracked alignments",
      source: "Route Alignment figure and progress deck",
      camera: "Network families"
    },
    {
      id: "route-types",
      eyebrow: "Route Types",
      title: "Cycling Route Types",
      body: "Route types become live map filters: select a family to isolate its geography, status, and role in the wider mobility vision.",
      metric: "62 km",
      metricLabel: "Strategic connectors",
      source: "Track 2 package status",
      camera: "Yas / Saadiyat connectors"
    },
    {
      id: "network",
      eyebrow: "Network Map",
      title: "Network Alignment Plan",
      body: "Routes, package status, contractors, forecasts, and design intent are synchronized so leadership can explore the programme spatially.",
      metric: "280+ km",
      metricLabel: "Portfolio scope",
      source: "PDF route maps and digitized GeoJSON",
      camera: "Network command view"
    },
    {
      id: "progress",
      eyebrow: "Construction Progress",
      title: "Construction Progress Status",
      body: "Completed asphalt, package progress, contractor accountability, structure status, and forecast milestones are connected directly to the selected routes.",
      metric: "70.26 km",
      metricLabel: "Track 3 complete",
      source: "December 2025 Progress Status",
      camera: "Mainland delivery"
    },
    {
      id: "kpis",
      eyebrow: "Executive KPIs",
      title: "Project Progress Dashboard",
      body: "The story highlights what is complete, what is forecast next, where scope remains, and which packages require leadership attention.",
      metric: "99%",
      metricLabel: "Track 4 progress",
      source: "Construction KPI dashboard",
      camera: "Executive progress view"
    },
    {
      id: "future",
      eyebrow: "Future Milestones",
      title: "Forecast Completion Milestones",
      body: "Forecast milestones move from island packages and mainland delivery toward Track 2B and the High-Speed Cycle Track, giving leadership a clear view of what happens next.",
      metric: "2029",
      metricLabel: "HSCT forecast",
      source: "HSCT design and budget horizon",
      camera: "Signature sports loop"
    },
    {
      id: "value",
      eyebrow: "Why It Matters",
      title: "A city that moves — health, tourism, and sport",
      body: "Beyond kilometres of asphalt, the network is an investment in Abu Dhabi's active life: the first UCI Bike City in Asia, a destination for sports tourism, and everyday safe mobility for residents and visitors alike.",
      metric: "1st",
      metricLabel: "UCI Bike City in Asia",
      source: "Active Recreation & Cycling Strategy",
      camera: "The value case"
    },
    {
      id: "ask",
      eyebrow: "The Road Ahead",
      title: "The decision in front of leadership",
      body: "Two signature moves remain: complete the island-to-island connection (Track 2B) and deliver the High-Speed Cycle Track. Both are designed and ready — they now await approval and budget to move into construction.",
      metric: "1.7B → 4B",
      metricLabel: "AED approved vs. needed",
      source: "December 2025 budget highlight",
      camera: "The ask"
    }
  ],
  ar: [
    {
      id: "vision",
      eyebrow: "رؤية المشروع",
      title: "رؤية شبكة أبوظبي للدراجات",
      body: "تحول الشبكة طموح أبوظبي للتنقل النشط إلى منظومة واضحة من شوارع الجزيرة والروابط الاستراتيجية ومحاور البر الرئيسي والحلقة الرياضية عالية السرعة.",
      metric: "UCI",
      metricLabel: "مدينة الدراجات",
      source: "استراتيجية الترفيه النشط والدراجات / أسس التصميم",
      camera: "نظرة عامة على المحفظة"
    },
    {
      id: "principles",
      eyebrow: "مبادئ التخطيط",
      title: "مبادئ التخطيط",
      body: "الأثر، الابتكار، سهولة الوصول، الشمول، المنفعة، قابلية التنفيذ، وملاءمة الفئات السكانية تشكل لغة تشغيل الشبكة.",
      metric: "7",
      metricLabel: "مبادئ التخطيط",
      source: "أسس التصميم 2022",
      camera: "إطار التخطيط"
    },
    {
      id: "users",
      eyebrow: "فئات المستخدمين",
      title: "فئات مستخدمي الدراجات",
      body: "الدراج الترفيهي والمستكشف ومستخدم التنقل اليومي والدراج الرياضي لديهم احتياجات مختلفة للسرعة والاتصال والراحة والسلامة.",
      metric: "4",
      metricLabel: "فئات المستخدمين",
      source: "إطار فئات المستخدمين في أسس التصميم",
      camera: "تغطية الجزيرة"
    },
    {
      id: "strategy",
      eyebrow: "استراتيجية الشبكة",
      title: "محاور المسارات ضمن شبكة أبوظبي للدراجات",
      body: "تنتقل الخريطة من الشوارع الحضرية إلى روابط الجزر، ومحاور البر الرئيسي الطويلة، ومسار الدراجات عالي السرعة.",
      metric: "7",
      metricLabel: "محاور متابعة",
      source: "مخطط محاور المسارات وتقرير التقدم",
      camera: "عائلات الشبكة"
    },
    {
      id: "route-types",
      eyebrow: "أنواع المسارات",
      title: "أنواع مسارات الدراجات",
      body: "تعمل أنواع المسارات كمرشحات مباشرة على الخريطة لعزل الجغرافيا والحالة والدور داخل رؤية التنقل.",
      metric: "62 كم",
      metricLabel: "روابط استراتيجية",
      source: "حالة حزم المسار 2",
      camera: "روابط ياس / السعديات"
    },
    {
      id: "network",
      eyebrow: "خريطة الشبكة",
      title: "مخطط محاور الشبكة",
      body: "تتزامن المسارات وحالة الحزم والمقاولون والتوقعات مع الخريطة ليتمكن صناع القرار من استكشاف البرنامج مكانياً.",
      metric: "+280 كم",
      metricLabel: "نطاق المحفظة",
      source: "خرائط التقارير وبيانات GeoJSON",
      camera: "عرض التحكم بالشبكة"
    },
    {
      id: "progress",
      eyebrow: "تقدم الإنشاء",
      title: "حالة تقدم الإنشاء",
      body: "يرتبط الأسفلت المنجز وتقدم الحزم والمقاولون والأعمال الإنشائية والمعالم المستقبلية مباشرة بالمسارات المختارة.",
      metric: "70.26 كم",
      metricLabel: "إنجاز المسار 3",
      source: "تقرير تقدم ديسمبر 2025",
      camera: "تنفيذ البر الرئيسي"
    },
    {
      id: "kpis",
      eyebrow: "مؤشرات تنفيذية",
      title: "لوحة تقدم المشروع",
      body: "تعرض القصة ما تم إنجازه، وما هو متوقع تالياً، وأين يتبقى النطاق، والحزم التي تحتاج إلى اهتمام قيادي.",
      metric: "99%",
      metricLabel: "تقدم المسار 4",
      source: "لوحة مؤشرات الإنشاء",
      camera: "عرض تنفيذي للتقدم"
    },
    {
      id: "future",
      eyebrow: "المعالم المستقبلية",
      title: "معالم الإنجاز المتوقعة",
      body: "تنتقل المعالم من حزم الجزيرة والبر الرئيسي إلى المسار 2B ومسار الدراجات عالي السرعة لتقديم رؤية واضحة للخطوات القادمة.",
      metric: "2029",
      metricLabel: "توقع HSCT",
      source: "أفق تصميم وميزانية HSCT",
      camera: "الحلقة الرياضية المميزة"
    },
    {
      id: "value",
      eyebrow: "لماذا يهم",
      title: "مدينة تتحرك — صحة وسياحة ورياضة",
      body: "أبعد من كيلومترات الأسفلت، الشبكة استثمار في الحياة النشطة لأبوظبي: أول مدينة دراجات معتمدة من UCI في آسيا، ووجهة للسياحة الرياضية، وتنقل يومي آمن للمقيمين والزوار.",
      metric: "الأولى",
      metricLabel: "مدينة UCI للدراجات في آسيا",
      source: "استراتيجية الترفيه النشط والدراجات",
      camera: "قيمة المشروع"
    },
    {
      id: "ask",
      eyebrow: "الطريق إلى الأمام",
      title: "القرار أمام القيادة",
      body: "يتبقى تحركان مميزان: استكمال الربط بين الجزر (المسار 2B) وتنفيذ مسار الدراجات عالي السرعة. كلاهما مصمم وجاهز، وينتظران الاعتماد والميزانية للانتقال إلى مرحلة الإنشاء.",
      metric: "1.7B / 4B",
      metricLabel: "المعتمد مقابل المطلوب (درهم)",
      source: "أبرز ميزانية ديسمبر 2025",
      camera: "الطلب"
    }
  ]
} as const;

export const strategyPrincipleAr: Record<string, string> = {
  Impact: "الأثر",
  Creative: "الإبداع",
  Demographic: "الفئات السكانية",
  Achievable: "قابلية التنفيذ",
  Beneficial: "المنفعة",
  Accessible: "سهولة الوصول",
  Inclusive: "الشمول"
};

export const personaAr: Record<string, { name: string; requirements: string[] }> = {
  "Recreational Cyclist": { name: "الدراج الترفيهي", requirements: ["وصول سهل", "مناطق راحة", "مواقف قصيرة", "مياه شرب", "فصل آمن"] },
  Explorer: { name: "المستكشف", requirements: ["إرشاد واضح", "معلومات محلية", "تأجير دراجات", "توقفات جميلة", "وجهات جاذبة"] },
  "Utility Cyclist": { name: "مستخدم التنقل اليومي", requirements: ["مسار مباشر", "مواقف طويلة", "توقفات أقل", "تكامل مع النقل", "سطح موثوق"] },
  "Sports Cyclist": { name: "الدراج الرياضي", requirements: ["مسارات سريعة", "تقليل التعارض", "سعة عالية", "سطح ناعم", "حلقات متصلة"] }
};

export function routeName(route: NetworkRoute, locale: Locale) {
  return routeNames[locale][route.id] ?? route.name;
}

export function routeLabel(route: NetworkRoute, locale: Locale) {
  return routeLabels[locale][route.id] ?? route.label;
}

export function routeDescription(route: NetworkRoute, locale: Locale) {
  if (locale === "en") return route.description;
  const descriptions: Record<string, string> = {
    "track-1-p12": "تسعة عشر شارعاً داخل جزيرة أبوظبي تدعم التنقل والترفيه والرياضة والدراجات والسكوترات.",
    "track-1-p34": "أربعة عشر شارعاً إضافياً داخل الجزيرة لتوسيع التغطية المحلية والوصول اليومي.",
    "track-2-a": "اتصال من جزيرة ياس باتجاه جامعة خليفة وجسر مصفح.",
    "track-2-b": "رابط استراتيجي بين الجزر بنطاق أساسي واختياري على مراحل.",
    "track-3": "محور رياضي وتنقلي على البر الرئيسي باتجاه حدود الإمارة عند القدرة.",
    "track-4": "محور جنوبي على البر الرئيسي باتجاه بني ياس والوثبة.",
    hsct: "حلقة رياضية مرتفعة ومغلقة حول جزيرة أبوظبي والريم والمارية."
  };
  return descriptions[route.id] ?? route.description;
}

export function formatForecast(value: string, locale: Locale) {
  if (locale === "en") return value;
  return value
    .replace("Nov", "نوفمبر")
    .replace("Jul", "يوليو")
    .replace("Dec", "ديسمبر")
    .replace("Feb", "فبراير")
    .replace("Apr", "أبريل")
    .replace("Mar", "مارس");
}
