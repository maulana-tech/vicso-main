import { useLocalStorage } from "./useLocalStorage";

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
}

const defaultProfile: UserProfile = {
  id: "CN-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
  username: "Trader",
  email: "",
  avatarUrl: "",
};

export function useUserProfile() {
  const [profile, setProfile] = useLocalStorage<UserProfile>("cn-user-profile", defaultProfile);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  return { profile, updateProfile };
}
