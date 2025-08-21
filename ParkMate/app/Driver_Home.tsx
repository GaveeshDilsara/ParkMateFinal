// app/Driver_Home.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, Circle, Region, Callout } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { NearbySpace, searchNearbySpaces } from "./api";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

const BRAND = "#2F80ED";
const BG = "#F5F7FB";
const TEXT = "#111827";
const SUB = "#6B7280";

const FALLBACK_CENTER = { latitude: 6.9, longitude: 79.861 }; // Thummulla approx
const INITIAL_DELTA = { latitudeDelta: 0.02, longitudeDelta: 0.02 };
const RADIUS_METERS = 2000; // 2 km

// Infer instance type of <Marker /> so refs support showCallout/hideCallout
type MarkerRef = React.ComponentRef<typeof Marker>;

// ---- Navigation types (adjust route names if your navigator differs) ----
type RootStackParamList = {
  Driver_Home: undefined;
  ShowLocations: { spaces?: NearbySpace[] } | undefined;
};
type Nav = NativeStackNavigationProp<RootStackParamList, "Driver_Home">;

export default function Driver_Home() {
  const navigation = useNavigation<Nav>();
  const mapRef = useRef<MapView | null>(null);
  const markerRefs = useRef<Record<string, MarkerRef | null>>({});

  const [center, setCenter] = useState(FALLBACK_CENTER);
  const [region, setRegion] = useState<Region>({ ...FALLBACK_CENTER, ...INITIAL_DELTA });
  const [spaces, setSpaces] = useState<NearbySpace[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  const animateTo = useCallback((lat: number, lng: number, zoom = INITIAL_DELTA) => {
    const next = { latitude: lat, longitude: lng, ...zoom };
    setCenter({ latitude: lat, longitude: lng });
    setRegion(next);
    mapRef.current?.animateToRegion(next, 350);
  }, []);

  const refreshNearby = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await searchNearbySpaces({ lat, lng, radius_m: RADIUS_METERS });
      setSpaces(res.spaces || []);
    } catch {
      // optionally toast/log
    }
  }, []);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setHasPermission(false);
          animateTo(FALLBACK_CENTER.latitude, FALLBACK_CENTER.longitude);
          await refreshNearby(FALLBACK_CENTER.latitude, FALLBACK_CENTER.longitude);
          return;
        }
        setHasPermission(true);

        const last = await Location.getLastKnownPositionAsync();
        const pos =
          last ??
          (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }));

        animateTo(pos.coords.latitude, pos.coords.longitude);
        await refreshNearby(pos.coords.latitude, pos.coords.longitude);

        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 20,
            timeInterval: 5000,
          },
          async (loc) => {
            const { latitude, longitude } = loc.coords;
            setCenter({ latitude, longitude });
            setRegion((r) => ({ ...r, latitude, longitude }));
            await refreshNearby(latitude, longitude);
          }
        );
      } catch {
        animateTo(FALLBACK_CENTER.latitude, FALLBACK_CENTER.longitude);
        await refreshNearby(FALLBACK_CENTER.latitude, FALLBACK_CENTER.longitude);
      }
    })();

    return () => sub?.remove?.();
  }, [animateTo, refreshNearby]);

  const recenter = useCallback(() => {
    animateTo(center.latitude, center.longitude);
  }, [animateTo, center]);

  const sortedSpaces = useMemo(
    () => [...spaces].sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0)),
    [spaces]
  );

  const focusSpace = useCallback(
    (s: NearbySpace) => {
      animateTo(s.latitude, s.longitude, { latitudeDelta: 0.01, longitudeDelta: 0.01 });
      setTimeout(() => markerRefs.current[s.id]?.showCallout?.(), 380);
    },
    [animateTo]
  );

  const goToShowLocations = useCallback(() => {
    // Pass spaces if you want; ShowLocations can accept it via route.params
    navigation.navigate("ShowLocations", { spaces: sortedSpaces });
  }, [navigation, sortedSpaces]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nearby Parking (2 km)</Text>
        <Text style={styles.headerSub}>
          {hasPermission ? "Live location enabled" : "Using fallback location"}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <View style={styles.container}>
          <View style={styles.mapWrap}>
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              initialRegion={region}
              onRegionChangeComplete={(r) => setRegion(r)}
              showsMyLocationButton
            >
              {/* Radius */}
              <Circle
                center={center}
                radius={RADIUS_METERS}
                strokeColor="rgba(34,197,94,0.9)"
                fillColor="rgba(34,197,94,0.20)"
                strokeWidth={2}
                zIndex={1}
              />

              {/* BLUE live-location pin */}
              <Marker
                coordinate={center}
                anchor={{ x: 0.5, y: 1 }}
                zIndex={3}
                tracksViewChanges={false}
              >
                <Ionicons name="location-sharp" size={50} color="#2563EB" />
                <Callout>
                  <Text style={{ fontWeight: "700" }}>You are here</Text>
                </Callout>
              </Marker>

              {/* RED space pins with beautiful callout */}
              {sortedSpaces.map((s) => (
                <Marker
                  key={s.id}
                  ref={(ref: MarkerRef | null) => {
                    markerRefs.current[s.id] = ref;
                  }}
                  coordinate={{ latitude: s.latitude, longitude: s.longitude }}
                  anchor={{ x: 0.5, y: 1 }}
                  calloutAnchor={{ x: 0.5, y: 0 }}
                  zIndex={2}
                  tracksViewChanges={false}
                  onPress={() => focusSpace(s)}
                >
                  <Ionicons name="location-sharp" size={50} color="#EF4444" />
                  <Callout tooltip>
                    <View style={styles.calloutContainer}>
                      <View style={styles.calloutCard}>
                        <View style={styles.calloutHeaderRow}>
                          <Text numberOfLines={1} style={styles.calloutTitle}>
                            {s.parking_name}
                          </Text>
                          <View style={styles.calloutBadge}>
                            <Ionicons name="navigate" size={12} color="#fff" />
                            <Text style={styles.calloutBadgeText}>
                              {formatKm(s.distance_km)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.calloutRow}>
                          <Ionicons name="location-outline" size={16} color={SUB} />
                          <Text numberOfLines={2} style={styles.calloutSub}>
                            {s.location}
                          </Text>
                        </View>

                        <View style={styles.calloutFooterRow}>
                          <Text style={styles.calloutHint}>Tap pin again to recenter</Text>
                        </View>
                      </View>

                      {/* Arrow / tail */}
                      <View style={styles.calloutArrowBorder} />
                      <View style={styles.calloutArrow} />
                    </View>
                  </Callout>
                </Marker>
              ))}
            </MapView>

            {/* Floating recenter button (raised so it doesn't overlap bottom button) */}
            <Pressable style={styles.fab} onPress={recenter}>
              <Ionicons name="locate" size={22} color="#fff" />
            </Pressable>

            {/* ---- Bottom Primary Button ---- */}
            <View style={styles.bottomBar}>
              <Pressable
                onPress={goToShowLocations}
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="list" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>Show Locations</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatKm(km?: number) {
  if (km == null || isNaN(km)) return "-";
  const digits = km < 10 ? 2 : 1;
  return `${km.toFixed(digits)} km`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: BG },

  header: {
    backgroundColor: BRAND,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTitle: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "600", marginTop: 2 },

  mapWrap: { flex: 1, backgroundColor: "#E5E7EB" },

  /* Floating Action Button */
  fab: {
    position: "absolute",
    right: 16,
    bottom: 88, // was 16; lifted to clear the bottom bar
    height: 48,
    width: 48,
    borderRadius: 24,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },

  /* Bottom Bar + Primary Button */
  bottomBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: BRAND,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },

  /* ---- Custom Callout ---- */
  calloutContainer: {
    alignItems: "center",
  },
  calloutCard: {
    maxWidth: 280,
    minWidth: 220,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  calloutHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  calloutTitle: { flex: 1, fontSize: 16, fontWeight: "800", color: TEXT },
  calloutBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BRAND,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    gap: 4,
  },
  calloutBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  calloutRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "flex-start",
    marginBottom: 6,
  },
  calloutSub: { flex: 1, color: SUB, fontSize: 13, lineHeight: 18 },

  calloutFooterRow: {
    marginTop: 2,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  calloutHint: { color: SUB, fontSize: 11, fontWeight: "600" },

  // Arrow (little pointer under the bubble)
  calloutArrowBorder: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#E5E7EB",
    alignSelf: "center",
  },
  calloutArrow: {
    marginTop: -11,
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 11,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#FFFFFF",
    alignSelf: "center",
  },
});
