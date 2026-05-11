import { useLocalStorage } from "./useLocalStorage";

export interface Position {
  id: string;
  token: string;
  symbol: string;
  chain: string;
  entryPrice: number;
  currentPrice: number;
  amount: number;
  entryDate: string;
}

export function usePositions() {
  const [positions, setPositions] = useLocalStorage<Position[]>("cn-positions", []);

  const addPosition = (pos: Omit<Position, "id">) => {
    setPositions((prev) => [...prev, { ...pos, id: Date.now().toString() }]);
  };

  const removePosition = (id: string) => {
    setPositions((prev) => prev.filter((p) => p.id !== id));
  };

  return { positions, addPosition, removePosition };
}
