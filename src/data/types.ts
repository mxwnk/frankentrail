export interface PoiData {
  lat: number;
  lon: number;
  name: string;
  category: PoiCategory;
  openingHours?: string;
  website?: string;
}

export type PoiCategory =
  | "shelter"
  | "water"
  | "food"
  | "supermarket"
  | "bakery"
  | "butcher"
  | "convenience";
