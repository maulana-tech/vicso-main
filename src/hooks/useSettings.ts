import { useLocalStorage } from "./useLocalStorage";

export interface AppSettings {
  maxRiskLevel: number;
  maxTradeSize: number;
  autoBuyEnabled: boolean;
  autoBuyRiskThreshold: number;
  autoSellEnabled: boolean;
  autoSellRiskThreshold: number;
  whaleActivityTrigger: boolean;
}

const defaultSettings: AppSettings = {
  maxRiskLevel: 50,
  maxTradeSize: 1000,
  autoBuyEnabled: false,
  autoBuyRiskThreshold: 30,
  autoSellEnabled: false,
  autoSellRiskThreshold: 70,
  whaleActivityTrigger: false,
};

export function useSettings() {
  const [settings, setSettings] = useLocalStorage<AppSettings>("cn-settings", defaultSettings);

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  return { settings, updateSettings };
}
