// app/ShowLocations.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Linking,
  Platform,
  Alert,
} from "react-native";
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NearbySpace, searchNearbySpaces } from "./api";

/* ---------- Theme ---------- */
const BRAND = "#2F80ED";
const BG = "#F5F7FB";
const CARD = "#FFFFFF";
const TEXT = "#0F172A";
const SUB = "#6B7280";
const BORDER = "#E5E7EB";
const MUTED = "#9CA3AF";

/* ---------- Navigation Types ---------- */
type RootStackParamList = {
  Driver_Home: undefined;
  ShowLocations:
    | {
        spaces?: NearbySpace[];
        center?: { lat: number; lng: number };
        radius_m?: number;
      }
    | undefined;
};
type Nav = NativeStackNavigationProp<RootStackParamList, "ShowLocations">;
type Rte = RouteProp<RootStackParamList, "ShowLocations">;

/* ---------- Local UI Space type ---------- */


type PriceUnit = "hour" | "day";

type UISpace = Omit<
  NearbySpace,
  | "id"
  | "availability"
  | "price_unit"
  | "supports"
  | "image_url"
  | "distance_km"
  | "cars"
  | "bikes"
  | "buses"
  | "area"
> & {
  id?: string | number;
  space_id?: string | number;
  parking_id?: string | number;
  spaceId?: string | number;

  /** your preferred shape */
  availability?: string | null;
  price_unit?: PriceUnit | null;

  cars?: number | null;
  bikes?: number | null;
  buses?: number | null;

  available_spaces?: number;
  image_url?: string;
  supports?: Array<"car" | "bus" | "bike">;
  area?: string;
  distance_km?: number | null;
};

type SpaceView = UISpace & { _id: string };





/* ---------- For price chips ---------- */
type PriceCat = {
  key: "car" | "bike" | "bus";
  label: string;
  icon: React.ReactNode;
  price: number | null;
};

/* ---------- Banners ---------- */
const BANNERS = [
  "https://images.unsplash.com/photo-1550355291-bbee04a92027?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518306727298-4c9b2dc8cc01?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519638399535-1b036603ac77?q=80&w=1600&auto=format&fit=crop",
];

/* ---------- Fallback ---------- */
const FALLBACK_SPACES: UISpace[] = [
  {
    id: "thum-1",
    parking_name: "Thummulla City Parking",
    location: "Thummulla, Colombo",
    latitude: 6.9003,
    longitude: 79.8612,
    available_spaces: 10,
    image_url:
      "https://images.unsplash.com/photo-1593941707874-ef25b8b4a92f?q=80&w=1200&auto=format&fit=crop",
    supports: ["car", "bus", "bike"],
    area: "Thummulla",
    distance_km: 0.4,
    availability: "Mon 9:00 AM — 5:00 PM; Tue 9:00 AM — 5:00 PM",
    price_unit: "hour",
    cars: 200,
    bikes: 100,
    buses: 800,
  },
];

/* ---------- Helpers ---------- */
function extractTimeWindow(avail?: string | null): string | null {
  if (!avail) return null;
  const re =
    /(\d{1,2}(?::\d{2})?\s?(?:AM|PM))\s*[\-–—]\s*(\d{1,2}(?::\d{2})?\s?(?:AM|PM))/i;
  const m = avail.match(re);
  if (!m) return null;
  const start = m[1].replace(/\s+/g, " ").toUpperCase();
  const end = m[2].replace(/\s+/g, " ").toUpperCase();
  return `${start} — ${end}`;
}

