import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AppChromePageOverride = {
  /** Hide L1 tab-title (e.g. messages selection mode). */
  hidden?: boolean;
  /** Override i18n title key from route resolver. */
  titleKey?: string;
  /** Trailing actions in L1 header row (menu, back, etc.). */
  trailing?: ReactNode;
};

type AppChromeContextValue = {
  override: AppChromePageOverride;
  setOverride: (next: AppChromePageOverride) => void;
  /** Home L1 platform chrome (search · categories · section titles · featured strip). */
  homeL1Chrome: ReactNode | null;
  setHomeL1Chrome: (node: ReactNode | null) => void;
};

const AppChromeContext = createContext<AppChromeContextValue | null>(null);

export function AppChromeProvider({ children }: { children: ReactNode }) {
  const [override, setOverrideState] = useState<AppChromePageOverride>({});
  const [homeL1Chrome, setHomeL1ChromeState] = useState<ReactNode | null>(null);

  const setHomeL1Chrome = useCallback((node: ReactNode | null) => {
    setHomeL1ChromeState(node);
  }, []);

  const setOverride = useCallback((next: AppChromePageOverride) => {
    setOverrideState((prev) => {
      if (Object.keys(next).length === 0) return {};
      return { ...prev, ...next };
    });
  }, []);

  const value = useMemo(
    () => ({
      override,
      setOverride,
      homeL1Chrome,
      setHomeL1Chrome,
    }),
    [override, setOverride, homeL1Chrome, setHomeL1Chrome],
  );

  return <AppChromeContext.Provider value={value}>{children}</AppChromeContext.Provider>;
}

export function useAppChromeContext(): AppChromeContextValue {
  const ctx = useContext(AppChromeContext);
  if (!ctx) {
    throw new Error("useAppChromeContext must be used within AppChromeProvider");
  }
  return ctx;
}

/** Page-level L1 overrides — cleared on unmount. Omit `trailing`; use setOverride for dynamic actions. */
export function useAppChromePage(override: Pick<AppChromePageOverride, "hidden" | "titleKey">) {
  const { setOverride } = useAppChromeContext();

  useLayoutEffect(() => {
    setOverride(override);
    return () => setOverride({});
  }, [setOverride, override.hidden, override.titleKey]);
}
