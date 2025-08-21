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
  Alert,
  Animated,
  Dimensions,
  BackHandler,
  Image,
  ScrollView,
  InteractionManager,
} from "react-native";
import MapView, { Marker, Circle, Region, Callout } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { NearbySpace, searchNearbySpaces } from "./api";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BRAND = "#2F80ED";
const BG = "#F5F7FB";
const TEXT = "#111827";
const SUB = "#6B7280";
const CARD = "#FFFFFF";
const BORDER = "#E5E7EB";

/* Drawer config */
const { width: W } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(W * 0.78, 320);

const FALLBACK_CENTER = { latitude: 6.9, longitude: 79.861 }; // Thummulla approx
const INITIAL_DELTA = { latitudeDelta: 0.02, longitudeDelta: 0.02 };
const RADIUS_METERS = 2000; // 2 km

// Infer instance type of <Marker /> so refs support showCallout/hideCallout
type MarkerRef = React.ComponentRef<typeof Marker>;

// ---- Navigation types (extend for the new routes) ----
type RootStackParamList = {
  Driver_Home: undefined;
  ShowLocations: { spaces?: NearbySpace[] } | undefined;
  Login_Driver: undefined;
  ChooseRole: undefined;
  About?: undefined;
  Contact_Us?: undefined;
  Payment_Info?: undefined;
};
type Nav = NativeStackNavigationProp<RootStackParamList, "Driver_Home">;

/* Helpers */
function formatKm(km?: number) {
  if (km == null || isNaN(km)) return "-";
  const digits = km < 10 ? 2 : 1;
  return `${km.toFixed(digits)} km`;
}
function firstName(name?: string) {
  if (!name) return "";
  const n = String(name).trim();
  const sp = n.indexOf(" ");
  return sp > 0 ? n.slice(0, sp) : n;
}
function pad3(v: unknown) {
  const n = Number(v);
  if (!isFinite(n) || n <= 0) return null;
  return String(Math.floor(n)).padStart(3, "0");
}

