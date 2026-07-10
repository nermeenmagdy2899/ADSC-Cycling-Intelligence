import { create } from "zustand";
import type { RouteType } from "../data/network";

type Theme = "dark" | "light";
type Locale = "en" | "ar";

type NetworkState = {
  selectedRouteId: string;
  soloRouteId: string | null;
  visibleTypes: RouteType[];
  playback: "playing" | "paused";
  speed: number;
  theme: Theme;
  locale: Locale;
  query: string;
  presenter: boolean;
  tour: boolean;
  setPresenter: (presenter: boolean) => void;
  setTour: (tour: boolean) => void;
  setSelectedRouteId: (id: string) => void;
  setSoloRouteId: (id: string | null) => void;
  toggleType: (type: RouteType) => void;
  setVisibleTypes: (types: RouteType[]) => void;
  setPlayback: (playback: "playing" | "paused") => void;
  setSpeed: (speed: number) => void;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
  setQuery: (query: string) => void;
};

export const useNetworkStore = create<NetworkState>((set) => ({
  selectedRouteId: "track-1-p12",
  soloRouteId: null,
  visibleTypes: ["type-01", "type-02", "type-03", "hsct"],
  playback: "playing",
  speed: 1,
  theme: "dark",
  locale: "en",
  query: "",
  presenter: false,
  tour: false,
  setPresenter: (presenter) => set({ presenter }),
  setTour: (tour) => set({ tour }),
  setSelectedRouteId: (id) => set({ selectedRouteId: id }),
  setSoloRouteId: (id) => set({ soloRouteId: id }),
  setVisibleTypes: (types) => set({ visibleTypes: types }),
  toggleType: (type) =>
    set((state) => ({
      visibleTypes: state.visibleTypes.includes(type)
        ? state.visibleTypes.filter((item) => item !== type)
        : [...state.visibleTypes, type]
    })),
  setPlayback: (playback) => set({ playback }),
  setSpeed: (speed) => set({ speed }),
  setTheme: (theme) => set({ theme }),
  setLocale: (locale) => set({ locale }),
  setQuery: (query) => set({ query })
}));
