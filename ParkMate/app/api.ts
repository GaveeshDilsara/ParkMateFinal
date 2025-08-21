// app/api.ts
import { Platform } from "react-native";

const DEV_HOST = Platform.select({
  ios: "http://127.0.0.1",
  android: "http://192.168.8.131", // Android emulator
});

// Use your LAN IP when testing on real device
export const API_BASE = "http://192.168.8.131/Parkmate";

export const API = {
  registerOwner: `${API_BASE}/register_owner.php`,
  loginOwner: `${API_BASE}/login_owner.php`,
  createSpace: `${API_BASE}/create_parking_space.php`,
  listOwnerSpaces: `${API_BASE}/list_owner_spaces.php`,
  checkInVehicle: `${API_BASE}/check_in_vehicle.php`,
  checkOutVehicle: `${API_BASE}/check_out_vehicle.php`,
  lookupVehicle: `${API_BASE}/lookup_vehicle.php`,
  createPayment: `${API_BASE}/create_payment.php`,
  // Driver endpoints
  registerDriver: `${API_BASE}/register_driver.php`,
  loginDriver: `${API_BASE}/login_driver.php`,
  // Nearby search (returns distance, availability, and pricing)
  searchNearbySpaces: `${API_BASE}/search_nearby_spaces.php`,
};

async function request<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const raw = await res.text();

  const sanitize = (s: string) => {
    let t = s.replace(/^\uFEFF/, "").trim();
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      t = t.slice(start, end + 1);
    }
    return t;
  };

  let data: any;
  try {
    const clean = sanitize(raw);
    data = JSON.parse(clean);
  } catch {
    if (res.ok && (!raw || !raw.trim())) throw new Error("Empty JSON response from server");
    throw new Error(raw && raw.length < 600 ? raw : "Server error");
  }

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }
  return data as T;
}

export type VehicleKey = "cars" | "vans" | "bikes" | "buses";

export function checkInVehicle(payload: {
  parking_space_id: number;
  vehicle_no: string;
  category: VehicleKey;
  phone?: string;
  in_time?: string;
}) {
  return request<{ success: true; vehicle_id: number }>(API.checkInVehicle, payload);
}

export function registerOwner(payload: {
  full_name?: string;
  username: string;
  password: string;
  email: string;
  nic: string;
  phone: string;
}) {
  return request<{ success: true; owner_id: number; username: string }>(API.registerOwner, payload);
}

export function loginOwner(identifier: string, password: string) {
  return request<{ success: true; owner: any }>(API.loginOwner, { identifier, password });
}

export async function createParkingSpaceMultipart(form: FormData) {
  const res = await fetch(API.createSpace, { method: "POST", body: form });
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { success: false, message: text || "Server error" };
  }
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }
  return data as {
    success: true;
    parking_space_id: number;
    agreement_path?: string | null;
    photos_path?: string | null;
    photos?: string[];
    latitude?: number;
    longitude?: number;
  };
}

export function listOwnerSpaces(owner_id: number) {
  return request<{ success: true; spaces: any[] }>(API.listOwnerSpaces, { owner_id });
}

export function checkOutVehicle(payload: {
  parking_space_id: number;
  vehicle_no: string;
  out_time?: string;
  pin: string;
}) {
  return request<{ success: true; vehicle_id: number }>(API.checkOutVehicle, payload);
}

export function lookupVehicle(payload: { parking_space_id: number; vehicle_no: string }) {
  return request<{
    success: true;
    active: boolean;
    vehicle_id?: number;
    in_time?: string;
    last_status?: "in" | "out";
    last_in_time?: string | null;
    last_out_time?: string | null;
  }>(API.lookupVehicle, payload);
}

export function createPayment(payload: { parking_space_id: number; payment: number; pin: string }) {
  return request<{ success: true; payment_id: number }>(API.createPayment, payload);
}

/* -------- NEW: driver auth -------- */
export function registerDriver(payload: { username: string; email: string; password: string }) {
  return request<{ success: true; driver_id: number; username: string }>(API.registerDriver, payload);
}

export function loginDriver(identifier: string, password: string) {
  return request<{ success: true; driver: { id: number; name: string; email: string } }>(
    API.loginDriver,
    { identifier, password }
  );
}

/* -------- NEW: nearby search -------- */
export type NearbySpace = {
  id: number;
  parking_name: string;
  location: string;
  latitude: number;
  longitude: number;
  distance_km: number;

  // NEW fields from the API join
  availability?: string;                 // opening hours string
  price_unit?: "hour" | "day" | null;    // unit for prices
  cars?: number | null;
  vans?: number | null;
  bikes?: number | null;
  buses?: number | null;
};

export function searchNearbySpaces(payload: { lat: number; lng: number; radius_m?: number }) {
  return request<{ success: true; spaces: NearbySpace[] }>(API.searchNearbySpaces, payload);
}