export default function Driver_Home() {
  const navigation = useNavigation<Nav>();
  const mapRef = useRef<MapView | null>(null);
  const markerRefs = useRef<Record<string, MarkerRef | null>>({});

  const [center, setCenter] = useState(FALLBACK_CENTER);
  const [region, setRegion] = useState<Region>({ ...FALLBACK_CENTER, ...INITIAL_DELTA });
  const [spaces, setSpaces] = useState<NearbySpace[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  // Driver info
  const [driverName, setDriverName] = useState<string>("");
  const [driverId, setDriverId] = useState<string | null>(null);

  // Drawer state
  const [drawerVisible, setDrawerVisible] = useState(false);
  const drawerX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

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

  // Load greeting + driver ID on focus
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

            const idCand =
              obj?.id ??
              obj?.driver?.id ??
              obj?.driver_id ??
              obj?.pin ??
              obj?.driver?.pin ??
              obj?.userId;
            const formatted = pad3(idCand);
            setDriverId(formatted);
          } else {
            setDriverName("");
            setDriverId(null);
          }
        } catch {
          setDriverName("");
          setDriverId(null);
        }
      })();
      return () => {
        mounted = false;
      };
    }, [])
  );

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
    navigation.navigate("ShowLocations", { spaces: sortedSpaces });
  }, [navigation, sortedSpaces]);

  /* Drawer handlers */
  const defer = useCallback((fn: () => void) => {
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(fn);
    });
  }, []);

  const openDrawer = useCallback(() => {
    setDrawerVisible(true);
    Animated.timing(drawerX, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [drawerX]);

  const closeDrawer = useCallback(
    (after?: () => void) => {
      Animated.timing(drawerX, {
        toValue: -DRAWER_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        setDrawerVisible(false);
        if (after) defer(after);
      });
    },
    [drawerX, defer]
  );

  // Android back closes drawer first
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (drawerVisible) {
        closeDrawer();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [drawerVisible, closeDrawer]);

  /* Nav item actions */
  const goHome = useCallback(() => {
    closeDrawer(() => navigation.navigate("Driver_Home"));
  }, [closeDrawer, navigation]);

  const goAbout = useCallback(() => {
    closeDrawer(() => Alert.alert("About", "About screen is not connected yet."));
  }, [closeDrawer]);

  const goContact = useCallback(() => {
    closeDrawer(() =>
      Alert.alert(
        "Contact Us",
        "Contact screen is not connected yet.\n\nEmail: support@parkmate.local\nPhone: +94 11 123 4567"
      )
    );
  }, [closeDrawer]);

  const goPaymentInfo = useCallback(() => {
    closeDrawer(() => Alert.alert("Payment Info", "Payment Info screen is not connected yet."));
  }, [closeDrawer]);

  const onChangeRole = useCallback(() => {
    closeDrawer(() => navigation.navigate("ChooseRole"));
  }, [closeDrawer, navigation]);

  const onLogoutPress = useCallback(() => {
    const doLogout = async () => {
      try {
        await AsyncStorage.removeItem("pm_driver");
      } catch {}
      navigation.reset({ index: 0, routes: [{ name: "Login_Driver" }] });
    };
    closeDrawer(() =>
      Alert.alert(
        "Log out",
        "Are you sure you want to log out?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Log out", style: "destructive", onPress: () => defer(doLogout) },
        ],
        { cancelable: true }
      )
    );
  }, [navigation, closeDrawer, defer]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Beautiful Header */}
      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} onPress={openDrawer} accessibilityLabel="Open menu">
          <Ionicons name="menu-outline" size={22} color={TEXT} />
        </Pressable>

        <View style={styles.titleWrap}>
          <Text style={styles.headerTitle}>Nearby Parking (2 km)</Text>

          <View style={styles.statusChip}>
            <View
              style={[
                styles.dot,
                { backgroundColor: hasPermission ? "#22C55E" : "#F59E0B" },
              ]}
            />
            <Text style={styles.statusChipText}>
              {hasPermission ? "Live location enabled" : "Using fallback location"}
            </Text>
          </View>
        </View>

        <View style={styles.rightRow}>
          <View style={styles.idPill}>
            <Text style={styles.idPillText}>{driverId ?? "--"}</Text>
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

            {/* Map Legend */}
            <View style={styles.legend}>
              <Text style={styles.legendTitle}>Legend</Text>
              <View style={styles.legendRow}>
                <Ionicons name="location-sharp" size={20} color="#2563EB" />
                <Text style={styles.legendLabel}>Live location</Text>
              </View>
              <View style={styles.legendRow}>
                <Ionicons name="location-sharp" size={20} color="#EF4444" />
                <Text style={styles.legendLabel}>Parking spaces</Text>
              </View>
            </View>

            {/* Floating recenter button (raised to clear bottom button) */}
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

      {/* ---------- Drawer Overlay + Panel ---------- */}
      {drawerVisible && <Pressable style={styles.backdrop} onPress={() => closeDrawer()} />}

      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateX: drawerX }],
          },
        ]}
      >
        <View style={styles.drawerContainer}>
          {/* Header card */}
          <View style={styles.drawerHeaderCard}>
            <View style={styles.drawerHeaderRow}>
              <View style={styles.drawerAvatar}>
                <Image
                  source={{
                    uri: "https://images.unsplash.com/photo-1541534401786-2077eed87a72?q=80&w=300&auto=format&fit=crop",
                  }}
                  style={{ width: "100%", height: "100%" }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.drawerHello}>Welcome,</Text>
                <Text style={styles.drawerName} numberOfLines={1}>
                  {driverName ? firstName(driverName) : "Driver"}
                </Text>
              </View>
              <View style={styles.drawerIdPill}>
                <Text style={styles.drawerIdText}>{driverId ?? "--"}</Text>
              </View>
            </View>
          </View>

          {/* Main links (scrollable) */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.drawerScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <DrawerItemCard
              icon="home-outline"
              label="Home"
              onPress={goHome}
            />
            <DrawerItemCard
              icon="information-circle-outline"
              label="About"
              onPress={goAbout}
            />
            <DrawerItemCard
              icon="call-outline"
              label="Contact Us"
              onPress={goContact}
            />
            <DrawerItemCard
              icon="card-outline"
              label="Payment Info"
              onPress={goPaymentInfo}
            />
          </ScrollView>

          {/* Bottom actions */}
          <View style={styles.drawerBottom}>
            <DrawerItemCard
              icon="swap-horizontal-outline"
              label="Change Role"
              onPress={onChangeRole}
            />
            <DrawerItemCard
              icon="log-out-outline"
              label="Log out"
              danger
              onPress={onLogoutPress}
            />
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

/* Drawer Item (Card) component */
function DrawerItemCard({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.drawerCard,
        pressed && { transform: [{ scale: 0.99 }], opacity: 0.95 },
      ]}
    >
      <View style={styles.drawerCardRow}>
        <View style={[styles.drawerIconWrap, danger && { backgroundColor: "rgba(239,68,68,0.08)" }]}>
          <Ionicons name={icon} size={18} color={danger ? "#EF4444" : BRAND} />
        </View>
        <Text style={[styles.drawerItemLabel, danger && { color: "#EF4444" }]}>{label}</Text>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={danger ? "#EF4444" : SUB}
          style={{ marginLeft: "auto" }}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: BG },

  /* Beautiful Top Bar */
  topBar: {
    backgroundColor: CARD,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  iconBtn: {
    height: 40,
    width: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  titleWrap: { flex: 1 },
  headerTitle: { color: TEXT, fontSize: 20, fontWeight: "900", letterSpacing: 0.2 },
  statusChip: {
    marginTop: 6,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F9FAFB",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statusChipText: { color: SUB, fontSize: 12, fontWeight: "700" },
  dot: { height: 8, width: 8, borderRadius: 4 },

  rightRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  idPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  idPillText: { color: TEXT, fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  avatarWrap: { height: 36, width: 36, borderRadius: 18, overflow: "hidden" },
  avatar: { height: "100%", width: "100%" },

  mapWrap: { flex: 1, backgroundColor: "#E5E7EB" },

  /* Map Legend */
  legend: {
    position: 'absolute',
    left: 12,
    top: 12,
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  legendTitle: { color: SUB, fontSize: 11, fontWeight: "800", marginBottom: 6 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  legendLabel: { color: TEXT, fontSize: 12, fontWeight: "700" },

  /* Floating Action Button */
  fab: {
    position: "absolute",
    right: 16,
    bottom: 88, // lifted to clear bottom button
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
  calloutContainer: { alignItems: "center" },
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
  calloutHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
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
  calloutRow: { flexDirection: "row", gap: 6, alignItems: "flex-start", marginBottom: 6 },
  calloutSub: { flex: 1, color: SUB, fontSize: 13, lineHeight: 18 },
  calloutFooterRow: { marginTop: 2, flexDirection: "row", justifyContent: "flex-end" },
  calloutHint: { color: SUB, fontSize: 11, fontWeight: "600" },
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

  /* Drawer (card-style) */
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.28)" },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: BG,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  drawerContainer: { flex: 1, padding: 12, paddingTop: 16 },
  drawerHeaderCard: {
    marginTop:100,
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    marginBottom: 12,
  },
  drawerHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  drawerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  drawerHello: { color: SUB, fontSize: 12, fontWeight: "700" },
  drawerName: { color: TEXT, fontSize: 18, fontWeight: "900" },
  drawerIdPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  drawerIdText: { color: TEXT, fontWeight: "900", fontSize: 12, letterSpacing: 1 },

  drawerScrollContent: { paddingBottom: 12, gap: 12 },

  drawerCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  drawerCardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  drawerIconWrap: {
    height: 32,
    width: 32,
    borderRadius: 10,
    backgroundColor: "rgba(47,128,237,0.10)", // BRAND tint
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  drawerItemLabel: { fontSize: 14, color: TEXT, fontWeight: "800" },

  drawerBottom: {
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 16 : 12,
    gap: 10,
  },
});
