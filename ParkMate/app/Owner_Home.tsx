// app/Owner_Home.tsx — polished UI + photos strip + fullscreen viewer + back blocking + manual refresh only
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  FlatList,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { listOwnerSpaces } from "./api";

/* ---------- Types ---------- */
type RootStackParamList = {
  Owner_Home: undefined;
  AddSpaceDetails: undefined;
  Login_Owner: undefined;
  ShowDetails: { space: Space } | undefined;
};

type Banner = { id: string; image: string };

type Space = {
  id: number;
  parking_name: string;
  location: string;
  availability: string; // pretty text from API
  status: "pending" | "reject" | "accept";
  counts: { cars: number; vans: number; bikes: number; buses: number };
  price?: {
    unit: "hour" | "day";
    cars: number; vans: number; bikes: number; buses: number;
  } | null;
  preview_url?: string | null;
  photos?: string[];
};

type Props = {
  userName?: string;
  onMenuPress?: () => void;
  onAvatarPress?: () => void;
  onAddPress?: () => void;
  banners?: Banner[];
};

/* ---------- Theme ---------- */
const COLORS = {
  bg: "#F6F7FB",
  text: "#0F172A",
  sub: "#6B7280",
  card: "#FFFFFF",
  brand: "#2F80ED",
  brandDark: "#1E67D6",
  accent: "#7C3AED",
  chip: "#EEF2F7",
  danger: "#EF4444",
  dot: "#D1D5DB",
  shadow: "#000000",
  success: "#10B981",
  pending: "#F59E0B",
  closed: "#DC2626",
};

const { width: W } = Dimensions.get("window");
const H_PADDING = 18;
const BANNER_W = W - H_PADDING * 2;
const BANNER_H = 160;

