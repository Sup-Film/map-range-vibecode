import { Location, RouteOption } from "../types";

// --- Types ---

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface PhotonResult {
  features: {
    geometry: {
      coordinates: [number, number];
    };
    properties: {
      name: string;
      city?: string;
      country?: string;
    };
  }[];
}

interface ArcGISResult {
  candidates: {
    address: string;
    location: {
      x: number; // lng
      y: number; // lat
    };
    score: number;
  }[];
}

interface OSRMRouteResponse {
  routes: {
    distance: number;
    duration: number;
    geometry: {
      coordinates: [number, number][]; // GeoJSON format [lng, lat]
      type: string;
    };
    legs: {
      steps: {
        geometry: string;
        maneuver: {
          type: string;
          modifier?: string;
        };
        mode: string;
        duration: number;
        distance: number;
        name: string;
      }[];
    }[];
  }[];
}

// --- Helper Functions for Translation ---

const translateDirection = (modifier?: string): string => {
  if (!modifier) return "";
  const map: Record<string, string> = {
    left: "ซ้าย",
    right: "ขวา",
    "slight left": "เบี่ยงซ้าย",
    "slight right": "เบี่ยงขวา",
    "sharp left": "ซ้ายหักศอก",
    "sharp right": "ขวาหักศอก",
    straight: "ตรงไป",
    uturn: "กลับรถ",
  };
  return map[modifier] || modifier;
};

const translateInstruction = (
  type: string,
  modifier: string | undefined,
  name: string
): string => {
  const dir = translateDirection(modifier);
  const roadName = name && name !== "road" ? ` ${name}` : "";
  const roadPrefix = roadName ? "เข้าสู่" : "";

  switch (type) {
    case "depart":
      return `เริ่มต้น มุ่งหน้าไปทาง${dir} ${name ? `ไปตาม${roadName}` : ""}`;
    case "arrive":
      return `ถึงจุดหมาย${roadName ? ` ที่${roadName}` : ""}`;
    case "turn":
      return `เลี้ยว${dir} ${roadPrefix}${roadName}`;
    case "merge":
      return `เบี่ยง${dir} เพื่อเชื่อมต่อกับ${roadName}`;
    case "on ramp":
      return `ชิด${dir} เพื่อขึ้นทางลาด/ทางด่วน${roadName}`;
    case "off ramp":
      return `ชิด${dir} เพื่อลงจากทางลาด/ทางด่วน${roadName}`;
    case "fork":
      return `ที่ทางแยก ชิด${dir} ${roadPrefix}${roadName}`;
    case "end of road":
      return `เลี้ยว${dir} เมื่อสุดทาง${roadName}`;
    case "roundabout":
      return `ที่วงเวียน ใช้ทางออก${dir}`;
    case "rotary":
      return `เข้าวงเวียน ${roadPrefix}${roadName}`;
    case "exit roundabout":
      return `ออกจากวงเวียน ${roadPrefix}${roadName}`;
    case "new name":
      return `ขับต่อไปยัง${roadName}`;
    case "continue":
      return `ขับต่อไปยัง${roadName}`;
    case "notification":
      return `โปรดระวัง: ${dir}`;
    default:
      // Fallback: combine type and direction if unknown
      return `${type} ${dir} ${roadPrefix}${roadName}`;
  }
};

// --- Search Implementation ---

export const searchLocation = async (query: string): Promise<Location> => {
  const trimmedQuery = query.trim();

  // 1. Try parsing coordinates directly (Lat, Lng or Lat Lng)
  // Support formats: "13.75, 100.50", "13.75 100.50", "Lat: 13.75 Lng: 100.50"
  const coordRegex = /([-+]?\d{1,2}\.\d+)[,\s]+([-+]?\d{1,3}\.\d+)/;
  const coordMatch = trimmedQuery.match(coordRegex);

  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return { lat, lng };
    }
  }

  // 2. Try ArcGIS World Geocoding (Very robust for addresses and specific places)
  try {
    const arcGisUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(
      trimmedQuery
    )}&maxLocations=1`;
    const response = await fetch(arcGisUrl);
    const data = (await response.json()) as ArcGISResult;

    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      return {
        lat: candidate.location.y,
        lng: candidate.location.x,
      };
    }
  } catch (e) {
    console.warn("ArcGIS search failed, falling back...");
  }

  // 3. Try Photon (Komoot) - Great for fuzzy search and typos, based on OSM
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      trimmedQuery
    )}&limit=1`;
    const response = await fetch(photonUrl);
    const data = (await response.json()) as PhotonResult;

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].geometry.coordinates;
      return { lat, lng };
    }
  } catch (e) {
    console.warn("Photon search failed, falling back...");
  }

  // 4. Try Nominatim (OpenStreetMap) - Strict but standard
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      trimmedQuery
    )}&limit=1`;
    const response = await fetch(nominatimUrl);
    const data = (await response.json()) as NominatimResult[];

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
  } catch (e) {
    console.warn("Nominatim search failed");
  }

  throw new Error("ไม่พบสถานที่ดังกล่าว กรุณาลองระบุชื่อที่ชัดเจนขึ้น");
};

// --- Routing Implementation ---

export const suggestRoute = async (
  origin: Location,
  destination: Location
): Promise<RouteOption[]> => {
  try {
    // Request full GeoJSON geometry for the route
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`;

    const response = await fetch(url);
    const data = (await response.json()) as OSRMRouteResponse;

    if (!data.routes || data.routes.length === 0) {
      throw new Error("No route found");
    }

    const route = data.routes[0];

    // Map OSRM steps to our format with Thai Translation
    const steps = route.legs[0].steps.map((step) => ({
      instruction: translateInstruction(
        step.maneuver.type,
        step.maneuver.modifier,
        step.name
      ),
      distance:
        step.distance < 1000
          ? `${step.distance.toFixed(0)} ม.`
          : `${(step.distance / 1000).toFixed(1)} กม.`,
      duration: `${Math.ceil(step.duration / 60)} นาที`,
      mode: "car" as const,
    }));

    const totalDistKm = route.distance / 1000;
    const totalDurationMins = Math.ceil(route.duration / 60);
    const estCost = Math.ceil(35 + totalDistKm * 6); // Rough taxi estimate

    // Convert GeoJSON [lng, lat] to [lat, lng] for Leaflet
    const coordinates = route.geometry.coordinates.map(
      (coord) => [coord[1], coord[0]] as [number, number]
    );

    const option: RouteOption = {
      id: "osrm-driving",
      title: "รถยนต์ส่วนตัว / แท็กซี่",
      totalDuration: `${totalDurationMins} นาที`,
      totalDistance: `${totalDistKm.toFixed(1)} กม.`,
      totalCost: `~${estCost} บาท`,
      steps: steps,
      recommended: true,
      coordinates: coordinates, // Precise path
    };

    return [option];
  } catch (error) {
    console.error("Routing Error:", error);
    throw new Error("ไม่สามารถคำนวณเส้นทางได้");
  }
};
