export interface Location {
  lat: number;
  lng: number;
}

export interface PlaceItem {
  name: string;
  distance: string; // e.g., "0.5 กม." or "1.2 km"
  lat?: number;
  lng?: number;

  // New fields for Heatmap & External API structure
  popularity?: number; // 0.0 to 1.0 (Density/Traffic score)
  rating?: number; // 1.0 to 5.0
  reviews?: number; // Count of reviews
  source?: "gemini" | "google" | "foursquare"; // Data provenance
}

export interface AnalysisResult {
  locationName: string;
  summary: string;
  residential: PlaceItem[]; // หมู่บ้าน คอนโด หอพัก
  convenience: PlaceItem[]; // 7-11, Mini Big C, etc.
  shopping: PlaceItem[]; // ห้าง, ตลาด
  food: PlaceItem[]; // ร้านอาหาร, คาเฟ่
  transport: PlaceItem[]; // ขนส่งสาธารณะ (BTS, MRT, Bus stop)
  recreation: PlaceItem[]; // สวนสาธารณะ, สนามกีฬา
  public_service: PlaceItem[]; // สถานที่ราชการ, สถานีตำรวจ, ไปรษณีย์
}

export type Category =
  | keyof Omit<AnalysisResult, "locationName" | "summary">
  | "all";

export interface RouteStep {
  instruction: string; // "Walk to BTS Siam"
  distance?: string; // "500 m"
  duration?: string; // "5 mins"
  mode: "walk" | "bus" | "train" | "car" | "motorcycle";
}

export interface RouteOption {
  id: string;
  title: string; // "BTS + Walking"
  totalDuration: string;
  totalDistance: string; // Added field for total distance
  totalCost: string;
  steps: RouteStep[];
  recommended: boolean;
  coordinates?: [number, number][]; // Array of [lat, lng] for drawing the path
}

export enum AppStatus {
  IDLE = "IDLE",
  LOADING = "LOADING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

export type ViewMode = "markers" | "heatmap" | "route";