/** Open directions FROM live location TO destination */
async function openDirections(
  dest: { lat?: number | null; lng?: number | null; label?: string },
  cachedOrigin?: { lat?: number | null; lng?: number | null }
) {
  const { lat, lng } = dest;
  if (!lat || !lng || !isFinite(lat) || !isFinite(lng)) {
    Alert.alert("Unable to open map", "Missing destination coordinates.");
    return;
  }

  let originLat = cachedOrigin?.lat;
  let originLng = cachedOrigin?.lng;
  if (
    originLat == null ||
    originLng == null ||
    !isFinite(originLat as number) ||
    !isFinite(originLng as number)
  ) {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") throw new Error("Location permission denied");
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      originLat = pos.coords.latitude;
      originLng = pos.coords.longitude;
    } catch {
      originLat = undefined;
      originLng = undefined;
    }
  }

  const label = encodeURIComponent(dest.label ?? "Destination");

  try {
    if (Platform.OS === "ios") {
      const canGoogle = await Linking.canOpenURL("comgooglemaps://");
      if (canGoogle) {
        const gmapsApp = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving${
          originLat != null && originLng != null ? `&saddr=${originLat},${originLng}` : ""
        }`;
        await Linking.openURL(gmapsApp);
        return;
      }
      const appleMaps = `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d${
        originLat != null && originLng != null ? `&saddr=${originLat},${originLng}` : ""
      }&q=${label}`;
      await Linking.openURL(appleMaps);
      return;
    }

    const gmapsWeb = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${
      originLat != null && originLng != null ? `&origin=${originLat},${originLng}` : ""
    }&travelmode=driving`;
    await Linking.openURL(gmapsWeb);
  } catch {
    Alert.alert("Map error", "Could not launch directions.");
  }
}

/* ---------- Small util ---------- */
function firstName(name?: string) {
  if (!name) return "";
  const n = String(name).trim();
  const space = n.indexOf(" ");
  return space > 0 ? n.slice(0, space) : n;
}

export default function ShowLocations() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rte>();

  const [driverName, setDriverName] = useState<string>("");

  const [live, setLive] = useState<NearbySpace[] | null>(route.params?.spaces ?? null);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(
    route.params?.center ?? null
  );
  const [loading, setLoading] = useState<boolean>(!route.params?.spaces);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerRef = useRef<ScrollView | null>(null);

  // Load greeting on focus
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const raw = await AsyncStorage.getItem("pm_driver");
          if (!mounted) return;
          if (raw) {
            const obj = JSON.parse(raw);
            const nm: string | undefined = obj?.name ?? obj?.driver?.name;
            setDriverName(nm ? firstName(nm) : "");
          } else {
            setDriverName("");
          }
        } catch {
          setDriverName("");
        }
      })();
      return () => {
        mounted = false;
      };
    }, [])
  );

  const requestLocationAndFetch = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      let lat: number, lng: number;
      if (route.params?.center) {
        lat = route.params.center.lat;
        lng = route.params.center.lng;
        setCenter({ lat, lng });
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") throw new Error("Location permission denied");
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        setCenter({ lat, lng });
      }
      // Always 2km per requirement
      const res = await searchNearbySpaces({ lat, lng, radius_m: 2000 });
      setLive(res.spaces ?? []);
    } catch (e: any) {
      setError(e?.message || "Failed to load nearby spaces");
      if (!live) setLive([]);
    } finally {
      setLoading(false);
    }
  }, [route.params?.center]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await requestLocationAndFetch();
    } finally {
      setRefreshing(false);
    }
  }, [requestLocationAndFetch]);

  useEffect(() => {
    if (!route.params?.spaces) requestLocationAndFetch();
  }, [requestLocationAndFetch, route.params?.spaces]);

  /* ---------- Normalize (typed useMemo) ---------- */
  const spaces = useMemo<SpaceView[]>(() => {
    const base = (Array.isArray(live) && live.length > 0
      ? (live as UISpace[])
      : FALLBACK_SPACES) as UISpace[];

    const SUP_KEYS = ["car", "bus", "bike"] as const;

    return base.map((s, idx): SpaceView => {
      const _id = String(
        s.id ??
          s.space_id ??
          s.parking_id ??
          s.spaceId ??
          `${s.latitude},${s.longitude}-${idx}`
      );

      const supports: Array<"car" | "bus" | "bike"> = Array.isArray(s.supports)
        ? (s.supports.filter((v) =>
            (SUP_KEYS as readonly string[]).includes(String(v))
          ) as Array<(typeof SUP_KEYS)[number]>)
        : (SUP_KEYS as unknown as Array<"car" | "bus" | "bike">);

      return {
        // 1) raw server object first
        ...s,

        // 2) safe overrides & normalizations
        image_url:
          s.image_url ??
          "https://images.unsplash.com/photo-1593941707874-ef25b8b4a92f?q=80&w=1200&auto=format&fit=crop",
        supports,
        area:
          s.area ??
          (s.location ? s.location.split(",")[0]?.trim() : s.parking_name ?? "Area"),
        price_unit: (s.price_unit as PriceUnit | null) ?? null,
        cars: s.cars ?? null,
        bikes: s.bikes ?? null,
        buses: s.buses ?? null,
        availability: s.availability ?? null,
        distance_km: s.distance_km ?? null,

        // 3) computed id used as React key
        _id,
      };
    });
  }, [live]);

  const onBannerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement } = e.nativeEvent;
    const idx = Math.round(contentOffset.x / Math.max(1, layoutMeasurement.width));
    if (idx !== bannerIndex) setBannerIndex(idx);
  };

  const goBack = () => navigation.goBack();
  const greetingName = driverName ? driverName : "Driver";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={22} color={TEXT} />
        </Pressable>
        <View style={styles.greetingWrap}>
          <Text style={styles.hello}>Welcome Back,</Text>
          <Text style={styles.userRow}>
            <Text style={styles.user}>{greetingName}</Text> <Text style={styles.wave}>👋</Text>
          </Text>
        </View>
        <View style={styles.avatarWrap}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1541534401786-2077eed87a72?q=80&w=300&auto=format&fit=crop",
            }}
            style={styles.avatar}
          />
        </View>
      </View>

      {center && (
        <View style={styles.statusStrip}>
          <Ionicons name="radio-outline" size={14} color="#10B981" />
          <Text style={styles.statusText}>
            Live near {center.lat.toFixed(4)}, {center.lng.toFixed(4)} · 2 km radius
          </Text>
          <View style={styles.statusDot} />
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            tintColor={BRAND}
            colors={[BRAND]}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {/* Banner carousel */}
        <View style={styles.bannerWrap}>
          <ScrollView
            ref={bannerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onBannerScroll}
            scrollEventThrottle={16}
          >
            {BANNERS.map((uri, i) => (
              <ImageBackground
                key={i}
                source={{ uri }}
                style={styles.banner}
                imageStyle={styles.bannerImg}
              />
            ))}
          </ScrollView>
          <View style={styles.dotsRow}>
            {BANNERS.map((_, i) => (
              <View key={i} style={[styles.dot, i === bannerIndex && styles.dotActive]} />
            ))}
          </View>
        </View>

        {/* Loading / Error / Empty */}
        {loading && (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={BRAND} />
            <Text style={styles.centerNote}>Fetching nearby spaces…</Text>
          </View>
        )}

        {!!error && !loading && (
          <View style={styles.centerBox}>
            <Ionicons name="warning-outline" size={22} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={requestLocationAndFetch}>
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {!loading && !error && live && live.length === 0 && (
          <View style={styles.centerBox}>
            <Ionicons name="location-outline" size={22} color={SUB} />
            <Text style={styles.centerNote}>No spaces within 2 km.</Text>
            <Text style={styles.centerSub}>Showing a sample below.</Text>
          </View>
        )}

        {/* Location Cards */}
        {!loading &&
          spaces.map((s) => {
            const timeOnly = extractTimeWindow(s.availability);
            const priceUnit = s.price_unit ? ` / ${s.price_unit}` : "";

            const cats: PriceCat[] = [
              {
                key: "car" as const,
                label: "Car",
                icon: <Ionicons name="car-outline" size={14} color={TEXT} />,
                price: s.cars ?? null,
              },
              {
                key: "bike" as const,
                label: "Bike",
                icon: <Ionicons name="bicycle-outline" size={14} color={TEXT} />,
                price: s.bikes ?? null,
              },
              {
                key: "bus" as const,
                label: "Bus",
                icon: <MaterialCommunityIcons name="bus" size={14} color={TEXT} />,
                price: s.buses ?? null,
              },
            ].filter((c) => c.price !== null);

            return (
              <View key={s._id} style={styles.locationCard}>
                {/* Header image with overlay title */}
                <View style={styles.cardHeader}>
                  <Image source={{ uri: s.image_url! }} style={styles.headerImg} />
                  <View style={styles.headerOverlay} />
                  <View style={styles.headerContent}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {s.parking_name || s.area || "Parking"}
                    </Text>
                    <View style={styles.badgeRow}>
                      {!!s.distance_km && (
                        <View style={styles.badge}>
                          <Ionicons name="navigate" size={12} color="#fff" />
                          <Text style={styles.badgeText}>{formatKm(s.distance_km)}</Text>
                        </View>
                      )}
                      {!!timeOnly && (
                        <View style={[styles.badge, { backgroundColor: "#F59E0B" }]}>
                          <Ionicons name="time-outline" size={12} color="#fff" />
                          <Text style={styles.badgeText}>{timeOnly}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Body */}
                <View style={styles.cardBody}>
                  {/* Area / Location line */}
                  <View style={styles.row}>
                    <Ionicons name="location-outline" size={18} color="#EF4444" />
                    <Text style={styles.areaText} numberOfLines={1}>
                      {s.area || s.parking_name}
                    </Text>
                  </View>

                  {/* Price chips */}
                  <View style={styles.priceRow}>
                    {cats.length > 0 ? (
                      cats.map((c, idx) => (
                        <View key={idx} style={styles.priceChip}>
                          <View style={styles.priceChipIcon}>{c.icon}</View>
                          <Text style={styles.priceChipLabel}>{c.label}</Text>
                          <Text style={styles.priceChipValue}>
                            {c.price != null ? `Rs ${c.price}${priceUnit}` : "—"}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={{ color: MUTED, fontWeight: "700" }}>No pricing available</Text>
                    )}
                  </View>

                  {/* Optional available spaces */}
                  {s.available_spaces != null && (
                    <View style={[styles.row, { marginTop: 6 }]}>
                      <Ionicons name="grid-outline" size={18} color={BRAND} />
                      <Text style={styles.kvText}>
                        <Text style={styles.kvKey}>Spaces Available: </Text>
                        <Text style={styles.kvVal}>{String(s.available_spaces)}</Text>
                      </Text>
                    </View>
                  )}
                </View>

                {/* Footer actions */}
                <View style={styles.cardFooter}>
                  <Pressable
                    style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
                    onPress={() =>
                      openDirections(
                        {
                          lat: s.latitude,
                          lng: s.longitude,
                          label: s.parking_name || s.area || "Parking",
                        },
                        center ?? undefined
                      )
                    }
                  >
                    <Ionicons name="map-outline" size={16} color="#fff" />
                    <Text style={styles.primaryBtnText}>View on Map</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- Helpers ---------- */
function formatKm(km?: number | null) {
  if (km == null) return "-";
  const num = Number(km);
  if (!isFinite(num)) return "-";
  const digits = num < 10 ? 2 : 1;
  return `${num.toFixed(digits)} km`;
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  /* Top bar */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 12,
    backgroundColor: BG,
  },
  iconBtn: {
    height: 36,
    width: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  greetingWrap: { flex: 1 },
  hello: { color: SUB, fontSize: 12, fontWeight: "700" },
  userRow: { marginTop: 2 },
  user: { color: TEXT, fontSize: 18, fontWeight: "900" },
  wave: { fontSize: 18 },
  avatarWrap: { height: 36, width: 36, borderRadius: 18, overflow: "hidden" },
  avatar: { height: "100%", width: "100%" },

  /* Status strip */
  statusStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusText: { color: SUB, fontSize: 12, fontWeight: "700" },
  statusDot: { marginLeft: "auto", height: 8, width: 8, borderRadius: 4, backgroundColor: "#22C55E" },

  /* Banner */
  bannerWrap: { marginTop: 6 },
  banner: { height: 160, width: "100%", justifyContent: "flex-end" } as any,
  bannerImg: { resizeMode: "cover", borderRadius: 16, marginHorizontal: 16 },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 8 },
  dot: { height: 6, width: 6, borderRadius: 3, backgroundColor: "#D1D5DB" },
  dotActive: { backgroundColor: TEXT, width: 18 },

  /* Empty/Loading/Error blocks */
  centerBox: {
    marginTop: 18,
    marginHorizontal: 16,
    backgroundColor: CARD,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    gap: 10,
  },
  centerNote: { color: SUB, fontSize: 14, fontWeight: "700" },
  centerSub: { color: SUB, fontSize: 12 },
  errorText: { color: "#EF4444", fontSize: 13, textAlign: "center" },
  retryBtn: {
    marginTop: 4,
    backgroundColor: BRAND,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  retryText: { color: "#fff", fontWeight: "800", fontSize: 13 },

  /* Card */
  locationCard: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: CARD,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  cardHeader: { position: "relative", height: 160, width: "100%" },
  headerImg: { height: "100%", width: "100%" },
  headerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 90,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  headerContent: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 10,
  },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },

  badgeRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BRAND,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "800" },

  cardBody: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  areaText: { color: TEXT, fontSize: 15, fontWeight: "800", flex: 1 },

  kvText: { color: TEXT, fontSize: 14 },
  kvKey: { color: SUB, fontWeight: "700" },
  kvVal: { color: TEXT, fontWeight: "800" },

  priceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
    marginBottom: 6,
  },
  priceChip: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FAFAFB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priceChipIcon: {
    height: 22,
    width: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  priceChipLabel: { color: SUB, fontSize: 12, fontWeight: "800" },
  priceChipValue: { color: TEXT, fontSize: 13, fontWeight: "900" },

  cardFooter: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: BRAND,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryBtnText: { color: "#fff", fontWeight: "900", fontSize: 13 },
});
