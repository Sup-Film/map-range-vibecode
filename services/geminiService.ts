
import { GoogleGenAI, Type } from "@google/genai";
import { Location, AnalysisResult, RouteOption } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeLocation = async (
  location: Location,
  radiusMeters: number
): Promise<AnalysisResult> => {
  try {
    const prompt = `
      Analyze the geographic area centered at Latitude: ${location.lat}, Longitude: ${location.lng} with a radius of ${radiusMeters} meters.
      
      I need a detailed list of specific real-world places found strictly within or very close to this radius.
      Group them into these categories:
      1. Residential (Villages, Condos, Apartments)
      2. Convenience Stores (7-Eleven, Lotus's Go Fresh, CJ, etc.)
      3. Shopping & Markets (Malls, Supermarkets, Fresh Markets)
      4. Food & Dining (Restaurants, Cafes, Street Food areas)
      5. Transportation (BTS/MRT Stations, Bus Stops, Piers, Train Stations)
      6. Recreation (Parks, Sports Complexes, Gyms, Public Parks)
      7. Public Services (Post Office, Police Stations, Government Offices, Hospitals/Clinics)

      For each item, provide:
      - Name (in Thai)
      - Estimated straight-line distance from center (${location.lat}, ${location.lng}) in kilometers (e.g. "0.5 กม.", "1.2 กม.").
      - Approximate Latitude and Longitude for the place (important for mapping).
      - Popularity Score (0.1 to 1.0): Estimate how busy/popular this place is (1.0 = very crowded/popular).
      - Rating (1.0 to 5.0): Estimated review rating.
      - Reviews: Estimated review count (integer).

      Also provide a general location name and a brief summary of the area's livability.
      Output must be in Thai language (ภาษาไทย).
    `;

    const placeItemSchema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Name of the place" },
        distance: { type: Type.STRING, description: "Distance from center e.g. '0.8 กม.'" },
        lat: { type: Type.NUMBER, description: "Latitude" },
        lng: { type: Type.NUMBER, description: "Longitude" },
        popularity: { type: Type.NUMBER, description: "Popularity/Density score 0.1-1.0" },
        rating: { type: Type.NUMBER, description: "Star rating 1-5" },
        reviews: { type: Type.NUMBER, description: "Review count" },
      },
      required: ["name", "distance", "popularity"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            locationName: {
              type: Type.STRING,
              description: "Name of the area or district in Thai",
            },
            summary: {
              type: Type.STRING,
              description: "Brief description of the area's livability in Thai",
            },
            residential: {
              type: Type.ARRAY,
              items: placeItemSchema,
              description: "List of villages, condos, apartments",
            },
            convenience: {
              type: Type.ARRAY,
              items: placeItemSchema,
              description: "List of convenience stores",
            },
            shopping: {
              type: Type.ARRAY,
              items: placeItemSchema,
              description: "List of malls and markets",
            },
            food: {
              type: Type.ARRAY,
              items: placeItemSchema,
              description: "List of restaurants and food sources",
            },
            transport: {
              type: Type.ARRAY,
              items: placeItemSchema,
              description: "List of transportation hubs",
            },
            recreation: {
              type: Type.ARRAY,
              items: placeItemSchema,
              description: "List of parks and recreation spots",
            },
            public_service: {
              type: Type.ARRAY,
              items: placeItemSchema,
              description: "List of public services and government offices",
            },
          },
          required: ["locationName", "summary", "residential", "convenience", "shopping", "food", "transport", "recreation", "public_service"],
        },
      },
    });

    const text = response.text;
    if (!text) {
        throw new Error("No response from AI");
    }
    
    // Inject 'source' field to simulate data origin
    const result = JSON.parse(text) as AnalysisResult;
    const enhance = (items: any[]) => items?.map(i => ({ ...i, source: 'gemini' })) || [];
    
    return {
      ...result,
      residential: enhance(result.residential),
      convenience: enhance(result.convenience),
      shopping: enhance(result.shopping),
      food: enhance(result.food),
      transport: enhance(result.transport),
      recreation: enhance(result.recreation),
      public_service: enhance(result.public_service),
    };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("ไม่สามารถวิเคราะห์พื้นที่ได้ในขณะนี้");
  }
};

export const searchLocation = async (query: string): Promise<Location> => {
  try {
    const prompt = `
      Identify the geographic coordinates (latitude and longitude) for the place named: "${query}".
      If the query is ambiguous, prefer a prominent location in Thailand.
      Return the result in JSON format with 'lat' and 'lng' as numbers.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
          },
          required: ["lat", "lng"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as Location;
  } catch (error) {
    console.error("Search Error:", error);
    throw new Error("ไม่พบสถานที่ดังกล่าว");
  }
};

export const suggestRoute = async (origin: Location, destination: Location): Promise<RouteOption[]> => {
  try {
    const prompt = `
      Act as a smart navigation assistant for Thailand.
      Plan a trip from Origin [Lat: ${origin.lat}, Lng: ${origin.lng}] to Destination [Lat: ${destination.lat}, Lng: ${destination.lng}].
      
      Provide 2-3 distinct route options prioritizing Public Transportation (BTS, MRT, ARL, Bus, Boat).
      If public transport is poor, include a Taxi/Ride-hailing option.
      
      For each option, provide:
      1. A short title (e.g. "BTS Green Line + Taxi").
      2. Total estimated duration (e.g. "45 mins").
      3. Total estimated cost in THB (e.g. "60-100 THB").
      4. Step-by-step instructions.
      5. Mode of transport for each step (walk, bus, train, car, motorcycle).
      
      Output in THAI language.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              totalDuration: { type: Type.STRING },
              totalCost: { type: Type.STRING },
              recommended: { type: Type.BOOLEAN },
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    instruction: { type: Type.STRING },
                    distance: { type: Type.STRING },
                    duration: { type: Type.STRING },
                    mode: { type: Type.STRING, enum: ['walk', 'bus', 'train', 'car', 'motorcycle'] }
                  }
                }
              }
            },
            required: ["id", "title", "totalDuration", "totalCost", "steps"]
          }
        }
      }
    });

    const text = response.text;
    if(!text) throw new Error("No route response");
    
    return JSON.parse(text) as RouteOption[];
  } catch (error) {
    console.error("Routing Error:", error);
    throw new Error("ไม่สามารถคำนวณเส้นทางได้");
  }
}
