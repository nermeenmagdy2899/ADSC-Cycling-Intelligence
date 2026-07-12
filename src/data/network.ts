import {
  Activity,
  Bike,
  Blocks,
  CalendarClock,
  Compass,
  Eye,
  Flag,
  Gauge,
  Globe2,
  Leaf,
  MapPinned,
  Milestone,
  Navigation,
  Route,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Target,
  Trees,
  Users,
  Workflow,
  Zap
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type RouteStatus = "construction" | "design-build" | "design" | "not-started";
export type RouteType = "type-01" | "type-02" | "type-03" | "hsct";

export type NetworkRoute = {
  id: string;
  name: string;
  label: string;
  type: RouteType;
  status: RouteStatus;
  plannedKm: number;
  completedKm: number;
  contractor: string;
  packageName: string;
  forecast: string;
  color: string;
  description: string;
  coordinates: [number, number][];
  photos: string[];
  designSpeed: string;
  users: string[];
  structures?: string;
};

export const strategyPrinciples = [
  { title: "Impact", icon: Target, copy: "Make cycling visible in the daily life and identity of the city." },
  { title: "Creative", icon: Sparkles, copy: "Respond to local climate, public realm, culture, and destination character." },
  { title: "Demographic", icon: Users, copy: "Serve different age, ability, income, tourism, recreation, and sport needs." },
  { title: "Achievable", icon: Milestone, copy: "Balance short and medium term delivery with a longer term network vision." },
  { title: "Beneficial", icon: Leaf, copy: "Create measurable benefits for health, mobility, recreation, and safety." },
  { title: "Accessible", icon: Navigation, copy: "Improve legibility, wayfinding, connectivity, and ease of use." },
  { title: "Inclusive", icon: Globe2, copy: "Build a platform for residents, visitors, families, commuters, and athletes." }
] satisfies { title: string; icon: LucideIcon; copy: string }[];

export const designPrinciples = [
  "Direct and connected",
  "Accessible and user focused",
  "Continuous and convenient",
  "Avoiding unnecessary diversions",
  "Safe and secure",
  "Inclusive and integrated",
  "Navigable and legible",
  "Sustainable and carbon neutral",
  "Climate appropriate and resilient",
  "Culture and brand compliant",
  "Unique and memorable experiences",
  "Reflecting Abu Dhabi",
  "Target cost and value for money",
  "Innovative and smart",
  "Achievable and desirable"
];

export const personas = [
  {
    name: "Recreational Cyclist",
    icon: Bike,
    image: "/images/persona-recreation.svg",
    summary: "Families, residents, tourists, children, and older people riding for leisure and health.",
    requirements: ["Accessible routes", "Frequent resting spots", "Short-term parking", "Drinking water", "Safe separation"]
  },
  {
    name: "Explorer",
    icon: Compass,
    image: "/images/persona-explorer.svg",
    summary: "Visitors and residents using the network to discover views, culture, parks, and waterfronts.",
    requirements: ["Wayfinding", "Local information", "Bike rental", "Scenic stops", "Attractive destinations"]
  },
  {
    name: "Utility Cyclist",
    icon: Route,
    image: "/images/persona-utility.svg",
    summary: "Moderate and advanced riders travelling to work, education, shopping, and daily errands.",
    requirements: ["Direct route", "Long-term parking", "Minimal stops", "Public transport integration", "Reliable surfaces"]
  },
  {
    name: "Sports Cyclist",
    icon: Activity,
    image: "/images/persona-sport.svg",
    summary: "Serious and advanced cyclists training for fitness, performance, and endurance.",
    requirements: ["Fast direct routes", "Conflict reduction", "High capacity", "Smooth pavement", "Continuous loops"]
  }
];

export const networkRoutes: NetworkRoute[] = [
  {
    id: "track-1-p12",
    name: "Track 1 - Packages 1 & 2",
    label: "Track 1 P1-2",
    type: "type-01",
    status: "construction",
    plannedKm: 105.7,
    completedKm: 86.7,
    contractor: "Gulf Contracting & Landscape / Hilalco",
    packageName: "Package 1 & 2",
    forecast: "Feb 2026",
    color: "#56d6bd",
    designSpeed: "20 kph",
    users: ["Recreational", "Explorer", "Utility", "Sports"],
    description: "Nineteen Abu Dhabi Island streets supporting commuting, recreation, sport, bikes, and scooters.",
    photos: ["/images/pdf-gallery/project-highlight-02.png", "/images/pdf-gallery/network-routes-08.png"],
    coordinates: [
      [54.324, 24.48],
      [54.348, 24.465],
      [54.383, 24.468],
      [54.418, 24.456],
      [54.447, 24.438],
      [54.474, 24.425]
    ]
  },
  {
    id: "track-1-p34",
    name: "Track 1 - Packages 3 & 4",
    label: "Track 1 P3-4",
    type: "type-01",
    status: "construction",
    plannedKm: 69.1,
    completedKm: 10.3,
    contractor: "Western Bainoona Group",
    packageName: "Package 3 & 4",
    forecast: "Mar 2027",
    color: "#89c7ff",
    designSpeed: "20 kph",
    users: ["Recreational", "Explorer", "Utility", "Sports"],
    description: "Fourteen additional island streets extending at-grade network coverage and local access.",
    photos: ["/images/pdf-gallery/project-highlight-02.png"],
    coordinates: [
      [54.312, 24.435],
      [54.35, 24.418],
      [54.39, 24.415],
      [54.426, 24.398],
      [54.462, 24.386],
      [54.5, 24.38]
    ]
  },
  {
    id: "track-2-a",
    name: "Track 2 - Section A",
    label: "Track 2A",
    type: "type-02",
    status: "design-build",
    plannedKm: 37,
    completedKm: 10,
    contractor: "Western Bainoona Group",
    packageName: "Section A",
    forecast: "Mar 2027",
    color: "#d99b4e",
    designSpeed: "20-40 kph",
    users: ["Recreational", "Utility", "Sports"],
    structures: "6 bridges, 1 underpass, 3 culverts, 3 utility bridges",
    description: "Connection from Yas Island toward Sheikh Khalifa University and Mussafah Bridge.",
    photos: ["/images/pdf-gallery/network-routes-08.png"],
    coordinates: [
      [54.603, 24.49],
      [54.57, 24.465],
      [54.545, 24.43],
      [54.51, 24.398],
      [54.47, 24.37]
    ]
  },
  {
    id: "track-2-b",
    name: "Track 2 - Section B",
    label: "Track 2B",
    type: "type-02",
    status: "not-started",
    plannedKm: 25,
    completedKm: 0,
    contractor: "Western Bainoona Group / Zutari",
    packageName: "Section B",
    forecast: "Mar 2028",
    color: "#e7c688",
    designSpeed: "20-40 kph",
    users: ["Recreational", "Utility", "Sports"],
    structures: "Base and optional bridges linking Yas, Fahid, Jubail, Saadiyat, and Sheikh Khalifa Bridge",
    description: "Strategic island-to-island connection with phased base and optional scopes.",
    photos: ["/images/pdf-gallery/network-routes-08.png", "/images/pdf-gallery/project-highlight-02.png"],
    coordinates: [
      [54.604, 24.49],
      [54.66, 24.505],
      [54.72, 24.515],
      [54.78, 24.54],
      [54.84, 24.555]
    ]
  },
  {
    id: "track-3",
    name: "Track 3 - Abu Dhabi Mainland to Al Qudra",
    label: "Track 3",
    type: "type-03",
    status: "design-build",
    plannedKm: 78.67,
    completedKm: 70.26,
    contractor: "GCC Landscape",
    packageName: "Part 1",
    forecast: "Apr 2026",
    color: "#9aa775",
    designSpeed: "20-40 kph",
    users: ["Utility", "Sports"],
    structures: "1 bridge complete, 2 nodes in progress",
    description: "Mainland sport and utility corridor from Abu Dhabi toward the Emirate boundary at Al Qudra.",
    photos: ["/images/pdf-gallery/track34-progress-11.png"],
    coordinates: [
      [54.61, 24.46],
      [54.72, 24.52],
      [54.86, 24.61],
      [55.02, 24.68],
      [55.18, 24.77],
      [55.34, 24.85]
    ]
  },
  {
    id: "track-4",
    name: "Track 4 - Abu Dhabi Mainland to Al Wathba",
    label: "Track 4",
    type: "type-03",
    status: "design-build",
    plannedKm: 42.24,
    completedKm: 41.75,
    contractor: "GCC Landscape",
    packageName: "Part 2",
    forecast: "Apr 2026",
    color: "#93a1cf",
    designSpeed: "20-40 kph",
    users: ["Utility", "Sports"],
    structures: "4 bridges and 1 underpass complete",
    description: "Southern mainland corridor connecting toward Bani Yas and Al Wathba.",
    photos: ["/images/pdf-gallery/track34-progress-11.png"],
    coordinates: [
      [54.51, 24.37],
      [54.59, 24.32],
      [54.68, 24.27],
      [54.77, 24.23],
      [54.86, 24.19]
    ]
  },
  {
    id: "hsct",
    name: "High-Speed Cycle Track",
    label: "HSCT",
    type: "hsct",
    status: "design",
    plannedKm: 52,
    completedKm: 0,
    contractor: "TBD - under design",
    packageName: "High-Speed Loop",
    forecast: "Apr 2029",
    color: "#f7e2b0",
    designSpeed: "40 kph",
    users: ["Sports"],
    structures: "7 m clear cycling track, 14 access ramps, 2 stair/lift access points",
    description: "Dedicated elevated closed sports loop around Abu Dhabi Island, Al Reem, and Al Maryah areas.",
    photos: ["/images/pdf-gallery/design-principles-13.png", "/images/pdf-gallery/network-routes-08.png"],
    coordinates: [
      [54.312, 24.47],
      [54.35, 24.52],
      [54.43, 24.54],
      [54.52, 24.515],
      [54.55, 24.465],
      [54.51, 24.405],
      [54.42, 24.38],
      [54.33, 24.41],
      [54.312, 24.47]
    ]
  }
];

// Programme-level figures from the December 2025 progress highlight slide.
// Verified against page 2 of the December 2025 Progress Status deck:
// "Approved budget is 1.7B against 4B needed."
export const programme = {
  currency: "AED",
  approvedBudgetBn: 1.7,
  neededBudgetBn: 4,
  hsctDesignPct: 90,
  uciBikeCityYear: 2021
};

export const milestones = [
  { date: "Nov 2021", title: "Active Recreation and Cycling Strategy", copy: "DMT strategy defines the long-term active mobility vision." },
  { date: "2021", title: "UCI Bike City Label", copy: "Abu Dhabi becomes the first city in Asia to receive the label." },
  { date: "Jul 2022", title: "Basis of Design", copy: "Planning principles, route typologies, and design parameters are consolidated." },
  { date: "Dec 2025", title: "Progress Status", copy: "Construction and design-build routes are tracked against package KPIs." },
  { date: "Feb 2026", title: "Track 1 P1-2 Forecast", copy: "105.7 km island package forecast completion." },
  { date: "Apr 2026", title: "Track 3 and 4 Forecast", copy: "Mainland routes forecast completion after advanced asphalt progress." },
  { date: "Mar 2028", title: "Track 2B Forecast", copy: "Island-to-island connection forecast after approvals and optional scope decisions." },
  { date: "Apr 2029", title: "HSCT Forecast", copy: "High-speed sports loop forecast after design and budget allocation." }
];

export const gallery = [
  { title: "Network route map", image: "/images/pdf-gallery/network-routes-08.png", tag: "Design" },
  { title: "Design principles board", image: "/images/pdf-gallery/design-principles-13.png", tag: "Design" },
  { title: "Project highlights", image: "/images/pdf-gallery/project-highlight-02.png", tag: "Progress" },
  { title: "Track 3 and Track 4 progress", image: "/images/pdf-gallery/track34-progress-11.png", tag: "Progress" }
];

export const documents = [
  {
    title: "Abu Dhabi Cycling Network Basis of Design",
    href: "/documents/basis-of-design-2022.pdf",
    date: "July 2022",
    source: "Basis of Design",
    text: "Planning principles, user groups, route typologies, design parameters, process stages, and benefit KPIs."
  },
  {
    title: "Abu Dhabi Cycle Track Project Progress Status",
    href: "/documents/progress-status-dec-2025.pdf",
    date: "December 2025",
    source: "Progress Status",
    text: "Package progress, contractors, planned distance, completed asphalt, construction progress, forecast completion, and structures."
  }
];

export const routeTypeCopy: Record<RouteType, string> = {
  "type-01": "Urban at-grade island network serving all user groups through streets, parks, bus stops, and daily destinations.",
  "type-02": "Strategic connectors between Abu Dhabi Island, Yas, Saadiyat, Jubail, Fahid, and Mussafah.",
  "type-03": "Mainland long-distance sport and utility corridors with rest stops, hydration, bridges, and rural operating speeds.",
  hsct: "Dedicated elevated high-speed sports loop with controlled access and a 40 kph design speed."
};

export const statusLabels: Record<RouteStatus, string> = {
  construction: "Construction",
  "design-build": "Design & Build",
  design: "Design",
  "not-started": "Not Started"
};

export const dashboardIcons = { Gauge, CalendarClock, Flag, Blocks, Eye, SunMedium, Trees, Workflow, ShieldCheck, MapPinned };
