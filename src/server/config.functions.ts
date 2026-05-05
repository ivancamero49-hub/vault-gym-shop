import { createServerFn } from "@tanstack/react-start";

export const getMapboxToken = createServerFn({ method: "GET" }).handler(async () => {
  let token = process.env.MAPBOX_PUBLIC_TOKEN ?? "";
  // Defensive: Mapbox tokens must start with lowercase "pk." — fix common typo.
  if (token.startsWith("Pk.")) token = "pk." + token.slice(3);
  return { token };
});