const DEFAULT_BANNERS: Banner[] = [
  { id: "1", image: "https://images.unsplash.com/photo-1549921296-3fd62a3d8d6a?q=80&w=1600&auto=format&fit=crop" },
  { id: "2", image: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?q=80&w=1600&auto=format&fit=crop" },
  { id: "3", image: "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?q=80&w=1600&auto=format&fit=crop" },
];

/* ---------- Helpers ---------- */
function coerceOpenClosed(avail?: string | null): "Open" | "Closed" {
  const s = String(avail ?? "").trim().toLowerCase();
  if (!s) return "Open";
  if (["0", "no", "false", "closed", "close", "unavailable"].some(k => s === k || s.includes(k))) return "Closed";
  if (["1", "yes", "true", "open", "opened", "available"].some(k => s === k || s.includes(k))) return "Open";
  return "Open";
}
const fmt = (n?: number | null) => (typeof n === "number" && n > 0 ? `LKR ${n}` : "—");

/* ---------- Component ---------- */
export default function Owner_Home({
  userName = "User",
  onMenuPress,
  onAvatarPress,
  onAddPress,
  banners,
}: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const data = useMemo(() => banners ?? DEFAULT_BANNERS, [banners]);

  const flatRef = useRef<FlatList<string>>(null);

  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // banner auto-rotate every 5s
  useEffect(() => {
    if (!scrollRef.current || data.length <= 1) return;
    const t = setInterval(() => {
      const next = (index + 1) % data.length;
      setIndex(next);
      scrollRef.current?.scrollTo({ x: next * BANNER_W, animated: true });
    }, 5000);
    return () => clearInterval(t);
  }, [index, data.length]);

  const [displayName, setDisplayName] = useState<string>(userName);
  const [ownerId, setOwnerId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);

  // image viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const openViewer = (imgs: string[], idx = 0) => {
    if (!imgs || imgs.length === 0) return;
    setViewerImages(imgs);
    setViewerIndex(idx);
    setViewerOpen(true);
  };

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / BANNER_W);
    setIndex(next);
  };

  // Load owner + spaces (ONE-TIME on mount; manual pull-to-refresh later)
  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const raw = await AsyncStorage.getItem("pm_owner");
      if (raw) {
        const owner = JSON.parse(raw);
        const name =
          (owner?.full_name && String(owner.full_name).trim()) ||
          (owner?.username && String(owner.username).trim()) ||
          userName;
        setDisplayName(name);
        setOwnerId(owner?.id ?? null);

        if (owner?.id) {
          const res = await listOwnerSpaces(owner.id);
          setSpaces(res?.spaces ?? []);
        } else {
          setSpaces([]);
        }
      } else {
        setDisplayName(userName);
        setOwnerId(null);
        setSpaces([]);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load spaces");
      setSpaces([]);
    } finally {
      setLoading(false);
    }
  }, [userName]);

  // ❗Initial load only (no auto-refresh when returning to this screen)
  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const toggleMenu = () => setMenuOpen(v => !v);

  // ===== Block back navigation unless we’re logging out =====
  const canExitRef = useRef(false);

  useEffect(() => {
    // Disable iOS swipe-back gesture
    navigation.setOptions({ gestureEnabled: false as any });

    const beforeRemoveSub = navigation.addListener("beforeRemove", (e) => {
      // If we’re intentionally leaving (logout sets canExitRef), allow it
      if (canExitRef.current) return;
      // Otherwise, block leaving Owner_Home
      e.preventDefault();
    });

    // On Android hardware back: close overlays if open; otherwise swallow it.
    const backSub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (viewerOpen) { setViewerOpen(false); return true; }
      if (menuOpen) { setMenuOpen(false); return true; }
      // Block exiting Owner_Home
      return true;
    });

    return () => {
      beforeRemoveSub();
      backSub.remove();
    };
  }, [navigation, viewerOpen, menuOpen]);

  const logout = async () => {
    try { await AsyncStorage.removeItem("pm_owner"); } catch {}
    setMenuOpen(false);
    // allow leaving this screen just for this action
    canExitRef.current = true;
    navigation.replace("Login_Owner");
  };

  const hasAccepted = spaces.some(s => s.status === "accept");
  const hasPending = spaces.some(s => s.status === "pending");

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Gradient header */}
      <LinearGradient
        colors={["#E8F1FE", "#F7F7FB"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerWrap}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => { if (onMenuPress) onMenuPress(); toggleMenu(); }}
            hitSlop={8}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
            android_ripple={{ color: "#E5E7EB", borderless: true }}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
          >
            <Ionicons name="menu-outline" size={24} color={COLORS.text} />
          </Pressable>

          <View style={styles.headerTextWrap}>
            <Text style={styles.kicker}>Welcome back,</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.title} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={{ fontSize: 22, marginLeft: 6 }}>👋</Text>
            </View>
          </View>

          <Pressable
            onPress={onAvatarPress}
            hitSlop={8}
            style={({ pressed }) => [styles.profileWrap, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel="Profile"
          >
            <MaterialCommunityIcons name="account-circle" size={34} color={COLORS.text} />
          </Pressable>
        </View>

        {/* Banner carousel */}
        <View style={styles.bannerCardShadow}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleMomentumEnd}
          >
            {data.map((b, i) => (
              <View key={b.id} style={styles.bannerCard}>
                <Image source={{ uri: b.image }} style={styles.bannerImage} resizeMode="cover" />
                <LinearGradient
                  colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.35)"]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.bannerOverlay}>
                  <Text style={styles.bannerHeadline}>Manage your spaces</Text>
                  <Text style={styles.bannerSub}>Track categories, pricing & approvals</Text>
                </View>
                {/* progress bar dots */}
                <View style={styles.bannerDots}>
                  {data.map((_, j) => (
                    <View key={j} style={[styles.dot, i === j && styles.dotActive]} />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: H_PADDING, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} />
        }
      >
        {/* States */}
        {loading && (
          <View style={[styles.emptyCard, styles.shadow]}>
            <ActivityIndicator size="small" color={COLORS.brand} />
            <Text style={[styles.emptyText, { marginTop: 10 }]}>Loading your spaces…</Text>
          </View>
        )}

        {!loading && error && (
          <View style={[styles.emptyCard, styles.shadow]}>
            <Ionicons name="warning-outline" size={22} color={COLORS.danger} />
            <Text style={[styles.emptyText, { marginTop: 8, color: COLORS.text }]}>{error}</Text>
          </View>
        )}

        {!loading && !error && spaces.length === 0 && (
          <View style={[styles.emptyCard, styles.shadow]}>
            <LinearGradient
              colors={["#E9ECF6", "#F7F8FC"]}
              style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
            />
            <View style={{ alignItems: "center" }}>
              <View style={styles.circle}>
                <MaterialCommunityIcons name="parking" size={26} color={COLORS.brand} />
              </View>
              <Text style={[styles.emptyTitle]}>No spaces yet</Text>
              <Text style={[styles.emptyText, { marginTop: 6 }]}>
                Add your first parking space to get started.
              </Text>
              <Pressable
                onPress={() => navigation.navigate("AddSpaceDetails")}
                style={({ pressed }) => [styles.primaryBtn, pressed && { transform: [{ scale: 0.98 }] }]}
                android_ripple={{ color: "#1f6fd6", radius: 28 }}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Add a space</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Pending notice */}
        {!loading && !error && spaces.length > 0 && hasPending && !hasAccepted && (
          <View style={[styles.noticeCard, styles.shadow]}>
            <View style={styles.badgePending}>
              <Ionicons name="time-outline" size={14} color="#fff" />
              <Text style={styles.badgePendingText}>Pending review</Text>
            </View>
            <Text style={styles.noticeTitle}>We’re reviewing your submission</Text>
            <Text style={styles.noticeText}>
              You’ll see your space here once it’s approved.
            </Text>
          </View>
        )}

        {/* Accepted spaces list */}
        {!loading && !error && hasAccepted && (
          <View style={{ gap: 14 }}>
            <Text style={styles.sectionHeader}>Your Spaces</Text>
            {spaces.filter(s => s.status === "accept").map(space => {
              const unitLabel = space.price?.unit === "hour" ? "Per Hour" : "Per Day";
              const locationShort = (space.location || "").split(",")[0] || space.location;
              const openState = coerceOpenClosed(space.availability);

              const catCounts = [
                { key: "cars",  label: "Car",  count: space.counts.cars,  icon: "car" as const },
                { key: "vans",  label: "Van",  count: space.counts.vans,  icon: "van-passenger" as const },
                { key: "bikes", label: "Bike", count: space.counts.bikes, icon: "motorbike" as const },
                { key: "buses", label: "Bus",  count: space.counts.buses, icon: "bus" as const },
              ].filter(x => x.count > 0);

              const catPrices = [
                { label: "Car",  value: space.price?.cars ?? 0 },
                { label: "Van",  value: space.price?.vans ?? 0 },
                { label: "Bike", value: space.price?.bikes ?? 0 },
                { label: "Bus",  value: space.price?.buses ?? 0 },
              ].filter(p => typeof p.value === "number" && p.value > 0);

              const images =
                (space.photos && space.photos.length > 0)
                  ? space.photos
                  : (space.preview_url ? [space.preview_url] : ["https://images.unsplash.com/photo-1483721310020-03333e577078?q=80&w=1600&auto=format&fit=crop"]);

              return (
                <Pressable
                  key={space.id}
                  onPress={() => navigation.navigate("ShowDetails", { space })}
                  style={[styles.spaceCard, styles.shadow]}
                >
                  {/* (Optional) Hero image row could be added back if needed */}

                  {/* Content */}
                  <View style={{ padding: 12 }}>
                    {/* Category counts */}
                    {catCounts.length > 0 && (
                      <View style={styles.countsRow}>
                        {catCounts.map((c) => (
                          <View key={c.key} style={styles.countChip}>
                            <MaterialCommunityIcons name={c.icon} size={16} color={COLORS.text} />
                            <Text style={styles.countChipText}>{c.label}</Text>
                            <View style={styles.countBubble}>
                              <Text style={styles.countBubbleText}>{c.count}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Photos strip (all images) */}
                    {images.length > 1 && (
                      <View style={{ marginTop: 12 }}>
                        <Text style={styles.photosHeader}>Photos</Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{ gap: 10, paddingVertical: 6 }}
                        >
                          {images.map((uri, idx) => (
                            <Pressable
                              key={uri + idx}
                              onPress={() => openViewer(images, idx)}
                              style={styles.thumbWrap}
                            >
                              <Image source={{ uri }} style={styles.thumbImg} />
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* Prices by category */}
                    <View style={styles.priceCard}>
                      <View style={styles.priceHeaderRow}>
                        <Text style={styles.priceHeader}>Prices</Text>
                        <View style={styles.unitPill}>
                          <Ionicons name="cash-outline" size={13} color="#fff" />
                          <Text style={styles.unitPillText}>{unitLabel}</Text>
                        </View>
                      </View>

                      {catPrices.length > 0 ? (
                        <View style={styles.priceGrid}>
                          {catPrices.map(p => (
                            <View key={p.label} style={styles.priceItem}>
                              <Text style={styles.priceLabel}>{p.label}</Text>
                              <Text style={styles.priceValue}>{fmt(p.value)}</Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.priceEmpty}>No pricing set.</Text>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating + button */}
      <Pressable
        onPress={() => (onAddPress ? onAddPress() : navigation.navigate("AddSpaceDetails"))}
        style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.98 }] }]}
        android_ripple={{ color: "#1f6fd6", radius: 28 }}
        hitSlop={8}
      >
        <LinearGradient
          colors={[COLORS.brand, COLORS.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>

      {/* Simple menu overlay */}
      {menuOpen && (
        <View style={styles.menuOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
          <View style={[styles.menuCard, styles.shadow]}>
            <Text style={styles.menuHeader}>Menu</Text>
            <Pressable
              onPress={logout}
              style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.9 }]}
              android_ripple={{ color: "#E5E7EB" }}
            >
              <Ionicons name="log-out-outline" size={18} color={COLORS.text} />
              <Text style={styles.menuText}>Logout</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Fullscreen image viewer */}
      <Modal
        visible={viewerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setViewerOpen(false)}
      >
        <View style={styles.viewerRoot}>
          {/* Pager */}
          <FlatList
            ref={flatRef}
            data={viewerImages}
            horizontal
            pagingEnabled
            initialScrollIndex={viewerIndex}
            keyExtractor={(u, i) => u + i}
            getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
            onScrollToIndexFailed={({ index }) => {
              setTimeout(() => flatRef.current?.scrollToIndex({ index, animated: false }), 0);
            }}
            onMomentumScrollEnd={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const i = Math.round(x / W);
              setViewerIndex(i);
            }}
            renderItem={({ item }) => (
              <View style={{ width: W, height: "100%", alignItems: "center", justifyContent: "center" }}>
                <Image source={{ uri: item }} style={styles.viewerImage} resizeMode="contain" />
              </View>
            )}
            showsHorizontalScrollIndicator={false}
          />

          {/* Top overlay with big close target */}
          <View style={styles.viewerTopOverlay} pointerEvents="box-none">
            <Pressable
              style={({ pressed }) => [styles.viewerClose, pressed && { opacity: 0.8 }]}
              onPress={() => setViewerOpen(false)}
              hitSlop={10}
              android_ripple={{ color: "#ffffff22", borderless: true }}
            >
              <Ionicons name="close" size={28} color="#000000ff" />
            </Pressable>
          </View>

          {/* Counter (doesn’t eat touches) */}
          <View style={styles.viewerCounter} pointerEvents="none">
            <Text style={styles.viewerCounterText}>
              {viewerIndex + 1} / {viewerImages.length}
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  /* Header */
  headerWrap: {
    paddingBottom: 14,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: H_PADDING,
    paddingTop: 4,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#ffffff90",
  },
  headerTextWrap: { flex: 1, marginLeft: 8 },
  kicker: { fontSize: 12, color: COLORS.sub, fontWeight: "700" },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.text },
  profileWrap: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff",
  },

  /* Banner */
  bannerCardShadow: {
    shadowColor: COLORS.shadow, shadowOpacity: 0.08, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  bannerCard: {
    width: BANNER_W, height: BANNER_H, backgroundColor: COLORS.card,
    borderRadius: 16, marginHorizontal: H_PADDING, overflow: "hidden",
  },
  bannerImage: { width: "100%", height: "100%" },
  bannerOverlay: {
    position: "absolute",
    left: 14, right: 14, bottom: 12,
  },
  bannerHeadline: {
    color: "#fff", fontSize: 18, fontWeight: "800", textShadowColor: "rgba(0,0,0,0.25)",
    textShadowRadius: 6,
  },
  bannerSub: { color: "#E5E7EB", marginTop: 2, fontSize: 12, fontWeight: "600" },
  bannerDots: {
    position: "absolute",
    right: 12, top: 12, flexDirection: "row", gap: 6, backgroundColor: "#00000033",
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ffffff75" },
  dotActive: { width: 10, height: 6, borderRadius: 4, backgroundColor: "#fff" },

  /* Empty / states */
  emptyCard: {
    marginTop: 16,
    width: BANNER_W, alignSelf: "center",
    backgroundColor: COLORS.card, borderRadius: 16, paddingVertical: 28, paddingHorizontal: 16,
    alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: "800", marginTop: 10 },
  emptyText: { color: "#8b98b1ff", fontSize: 14, textAlign: "center", lineHeight: 20 },
  circle: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: "#ffffff",
    alignItems: "center", justifyContent: "center",
    shadowColor: COLORS.shadow, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  primaryBtn: {
    marginTop: 14,
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.brand, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800" },

  noticeCard: {
    marginTop: 14,
    backgroundColor: COLORS.card,
    borderRadius: 16, padding: 16,
  },
  badgePending: {
    alignSelf: "flex-start",
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.pending, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
  },
  badgePendingText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  noticeTitle: { marginTop: 12, fontSize: 16, fontWeight: "800", color: COLORS.text },
  noticeText: { marginTop: 6, color: COLORS.sub },

  sectionHeader: { marginTop: 8, marginBottom: 2, fontSize: 12, fontWeight: "800", color: COLORS.sub, paddingLeft: 2 },

  /* Space card */
  spaceCard: { backgroundColor: COLORS.card, borderRadius: 16, overflow: "hidden" },

  /* Category counts */
  countsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  countChip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.chip, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14,
  },
  countChipText: { color: COLORS.text, fontWeight: "700", fontSize: 12.5 },
  countBubble: {
    marginLeft: 2, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
    backgroundColor: "#fff", borderWidth: StyleSheet.hairlineWidth, borderColor: "#E5E7EB",
  },
  countBubbleText: { fontSize: 12, fontWeight: "800", color: COLORS.text },

  /* Photos strip */
  photosHeader: { fontSize: 12, fontWeight: "900", color: COLORS.sub, letterSpacing: 0.3, marginLeft: 2 },
  thumbWrap: {
    width: 92, height: 64, borderRadius: 8, overflow: "hidden",
    backgroundColor: "#E5E7EB", borderWidth: StyleSheet.hairlineWidth, borderColor: "#E5E7EB",
  },
  thumbImg: { width: "100%", height: "100%" },

  /* Prices */
  priceCard: {
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    backgroundColor: "#FAFAFB",
    padding: 10,
  },
  priceHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priceHeader: { fontSize: 12, fontWeight: "900", color: COLORS.sub, letterSpacing: 0.3 },
  unitPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.brand, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
  },
  unitPillText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  priceGrid: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  priceItem: {
    flexBasis: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: "#E5E7EB",
  },
  priceLabel: { fontSize: 12, fontWeight: "800", color: COLORS.sub, marginBottom: 4 },
  priceValue: { fontSize: 14, fontWeight: "900", color: COLORS.text },
  priceEmpty: { marginTop: 8, color: COLORS.sub },

  /* FAB */
  fab: {
    position: "absolute",
    bottom: 26,
    alignSelf: "center",
    width: 56, height: 56, borderRadius: 28,
    overflow: "hidden",
    alignItems: "center", justifyContent: "center",
    shadowColor: COLORS.brand, shadowOpacity: 0.3, shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },

  /* Menu overlay */
  menuOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-start", alignItems: "flex-start" },
  menuCard: {
    marginTop: 10, marginLeft: 10,
    backgroundColor: "#fff", borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 8, minWidth: 160,
  },
  menuHeader: { fontSize: 12, fontWeight: "800", color: COLORS.sub, marginBottom: 6, marginLeft: 4 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10 },
  menuText: { fontSize: 14.5, fontWeight: "700", color: COLORS.text },

  /* Viewer */
  viewerRoot: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: Platform.select({ ios: 44, android: 24 }),
  },
  viewerTopOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  viewerClose: {
    position: "absolute",
    top: (Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 12) + 8,
    right: 12,
    width: 60,
    height: 60,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0c030349",
    zIndex: 11,
    elevation: 11,
  },
  viewerImage: { width: "100%", height: "100%" },
  viewerCounter: {
    position: "absolute",
    bottom: 18,
    alignSelf: "center",
    zIndex: 10,
    elevation: 10,
    backgroundColor: "#00000066",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  viewerCounterText: { color: "#fff", fontWeight: "800" },

  /* Shadow helper */
  shadow: {
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 3 },
    }) as object,
  },
});
