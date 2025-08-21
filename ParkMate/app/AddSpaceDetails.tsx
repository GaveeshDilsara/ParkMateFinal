// app/AddSpaceDetails.tsx — save to DB (multipart) + per-category pricing + GPS OR Search OR Map-pick
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert, Image, KeyboardAvoidingView,
  Linking,
  Modal, Platform, Pressable,
  SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, Region } from "react-native-maps";
import { createParkingSpaceMultipart } from "./api";

/* ---------- Types ---------- */
type DayKey =
  | "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
type DayState = { enabled: boolean; slots: string[] };
type DayMap = Record<DayKey, DayState>;

type RootStackParamList = {
  AfterSubmitting: undefined;
  AddSpaceDetails: undefined;
  SetTimeSlots:
    | { onSave?: (summary: string, detail: DayMap) => void; initial?: DayMap }
    | undefined;
};
type Nav = NativeStackNavigationProp<RootStackParamList>;
type CategoryKey = "Cars" | "Vans" | "Bikes" | "Buses";
type CategoryCounts = Record<CategoryKey, number>;
type PriceUnit = "hour" | "day";

const DAY_ORDER: DayKey[] = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const SHORT: Record<DayKey, string> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed",
  Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
};
const to12h = (t: string) => {
  if (!t) return "--:--";
  const [h, m] = t.split(":").map(Number);
  const am = h < 12;
  const hr = ((h + 11) % 12) + 1;
  return `${hr}:${String(m).padStart(2, "0")} ${am ? "AM" : "PM"}`;
};

const COLORS = {
  bg: "#F6F7FB",
  card: "#FFFFFF",
  text: "#0F172A",
  sub: "#6B7280",
  brand: "#2F80ED",
  brand2: "#1E6AE6",
  shadow: "#000000",
  link: "#1D4ED8",
  grayLight: "#EEF1F6",
  grayMid: "#E5E7EB",
};

type PickedPdf = { uri: string; name: string; mime?: string; size?: number };
type PickedImg = { id: number; uri: string; name: string; mime?: string };
const MAX_IMAGES = 6;

/* ---- Pricing ---- */
const PRICE_STEP = 50;
const QUICK_PRICES = [100, 200, 300, 500, 1000, 1500];

/* ---- Map defaults ---- */
const FALLBACK = { latitude: 6.927079, longitude: 79.861244 }; // Colombo
const INITIAL_DELTA = { latitudeDelta: 0.01, longitudeDelta: 0.01 };

