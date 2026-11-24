import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from './storage';

interface PrefsState {
  /** Whether the side nav is open on wide screens (ng-portfolio's dvoss-side-nav). */
  sideNavOpen: boolean;
  /** Whether the movie list filters are expanded (ng-portfolio's movieFiltersOpen). */
  filtersOpen: boolean;
  setSideNavOpen: (open: boolean) => void;
  setFiltersOpen: (open: boolean) => void;
}

/** Small per-device settings that the website keeps in localStorage. */
export const usePrefs = create<PrefsState>()(
  persist(
    set => ({
      sideNavOpen: true,
      filtersOpen: true,
      setSideNavOpen: sideNavOpen => set({ sideNavOpen }),
      setFiltersOpen: filtersOpen => set({ filtersOpen })
    }),
    {
      name: 'dvoss-prefs',
      storage: persistStorage,
      partialize: ({ sideNavOpen, filtersOpen }) => ({ sideNavOpen, filtersOpen })
    }
  )
);
