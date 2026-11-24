import { useEffect, useState } from 'react';

interface PersistedStore {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (listener: () => void) => () => void;
  };
}

/** Whether a persisted store has loaded what was saved on the device (AsyncStorage is async on native). */
export function useHydrated(store: PersistedStore): boolean {
  const [hydrated, setHydrated] = useState(store.persist.hasHydrated());
  useEffect(() => {
    const unsubscribe = store.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(store.persist.hasHydrated());
    return unsubscribe;
  }, [store]);
  return hydrated;
}
