/**
 * Official stage waypoints along the Frankenweg.
 * Coordinates are approximate and will be snapped to the nearest track point.
 * Source: https://de.wikipedia.org/wiki/Frankenweg
 */

export interface StageWaypoint {
  name: string;
  lat: number;
  lon: number;
}

export const STAGE_WAYPOINTS: StageWaypoint[] = [
  { name: "Untereichenstein", lat: 50.400, lon: 11.691 },
  { name: "Naila", lat: 50.330, lon: 11.707 },
  { name: "Bischofsmühle", lat: 50.282, lon: 11.645 },
  { name: "Elbersreuth", lat: 50.261, lon: 11.586 },
  { name: "Zeyern", lat: 50.222, lon: 11.425 },
  { name: "Kronach", lat: 50.241, lon: 11.328 },
  { name: "Kulmbach", lat: 50.108, lon: 11.454 },
  { name: "Weismain", lat: 50.085, lon: 11.241 },
  { name: "Klosterlangheim", lat: 50.062, lon: 11.135 },
  { name: "Staffelberg", lat: 50.050, lon: 11.044 },
  { name: "Scheßlitz", lat: 49.977, lon: 11.029 },
  { name: "Heiligenstadt", lat: 49.869, lon: 11.174 },
  { name: "Streitberg", lat: 49.815, lon: 11.225 },
  { name: "Gößweinstein", lat: 49.770, lon: 11.339 },
  { name: "Kirchenbirkig", lat: 49.740, lon: 11.401 },
  { name: "Egloffstein", lat: 49.703, lon: 11.260 },
  { name: "Gräfenberg", lat: 49.646, lon: 11.251 },
  { name: "Schnaittach", lat: 49.558, lon: 11.340 },
  { name: "Hersbruck", lat: 49.510, lon: 11.432 },
  { name: "Altdorf", lat: 49.387, lon: 11.357 },
  { name: "Neumarkt", lat: 49.271, lon: 11.463 },
  { name: "Berching", lat: 49.105, lon: 11.440 },
  { name: "Thalmässing", lat: 49.088, lon: 11.223 },
  { name: "Weißenburg", lat: 49.031, lon: 10.975 },
  { name: "Treuchtlingen", lat: 48.955, lon: 10.908 },
  { name: "Wemding", lat: 48.872, lon: 10.724 },
  { name: "Harburg", lat: 48.783, lon: 10.694 },
];
