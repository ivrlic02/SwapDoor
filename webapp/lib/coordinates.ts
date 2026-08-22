// Approximate map coordinates for each listing location. Used to place homes
// on the map when the data source doesn't carry lat/lng itself (the gist
// doesn't; the Supabase schema does, so once you move to Supabase these become
// the fallback rather than the primary source). Keyed by `location`, with a
// `country` fallback.
export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Santorini: { lat: 36.3932, lng: 25.4615 },
  Zermatt: { lat: 46.0207, lng: 7.7491 },
  Siena: { lat: 43.3188, lng: 11.3308 },
  Ubud: { lat: -8.5069, lng: 115.2625 },
  California: { lat: 34.0259, lng: -118.7798 },
  Kyoto: { lat: 35.0116, lng: 135.7681 },
  Rovaniemi: { lat: 66.5039, lng: 25.7294 },
  Provence: { lat: 43.9352, lng: 6.0679 },
  "Camps Bay": { lat: -33.95, lng: 18.3776 },
  "Costa Rica": { lat: 10.301, lng: -84.808 },
};

export function coordsFor(location?: string, country?: string) {
  if (location && CITY_COORDS[location]) return CITY_COORDS[location];
  if (country && CITY_COORDS[country]) return CITY_COORDS[country];
  return null;
}
