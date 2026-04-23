import { useLocalStorage } from "./use-local-storage";

export function useSelectedCity() {
  const [city, setCity] = useLocalStorage<string>("selected_city", "");
  return { city, setCity };
}
