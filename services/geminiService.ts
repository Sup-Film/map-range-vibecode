import { Location, AnalysisResult, PlaceItem } from "../types";

// --- Helper Types for Overpass ---

interface OverpassElement {
  id: number;
  lat: number;
  lon: number;
  tags: {
    name?: string;
    "name:th"?: string;
    "name:en"?: string;
    amenity?: string;
    shop?: string;
    leisure?: string;
    highway?: string;
    tourism?: string;
    office?: string;
    [key: string]: string | undefined;
  };
}

// --- Service Implementation ---

export const analyzeLocation = async (
  location: Location,
  radiusMeters: number
): Promise<AnalysisResult> => {
  try {
    // Overpass QL query to fetch relevant nodes around the location
    const query = `
      [out:json][timeout:25];
      (
        node(around:${radiusMeters},${location.lat},${location.lng})["amenity"];
        node(around:${radiusMeters},${location.lat},${location.lng})["shop"];
        node(around:${radiusMeters},${location.lat},${location.lng})["leisure"];
        node(around:${radiusMeters},${location.lat},${location.lng})["public_transport"];
        node(around:${radiusMeters},${location.lat},${location.lng})["railway"="station"];
        node(around:${radiusMeters},${location.lat},${location.lng})["highway"="bus_stop"];
        node(around:${radiusMeters},${location.lat},${location.lng})["office"="government"];
      );
      out body;
      >;
      out skel qt;
    `;

    const url = "https://overpass-api.de/api/interpreter";
    const response = await fetch(url, {
      method: "POST",
      body: query,
    });
    const data = await response.json();
    const elements = data.elements as OverpassElement[];

    // Helper to calculate distance
    const getDistance = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number
    ) => {
      const R = 6371; // km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Helper to format place item
    const formatPlace = (e: OverpassElement): PlaceItem => {
      const distKm = getDistance(location.lat, location.lng, e.lat, e.lon);
      const distStr =
        distKm < 1
          ? `${(distKm * 1000).toFixed(0)} ม.`
          : `${distKm.toFixed(1)} กม.`;

      const name =
        e.tags["name:th"] ||
        e.tags["name"] ||
        e.tags["name:en"] ||
        "สถานที่ระบุชื่อไม่ได้";

      return {
        name: name,
        distance: distStr,
        lat: e.lat,
        lng: e.lon,
        popularity: 0.5,
        rating: undefined,
        reviews: undefined,
        source: "google", 
      } as PlaceItem;
    };

    // Categorize results
    const result: AnalysisResult = {
      locationName: `พื้นที่รอบพิกัด ${location.lat.toFixed(
        4
      )}, ${location.lng.toFixed(4)}`,
      summary: "ข้อมูลจาก OpenStreetMap (วิเคราะห์โดย System)",
      residential: [],
      convenience: [],
      shopping: [],
      food: [],
      transport: [],
      recreation: [],
      public_service: [],
    };

    elements.forEach((e) => {
      if (!e.tags) return;
      const item = formatPlace(e);
      const t = e.tags;

      if (
        t.landuse === "residential" ||
        t.place === "suburb" ||
        t.building === "apartments"
      ) {
        result.residential.push(item);
      } else if (
        t.shop === "convenience" ||
        t.name?.includes("7-Eleven") ||
        t.name?.includes("Lotus")
      ) {
        result.convenience.push(item);
      } else if (
        t.shop === "supermarket" ||
        t.shop === "mall" ||
        t.shop === "department_store" ||
        t.amenity === "marketplace"
      ) {
        result.shopping.push(item);
      } else if (
        t.amenity === "restaurant" ||
        t.amenity === "cafe" ||
        t.amenity === "fast_food" ||
        t.amenity === "food_court"
      ) {
        result.food.push(item);
      } else if (
        t.public_transport ||
        t.railway === "station" ||
        t.highway === "bus_stop" ||
        t.amenity === "bus_station"
      ) {
        result.transport.push(item);
      } else if (
        t.leisure === "park" ||
        t.leisure === "fitness_centre" ||
        t.leisure === "sports_centre" ||
        t.leisure === "playground"
      ) {
        result.recreation.push(item);
      } else if (
        t.amenity === "post_office" ||
        t.amenity === "police" ||
        t.amenity === "hospital" ||
        t.amenity === "clinic" ||
        t.office === "government"
      ) {
        result.public_service.push(item);
      }
    });

    const limit = (arr: PlaceItem[]) => arr.slice(0, 10);
    result.residential = limit(result.residential);
    result.convenience = limit(result.convenience);
    result.shopping = limit(result.shopping);
    result.food = limit(result.food);
    result.transport = limit(result.transport);
    result.recreation = limit(result.recreation);
    result.public_service = limit(result.public_service);

    return result;
  } catch (error) {
    console.error("Analysis Error:", error);
    throw new Error("ไม่สามารถวิเคราะห์พื้นที่ได้ในขณะนี้");
  }
};
