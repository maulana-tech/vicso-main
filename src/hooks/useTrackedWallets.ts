import { useLocalStorage } from "./useLocalStorage";

export interface TrackedWallet {
  address: string;
  label: string;
  chain: string;
  notificationsOn: boolean;
  addedAt: string;
}

export function useTrackedWallets() {
  const [tracked, setTracked] = useLocalStorage<TrackedWallet[]>("cn-tracked-wallets", []);

  const addWallet = (address: string, label: string, chain: string) => {
    if (tracked.find((w) => w.address === address)) return;
    setTracked((prev) => [...prev, { address, label, chain, notificationsOn: true, addedAt: new Date().toISOString() }]);
  };

  const removeWallet = (address: string) => {
    setTracked((prev) => prev.filter((w) => w.address !== address));
  };

  const toggleNotifications = (address: string) => {
    setTracked((prev) => prev.map((w) => (w.address === address ? { ...w, notificationsOn: !w.notificationsOn } : w)));
  };

  return { tracked, addWallet, removeWallet, toggleNotifications };
}
