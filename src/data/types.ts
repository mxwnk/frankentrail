export interface PoiData {
  lat: number;
  lon: number;
  name: string;
  category: "shelter" | "water";
}

export type PoiCategory = PoiData["category"];