export default function AddSpaceDetails() {
  const navigation = useNavigation<Nav>();

  // owner
  const [ownerId, setOwnerId] = useState<number | null>(null);

  // form state
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");       // user-typed address (for search)
  const [location, setLocation] = useState("");     // pretty, verified address

  // verification + map
  const [verifying, setVerifying] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  // Map picker state
  const mapRef = useRef<MapView | null>(null);
  const [mapQuery, setMapQuery] = useState("");
  const [tempCoords, setTempCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // ⏰ Time selection
  const [timeSummary, setTimeSummary] = useState<string>("");
  const [timeDetail, setTimeDetail] = useState<DayMap | undefined>(undefined);

  // Pricing (per category)
  const [priceUnit, setPriceUnit] = useState<PriceUnit>("hour");
  const [prices, setPrices] = useState<Record<CategoryKey, number>>({
    Cars: 0, Vans: 0, Bikes: 0, Buses: 0,
  });

  const setPrice = React.useCallback((key: CategoryKey, val: number) => {
  setPrices(prev => ({
    ...prev,
    [key]: Math.max(0, Math.floor(val)),
  }));
}, []);

  // Desc + terms
  const [desc, setDesc] = useState("");
  const [agreed, setAgreed] = useState(false);

  // category counts
  const [categoryCounts, setCategoryCounts] = useState<CategoryCounts>({
    Cars: 0, Vans: 0, Bikes: 0, Buses: 0,
  });
  const hasAnyCategory = Object.values(categoryCounts).some((v) => v > 0);

  const selectedKeys = (Object.keys(categoryCounts) as CategoryKey[]).filter((k) => categoryCounts[k] > 0);
  const hasPricesForSelected = selectedKeys.length > 0 && selectedKeys.every((k) => (prices[k] ?? 0) > 0);
  const anyPrice = Object.values(prices).some((p) => p > 0);

  const canSubmit = useMemo(
    () => !!(name && location && coords && hasAnyCategory && hasPricesForSelected && agreed),
    [name, location, coords, hasAnyCategory, hasPricesForSelected, agreed]
  );

  /* ---------- Files ---------- */
  const [pdf, setPdf] = useState<PickedPdf | null>(null);
  const [images, setImages] = useState<PickedImg[]>([]);

  const pickPdf = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const f = res.assets?.[0];
      if (!f) return;
      setPdf({
        uri: f.uri,
        name: f.name ?? "agreement.pdf",
        mime: f.mimeType ?? "application/pdf",
        size: f.size,
      });
    } catch {
      Alert.alert("Error", "Could not pick PDF.");
    }
  };
  const clearPdf = () => setPdf(null);

  const pickImage = async () => {
    try {
      if (images.length >= MAX_IMAGES) {
        Alert.alert("Limit reached", `You can upload up to ${MAX_IMAGES} images.`);
        return;
      }
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Please allow photo library access.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (res.canceled) return;
      const a = res.assets?.[0];
      if (!a) return;
      const name = a.fileName || `img_${Date.now()}.jpg`;
      const mime = a.mimeType || "image/jpeg";
      setImages((prev) => [...prev, { id: Date.now(), uri: a.uri, name, mime }].slice(0, MAX_IMAGES));
    } catch {
      Alert.alert("Error", "Could not pick image.");
    }
  };
  const removeImg = (id: number) => setImages((prev) => prev.filter((i) => i.id !== id));

  /* ---------- Location helpers ---------- */
  async function prettyFromCoords(lat: number, lng: number): Promise<string> {
    try {
      const rev = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (rev && rev[0]) {
        const r = rev[0];
        return [r.name, r.street, r.district || r.subregion || r.city, r.region, r.postalCode, r.country]
          .filter(Boolean).join(", ");
      }
    } catch {}
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  const useMyGPS = async () => {
    try {
      setVerifying(true);

      let perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        perm = await Location.requestForegroundPermissionsAsync();
      }
      if (perm.status !== "granted") {
        Alert.alert("Location permission needed", "Please allow location access.", [
          { text: "Open Settings", onPress: () => Linking.openSettings?.() }, { text: "OK" }
        ]);
        return;
      }

      const servicesOn = await Location.hasServicesEnabledAsync();
      if (!servicesOn) {
        Alert.alert("Turn on Location", "Location services seem to be off.", [
          { text: "Open Settings", onPress: () => Linking.openSettings?.() }, { text: "OK" }
        ]);
        return;
      }

      const last = await Location.getLastKnownPositionAsync();
      const pos = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }));
      const { latitude, longitude } = pos.coords;

      setCoords({ latitude, longitude });
      const pretty = await prettyFromCoords(latitude, longitude);
      setLocation(pretty);
      setAddress(pretty);
      Alert.alert("Verified", "Using your current GPS location.");
    } catch {
      Alert.alert("Verification failed", "Please check your connection and try again.");
    } finally {
      setVerifying(false);
    }
  };

  const searchByAddress = async () => {
    if (!address.trim()) {
      Alert.alert("Type an address", "Example: 'Galle Fort, Galle'");
      return;
    }
    try {
      setVerifying(true);
      // Geocode typed address → coordinates
      const hits = await Location.geocodeAsync(address.trim());
      if (!hits || hits.length === 0) {
        Alert.alert("Not found", "Couldn't find that address. Try a nearby landmark.");
        return;
      }
      const { latitude, longitude } = hits[0];
      setCoords({ latitude, longitude });
      const pretty = await prettyFromCoords(latitude, longitude);
      setLocation(pretty);
      // Center map picker on this place (optional)
      setTempCoords({ latitude, longitude });
      setMapOpen(true);
    } catch {
      Alert.alert("Search failed", "Try a simpler address (e.g., 'Galle Fort').");
    } finally {
      setVerifying(false);
    }
  };

  const openMapPicker = () => {
    // seed with current coords or fallback
    setTempCoords(coords ?? FALLBACK);
    setMapQuery("");
    setMapOpen(true);
  };

  /* ---------- Submit ---------- */
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    if (!ownerId) {
      Alert.alert("Error", "Owner not found. Please log in again.");
      return;
    }
    if (!coords) {
      Alert.alert("Location needed", "Please set the space location (GPS / Search / Map).");
      return;
    }

    try {
      setSubmitting(true);

      // Build FormData
      const form = new FormData();
      form.append("owner_id", String(ownerId));
      form.append("parking_name", name);
      form.append("location", location);
      form.append("availability", timeSummary || "");
      form.append("description", desc || "");
      form.append("price_unit", priceUnit);

      // ✅ send latitude/longitude
      form.append("latitude", String(coords.latitude));
      form.append("longitude", String(coords.longitude));

      // pricing
      form.append("price_cars", String(prices.Cars || 0));
      form.append("price_vans", String(prices.Vans || 0));
      form.append("price_bikes", String(prices.Bikes || 0));
      form.append("price_buses", String(prices.Buses || 0));

      // spaces (counts)
      form.append("spaces_cars", String(categoryCounts.Cars || 0));
      form.append("spaces_vans", String(categoryCounts.Vans || 0));
      form.append("spaces_bikes", String(categoryCounts.Bikes || 0));
      form.append("spaces_buses", String(categoryCounts.Buses || 0));

      // files
      if (pdf?.uri) {
        form.append("agreement", {
          uri: pdf.uri,
          name: pdf.name || `agreement_${Date.now()}.pdf`,
          type: pdf.mime || "application/pdf",
        } as any);
      }
      images.forEach((img, idx) => {
        form.append("photos[]", {
          uri: img.uri,
          name: img.name || `photo_${idx+1}.jpg`,
          type: img.mime || "image/jpeg",
        } as any);
      });

      const res = await createParkingSpaceMultipart(form);
      Alert.alert("Success", "Space submitted for approval.", [
        { text: "OK", onPress: () => navigation.navigate("AfterSubmitting") }
      ]);
      console.log("Created:", res);
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Server error");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Load saved availability + owner ---------- */
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const [raw, sum, ownerRaw] = await Promise.all([
            AsyncStorage.getItem("pm_timeSlots"),
            AsyncStorage.getItem("pm_timeSummary"),
            AsyncStorage.getItem("pm_owner"),
          ]);

          if (!mounted) return;

          if (sum) setTimeSummary(sum);

          if (ownerRaw) {
            const owner = JSON.parse(ownerRaw);
            setOwnerId(owner?.id ?? null);
          }

          if (raw) {
            type DaySlot = { day: string; enabled: boolean; startTime: string; endTime: string };
            const parsed = JSON.parse(raw) as DaySlot[];
            if (Array.isArray(parsed) && parsed.length === 7) {
              const map: Partial<DayMap> = {};
              (parsed).forEach((r) => {
                const key = r.day as DayKey;
                const slot = r.enabled && r.startTime && r.endTime ? [`${r.startTime}-${r.endTime}`] : [];
                map[key] = { enabled: !!r.enabled, slots: slot };
              });
              (["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"] as DayKey[])
                .forEach(k => { if (!map[k]) map[k] = { enabled: false, slots: [] }; });
              setTimeDetail(map as DayMap);
            }
          }
        } catch {}
      })();
      return () => { mounted = false; };
    }, [])
  );

  /* ---------- Derived ---------- */
  const mapRegion: Region = coords
    ? { latitude: coords.latitude, longitude: coords.longitude, ...INITIAL_DELTA }
    : { ...FALLBACK, ...INITIAL_DELTA };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={[COLORS.brand, COLORS.brand2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.appbar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.appbarBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.appbarTitle}>Parking Space Details</Text>
        <View style={styles.appbarBtn} />
      </LinearGradient>

      <View style={[styles.heroCard, styles.shadow]}>
        <Ionicons name="business-outline" size={18} color={COLORS.brand} />
        <Text style={styles.heroText}>Tell us about your space</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, paddingTop: 8 }}>
          
          {/* ===== Basic Info ===== */}
          <Section title="Basic info" icon="information-circle-outline">
            {/* Owner ID badge */}
            <View style={styles.ownerRow}>
              <View style={styles.ownerBadge}>
                <Ionicons name="person-outline" size={14} color={COLORS.brand} />
                <Text style={styles.ownerText}>
                  Owner ID:&nbsp;
                  <Text style={{ fontWeight: "900", color: COLORS.text }}>
                    {ownerId ?? "Unknown"}
                  </Text>
                </Text>
              </View>
            </View>

            {/* Space name */}
            <IconField icon="pricetag-outline" placeholder="Parking Space Name" value={name} onChangeText={setName} />

            {/* Address input (for search) */}
            <View style={{ marginTop: 12 }}>
              <View style={[styles.pill, { paddingRight: 12 }]}>
                <Ionicons name="location-outline" size={18} color={COLORS.sub} style={{ marginRight: 8, marginLeft: 2 }} />
                <TextInput
                  placeholder="Type address or landmark (e.g., 'Galle Fort, Galle')"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                  value={address}
                  onChangeText={setAddress}
                  autoCapitalize="none"
                />
              </View>

              {/* Action row: GPS • Search • Map Pick */}
              <View style={styles.actionRow3}>
                <Pressable onPress={useMyGPS} style={[styles.actionPill, { backgroundColor: COLORS.link }]} disabled={verifying}>
                  <Ionicons name="navigate-outline" size={14} color="#fff" />
                  <Text style={styles.actionPillText}>{verifying ? "Verifying..." : "Use My GPS"}</Text>
                </Pressable>

                <Pressable onPress={searchByAddress} style={styles.actionPill} disabled={verifying}>
                  <Ionicons name="search-outline" size={14} color="#fff" />
                  <Text style={styles.actionPillText}>Search Address</Text>
                </Pressable>

                <Pressable onPress={openMapPicker} style={styles.actionPill}>
                  <Ionicons name="map-outline" size={14} color="#fff" />
                  <Text style={styles.actionPillText}>Pick on Map</Text>
                </Pressable>
              </View>

              {!!location && (
                <Text style={styles.verifiedNote}>Verified ✓ {location}</Text>
              )}
            </View>
          </Section>

          {/* ===== Availability ===== */}
          <Section title="Availability" icon="calendar-outline" style={{ marginTop: 14 }}>
            <View style={[styles.pill, { paddingRight: 44 }]}>
              <TextInput placeholder="Available Time Slots" placeholderTextColor="#9CA3AF" style={styles.input} editable={false} />
              <Pressable onPress={() => router.push("/SetTimeSlots")} style={styles.trailingIcon} hitSlop={8}>
                <MaterialCommunityIcons name="pencil-outline" size={20} color={COLORS.sub} />
              </Pressable>
            </View>

            {timeDetail && (
              <View style={styles.chipsWrap}>
                {DAY_ORDER.flatMap((day) => {
                  const st = timeDetail[day];
                  if (!st || !st.enabled || st.slots.length === 0) return [];
                  return st.slots.map((slot, j) => {
                    const [start, end] = slot.split("-");
                    return <Chip key={`${day}-${j}`} text={`${SHORT[day]} ${to12h(start)} — ${to12h(end)}`} />;
                  });
                })}
              </View>
            )}
          </Section>

          {/* ===== Pricing ===== */}
          <Section title="Pricing" icon="cash-outline" style={{ marginTop: 14 }}>
            <Text style={[styles.hint, { marginBottom: 8 }]}>
              Set prices for each vehicle type. Applies <Text style={{ fontWeight: "900" }}>{priceUnit === "hour" ? "per hour" : "per day"}</Text>.
            </Text>

            {(Object.keys(prices) as CategoryKey[]).map((key) => (
              <View key={key} style={styles.priceRow}>
                <View style={styles.priceRowHead}>
                  <Text style={styles.priceRowTitle}>
                    {key}{categoryCounts[key] > 0 ? ` • ${categoryCounts[key]} slots` : ""}
                  </Text>
                  <Text style={styles.priceRowValue}>LKR {prices[key].toLocaleString()}</Text>
                </View>

                <View style={styles.priceControls}>
                  <Pressable onPress={() => setPrice(key, Math.max(0, (prices[key] ?? 0) - PRICE_STEP))} style={styles.stepperBtn} hitSlop={6}>
                    <Ionicons name="remove" size={20} color="#fff" />
                  </Pressable>
                  <Pressable onPress={() => setPrice(key, (prices[key] ?? 0) + PRICE_STEP)} style={styles.stepperBtn} hitSlop={6}>
                    <Ionicons name="add" size={20} color="#fff" />
                  </Pressable>
                </View>

                <View style={styles.quickRow}>
                  {QUICK_PRICES.map((p) => (
                    <Pressable
                      key={p}
                      onPress={() => setPrice(key, p)}
                      style={[styles.quickChip, prices[key] === p && styles.quickChipActive]}
                    >
                      <Text style={[styles.quickChipText, prices[key] === p && { color: "#fff" }]}>
                        {p.toLocaleString()}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}

            <View style={styles.unitGroup}>
              {(["hour", "day"] as PriceUnit[]).map((u) => {
                const active = priceUnit === u;
                return (
                  <Pressable key={u} onPress={() => setPriceUnit(u)} style={[styles.unitPill, active && styles.unitPillActive]}>
                    <Text style={[styles.unitText, active && styles.unitTextActive]}>
                      {u === "hour" ? "Per Hour" : "Per Day"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {!hasPricesForSelected && hasAnyCategory && (
              <Text style={[styles.hint, { marginTop: 8, color: "#b91c1c" }]}>
                Set a price for each selected vehicle type.
              </Text>
            )}
            {!hasAnyCategory && (
              <Text style={styles.hint}>Pick at least one vehicle type below and set its price.</Text>
            )}
          </Section>

          {/* ===== Categories ===== */}
          <Section title="Vehicle categories" icon="car-outline" style={{ marginTop: 14 }}>
            <View style={styles.prettyGrid}>
              {(["Cars", "Vans", "Bikes", "Buses"] as CategoryKey[]).map((key) => {
                const count = categoryCounts[key];
                const active = count > 0;
                const iconName =
                  key === "Cars" ? "car-outline" :
                  key === "Vans" ? "car-sport-outline" :
                  key === "Bikes" ? "bicycle-outline" : "bus-outline";
                return (
                  <LinearGradient
                    key={key}
                    colors={active ? [COLORS.brand, COLORS.brand2] : ["#EFF2F7", "#EFF2F7"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={[styles.vehicleCard, styles.shadow, active && { elevation: 4 }]}
                  >
                    <View style={styles.vehicleHead}>
                      <Ionicons name={iconName as any} size={22} color={active ? "#fff" : COLORS.link} />
                      <Text style={[styles.vehicleTitle, active && { color: "#fff" }]}>{key}</Text>
                    </View>

                    <View style={styles.counterWrap}>
                      <Pressable onPress={() => setCategoryCounts((prev)=>({...prev,[key]: Math.max(0, prev[key]-1)}))} style={[styles.stepBtn, active && styles.stepBtnActive]} hitSlop={6}>
                        <Ionicons name="remove" size={18} color={active ? "#fff" : COLORS.text} />
                      </Pressable>

                      <View style={styles.countBadge}><Text style={styles.countText}>{count}</Text></View>

                      <Pressable onPress={() => setCategoryCounts((prev)=>({...prev,[key]: prev[key]+1}))} style={[styles.stepBtn, active && styles.stepBtnActive]} hitSlop={6}>
                        <Ionicons name="add" size={18} color={active ? "#fff" : COLORS.text} />
                      </Pressable>
                    </View>
                  </LinearGradient>
                );
              })}
            </View>

            {hasAnyCategory ? (
              <View style={[styles.chipsWrap, { marginTop: 10 }]}>
                {(Object.keys(categoryCounts) as CategoryKey[])
                  .filter((k) => categoryCounts[k] > 0)
                  .map((k) => <Chip key={k} text={`${k}: ${categoryCounts[k]} • LKR ${prices[k].toLocaleString()} / ${priceUnit}`} />)}
              </View>
            ) : (
              <Text style={styles.hint}>Pick at least one vehicle type and set how many slots you have.</Text>
            )}
          </Section>

          {/* ===== Description ===== */}
          <Section title="Description" icon="list-outline" style={{ marginTop: 14 }}>
            <View style={[styles.pill, { height: 110, alignItems: "flex-start" }]}>
              <TextInput
                placeholder="Describe special notes, entry instructions, CCTV, security, etc."
                placeholderTextColor="#9CA3AF"
                style={[styles.input, { height: "100%" }]}
                value={desc}
                onChangeText={setDesc}
                multiline
              />
            </View>
          </Section>

          {/* ===== Legal & Terms ===== */}
          <Section title="Legal & terms" icon="document-text-outline" style={{ marginTop: 14 }}>
            <View style={styles.legalHeader}>
              <View style={styles.legalBadge}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#fff" />
                <Text style={styles.legalBadgeText}>Required</Text>
              </View>
              <Text style={styles.legalHeaderText}>Attach your agreement and photos to speed up approval.</Text>
            </View>

            {/* Agreement (PDF) */}
            <View style={[styles.uploadCard, styles.shadow]}>
              <View style={styles.cardHeadRow}>
                <View style={styles.cardHeadLeft}>
                  <Ionicons name="document-text-outline" size={18} color={COLORS.brand} />
                  <Text style={styles.cardTitle}>Agreement (PDF)</Text>
                </View>
                {pdf ? (
                  <View style={[styles.statusPill, { backgroundColor: "#E7F5FF" }]}>
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.brand} />
                    <Text style={[styles.statusPillText, { color: COLORS.brand }]}>Attached</Text>
                  </View>
                ) : (
                  <View style={[styles.statusPill, { backgroundColor: "#FEF3C7" }]}>
                    <Ionicons name="alert-circle-outline" size={14} color="#92400E" />
                    <Text style={[styles.statusPillText, { color: "#92400E" }]}>Missing</Text>
                  </View>
                )}
              </View>

              {!pdf ? (
                <Pressable onPress={pickPdf} style={[styles.dashedTile]} hitSlop={6}>
                  <Ionicons name="cloud-upload-outline" size={20} color={COLORS.brand} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dashedTitle}>Attach PDF agreement</Text>
                    <Text style={styles.dashedSub}>PDF only • up to 10 MB</Text>
                  </View>
                  <View style={styles.primaryPill}>
                    <Text style={styles.primaryPillText}>Select</Text>
                  </View>
                </Pressable>
              ) : (
                <View style={styles.pdfRow}>
                  <View style={styles.pdfLeft}>
                    <View style={styles.pdfIconStripe}>
                      <Ionicons name="document-attach-outline" size={18} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={styles.pdfName}>{pdf.name}</Text>
                      <Text style={styles.pdfMeta}>{pdf.size ? `${(pdf.size/1024/1024).toFixed(1)} MB` : ""}</Text>
                    </View>
                  </View>
                  <View style={styles.actionRow}>
                    <Pressable onPress={clearPdf} style={styles.destructiveBtn} hitSlop={6}>
                      <Ionicons name="trash-outline" size={14} color="#fff" />
                      <Text style={styles.destructiveBtnText}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>

            {/* Photos (up to 6) */}
            <View style={[styles.uploadCard, styles.shadow, { marginTop: 12 }]}>
              <View style={styles.cardHeadRow}>
                <View style={styles.cardHeadLeft}>
                  <Ionicons name="images-outline" size={18} color={COLORS.brand} />
                  <Text style={styles.cardTitle}>Photos</Text>
                </View>
                <Text style={styles.counterText}>{images.length}/{MAX_IMAGES}</Text>
              </View>

              <View style={styles.galleryGrid}>
                <Pressable onPress={pickImage} style={[styles.addTile, images.length >= MAX_IMAGES && { opacity: 0.45 }]} disabled={images.length >= MAX_IMAGES}>
                  <Ionicons name="add" size={20} color={COLORS.brand} />
                  <Text style={styles.addTileText}>Add photo</Text>
                  <Text style={styles.addTileHint}>JPG / PNG</Text>
                </Pressable>

                {images.map((img) => (
                  <View key={img.id} style={[styles.thumbWrap, styles.shadow]}>
                    <Image source={{ uri: img.uri }} style={styles.thumb} />
                    <Pressable onPress={() => removeImg(img.id)} style={styles.removeBadge} hitSlop={6}>
                      <Ionicons name="close" size={14} color="#fff" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>

            {/* Terms */}
            <Pressable onPress={() => setAgreed(v => !v)} style={[styles.agreePill, agreed && styles.agreePillOn]} hitSlop={6}>
              <Ionicons name={agreed ? "checkbox" : "square-outline"} size={18} color={agreed ? "#fff" : COLORS.brand} />
              <Text style={[styles.agreeText, agreed && { color: "#fff" }]}>
                I agree to the platform’s <Text style={[styles.link, agreed && { color: "#fff", textDecorationLine: "underline" }]} onPress={() => {}}>Terms & Conditions</Text>.
              </Text>
            </Pressable>
          </Section>

          {/* ===== Submit ===== */}
          <LinearGradient colors={canSubmit ? [COLORS.brand, COLORS.brand2] : [COLORS.grayMid, COLORS.grayMid]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.submitBtn, styles.shadow, { marginTop: 18 }]}>
            <Pressable onPress={handleSubmit} disabled={!canSubmit || submitting}
              style={({ pressed }) => [styles.submitPressable, pressed && canSubmit && { transform: [{ scale: 0.997 }] }]}>
              <Ionicons name="paper-plane-outline" size={18} color="#fff" />
              <Text style={styles.submitText}>
                {submitting ? "Saving..." : `Submit for Approval${anyPrice ? ` — ${priceUnit === "hour" ? "Hourly" : "Daily"} pricing set` : ""}`}
              </Text>
            </Pressable>
          </LinearGradient>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ===== Map Picker ===== */}
      <Modal visible={mapOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setMapOpen(false)}>
        <View style={styles.mapFull}>
          <View style={styles.mapHeader}>
            <Pressable onPress={() => setMapOpen(false)} hitSlop={8} style={styles.headerBtn}>
              <Ionicons name="close" size={22} color="#0F172A" />
            </Pressable>
            <Text style={styles.mapTitle}>Pick Space Location</Text>
            <View style={styles.headerBtn} />
          </View>

          {/* Search inside map */}
          <View style={styles.mapSearchBar}>
            <Ionicons name="search-outline" size={16} color="#6B7280" />
            <TextInput
              style={styles.mapSearchInput}
              placeholder="Search inside map (e.g., 'Galle Fort')"
              placeholderTextColor="#9CA3AF"
              value={mapQuery}
              onChangeText={setMapQuery}
              autoCapitalize="none"
              onSubmitEditing={async () => {
                if (!mapQuery.trim()) return;
                try {
                  const hits = await Location.geocodeAsync(mapQuery.trim());
                  if (hits && hits[0]) {
                    const { latitude, longitude } = hits[0];
                    const next = { latitude, longitude };
                    setTempCoords(next);
                    mapRef.current?.animateToRegion({ ...next, ...INITIAL_DELTA }, 350);
                  } else {
                    Alert.alert("Not found", "Try a nearby landmark.");
                  }
                } catch {
                  Alert.alert("Search failed", "Please try again.");
                }
              }}
              returnKeyType="search"
            />
            <Pressable
              onPress={async () => {
                if (!mapQuery.trim()) return;
                try {
                  const hits = await Location.geocodeAsync(mapQuery.trim());
                  if (hits && hits[0]) {
                    const { latitude, longitude } = hits[0];
                    const next = { latitude, longitude };
                    setTempCoords(next);
                    mapRef.current?.animateToRegion({ ...next, ...INITIAL_DELTA }, 350);
                  } else {
                    Alert.alert("Not found", "Try a nearby landmark.");
                  }
                } catch {
                  Alert.alert("Search failed", "Please try again.");
                }
              }}
              style={styles.mapSearchBtn}
            >
              <Text style={styles.mapSearchBtnText}>Find</Text>
            </Pressable>
          </View>

          <View style={styles.mapBody}>
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              provider={PROVIDER_DEFAULT}
              initialRegion={coords ? { ...coords, ...INITIAL_DELTA } : { ...FALLBACK, ...INITIAL_DELTA }}
              onLongPress={(e) => setTempCoords(e.nativeEvent.coordinate)}
            >
              {tempCoords && (
                <Marker
                  coordinate={tempCoords}
                  title="Space location"
                  draggable
                  onDragEnd={(e) => setTempCoords(e.nativeEvent.coordinate)}
                />
              )}
            </MapView>
          </View>

          <View style={styles.mapFooter}>
            <Pressable
              onPress={useMyGPS}
              style={[styles.footerBtn, { backgroundColor: "#E5E7EB" }]}
            >
              <Ionicons name="navigate-outline" size={16} color="#111827" />
              <Text style={[styles.footerBtnText, { color: "#111827" }]}>Use My GPS</Text>
            </Pressable>

            <Pressable
              onPress={async () => {
                if (!tempCoords) {
                  Alert.alert("Pick a spot", "Long-press on the map to drop a pin.");
                  return;
                }
                const { latitude, longitude } = tempCoords;
                setCoords(tempCoords);
                const pretty = await prettyFromCoords(latitude, longitude);
                setLocation(pretty);
                setAddress(pretty);
                setMapOpen(false);
              }}
              style={styles.footerBtnPrimary}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              <Text style={styles.footerBtnPrimaryText}>Use This Location</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------- UI helpers ---------- */
function Section({
  title, icon, children, style,
}: { title: string; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode; style?: any; }) {
  return (
    <View style={[styles.card, styles.shadow, style]}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionIcon}><Ionicons name={icon} size={16} color={COLORS.brand} /></View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function IconField({
  icon, placeholder, value, onChangeText, keyboardType = "default", style,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string; value: string;
  onChangeText: (t: string) => void;
  keyboardType?: "default" | "email-address" | "numeric" | "decimal-pad" | "phone-pad";
  style?: any;
}) {
  return (
    <View style={[styles.pill, style]}>
      <Ionicons name={icon} size={18} color={COLORS.sub} style={{ marginRight: 8, marginLeft: 2 }} />
      <TextInput placeholder={placeholder} placeholderTextColor="#9CA3AF" style={styles.input}
        value={value} onChangeText={onChangeText} keyboardType={keyboardType} />
    </View>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <LinearGradient
      colors={[COLORS.brand, COLORS.brand2]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ borderRadius: 18, paddingVertical: 7, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 6 }}
    >
      <Ionicons name="calendar-outline" size={12} color="#fff" />
      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12.5 }}>
        {text}
      </Text>
    </LinearGradient>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  appbar: { height: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
  appbarBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  appbarTitle: { flex: 1, textAlign: "left", color: "#fff", fontWeight: "800", fontSize: 18, marginLeft: 6 },

  heroCard: { marginHorizontal: 16, marginTop: -18, marginBottom: 8, backgroundColor: COLORS.card, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  heroText: { color: COLORS.text, fontWeight: "700" },

  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 14 },
  sectionHead: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  sectionIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#E9F2FF", alignItems: "center", justifyContent: "center", marginRight: 8 },
  sectionTitle: { fontSize: 15.5, fontWeight: "800", color: COLORS.text },

  pill: { backgroundColor: COLORS.grayLight, borderRadius: 22, paddingHorizontal: 12, minHeight: 46, flexDirection: "row", alignItems: "center" },
  input: { flex: 1, color: COLORS.text, fontSize: 14.5 },
  trailingIcon: { position: "absolute", right: 6, height: 46, width: 38, alignItems: "center", justifyContent: "center" },

  // New: action row under address
  actionRow3: { flexDirection: "row", gap: 8, marginTop: 8 },
  actionPill: { flex: 1, backgroundColor: COLORS.brand, borderRadius: 12, paddingVertical: 10, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  actionPillText: { color: "#fff", fontWeight: "800", fontSize: 12.5 },

  verifyText: { color: "#fff", fontWeight: "800", fontSize: 12.5 },
  verifiedNote: { marginTop: 6, color: "#16A34A", fontWeight: "700", fontSize: 12.5 },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  hint: { marginTop: 8, color: COLORS.sub, fontSize: 12.5 },

  // Owner badge
  ownerRow: { marginBottom: 8 },
  ownerBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EAF2FF",
    borderColor: "#DAE7FF",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ownerText: { color: COLORS.text, fontWeight: "700", fontSize: 12.5 },


  actionRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
},


  // Pricing
  priceRow: {
    backgroundColor: "#F0F5FF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E0EAFF",
  },
  priceRowHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priceRowTitle: { fontWeight: "800", color: COLORS.text, fontSize: 14.5 },
  priceRowValue: { fontWeight: "900", color: COLORS.brand, fontSize: 14.5 },
  priceControls: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  stepperBtn: { flex: 1, height: 42, borderRadius: 12, backgroundColor: COLORS.brand, alignItems: "center", justifyContent: "center" },

  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  quickChip: { backgroundColor: "#E9EDF5", borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 },
  quickChipActive: { backgroundColor: COLORS.link },
  quickChipText: { color: COLORS.text, fontWeight: "800", fontSize: 12.5 },

  unitGroup: { flexDirection: "row", gap: 8, marginTop: 10 },
  unitPill: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 14, backgroundColor: "#E9EDF5" },
  unitPillActive: { backgroundColor: COLORS.link },
  unitText: { color: COLORS.text, fontWeight: "700", fontSize: 12.5 },
  unitTextActive: { color: "#fff" },

  // Vehicles
  prettyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  vehicleCard: { width: "47.5%", borderRadius: 16, padding: 12 },
  vehicleHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  vehicleTitle: { color: COLORS.text, fontWeight: "800", fontSize: 14.5 },
  counterWrap: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#E9EDF5", alignItems: "center", justifyContent: "center" },
  stepBtnActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  countBadge: { minWidth: 58, height: 38, borderRadius: 10, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  countText: { fontSize: 16, fontWeight: "800", color: COLORS.text },

  submitBtn: { borderRadius: 28, overflow: "hidden" },
  submitPressable: { minHeight: 50, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  // Map full-screen
  mapFull: { flex: 1, backgroundColor: "#fff" , marginTop:50 },
  mapHeader: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5E7EB" },
  mapTitle: { fontWeight: "800", fontSize: 16, color: COLORS.text },
  headerBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  mapBody: { flex: 1 },

  mapFooter: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  footerBtn: { flex: 1, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  footerBtnText: { fontWeight: "800" },
  footerBtnPrimary: { flex: 1, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, backgroundColor: COLORS.brand },
  footerBtnPrimaryText: { color: "#fff", fontWeight: "800" },

  mapSearchBar: {
    position: "absolute",
    top: 56,
    left: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mapSearchInput: { flex: 1, color: COLORS.text, fontSize: 14.5 },
  mapSearchBtn: { backgroundColor: COLORS.brand, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  mapSearchBtnText: { color: "#fff", fontWeight: "800", fontSize: 12.5 },

  shadow: Platform.select({
    ios: { shadowColor: COLORS.shadow, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
    android: { elevation: 3 },
  }) as object,

  /* ---- Legal ---- */
  legalHeader: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  legalBadge: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legalBadgeText: { color: "#fff", fontWeight: "800", fontSize: 11 },
  legalHeaderText: { flex: 1, color: COLORS.text, fontWeight: "700", fontSize: 12.5 },

  uploadCard: { backgroundColor: "#fff", borderRadius: 16, padding: 12 },
  cardHeadRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  cardHeadLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontWeight: "800", color: COLORS.text },

  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 6 },
  statusPillText: { fontWeight: "800", fontSize: 12 },

  dashedTile: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: COLORS.brand,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FBFF",
  },
  dashedTitle: { color: COLORS.text, fontWeight: "800" },
  dashedSub: { color: COLORS.sub, fontSize: 12 },

  primaryPill: { backgroundColor: COLORS.brand, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  primaryPillText: { color: "#fff", fontWeight: "800", fontSize: 12.5 },

  pdfRow: { marginTop: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  pdfLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  pdfIconStripe: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.brand, alignItems: "center", justifyContent: "center" },
  pdfName: { color: "#fff", fontWeight: "800" },
  pdfMeta: { color: COLORS.sub, fontSize: 12 },

  destructiveBtn: { backgroundColor: "#EF4444", borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  destructiveBtnText: { color: "#fff", fontWeight: "800", fontSize: 12.5 },

  galleryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  addTile: {
    width: 92, height: 92, borderRadius: 12,
    borderWidth: 1.5, borderStyle: "dashed", borderColor: COLORS.brand,
    backgroundColor: "#F8FBFF",
    alignItems: "center", justifyContent: "center",
    gap: 4,
  },
  addTileText: { color: COLORS.text, fontWeight: "800", fontSize: 12.5 },
  addTileHint: { color: "#6B7280", fontSize: 11 },

  thumbWrap: { width: 92, height: 92, borderRadius: 12, overflow: "hidden", backgroundColor: "#E5E7EB", position: "relative" },
  thumb: { width: "100%", height: "100%" },
  removeBadge: {
    position: "absolute", top: 6, right: 6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center", justifyContent: "center",
  },

  agreePill: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#E9F2FF",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  link: { color: COLORS.link, fontWeight: "800" },
  counterText: { color: COLORS.sub, fontWeight: "700" },

  agreePillOn: { backgroundColor: COLORS.brand },
  agreeText: { flex: 1, color: COLORS.text, fontWeight: "700" },
});
