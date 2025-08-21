// AfterAccepting.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import {
    Dimensions,
    GestureResponderEvent,
    Image,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";

/* ---------- Routes ---------- */
type RootStackParamList = {
  AfterAccepting: undefined;
  AddSpaceDetails: undefined;
  ShowDetails: { id: number } | undefined;
};
type Nav = NativeStackNavigationProp<RootStackParamList>;

/* ---------- Theme ---------- */
const COLORS = {
  bg: "#F5F7FB",
  card: "#FFFFFF",
  text: "#111827",
  sub: "#6B7280",
  brand: "#2F80ED",
  border: "#E5E7EB",
  chip: "#F1F5F9",
  danger: "#EF4444",
  success: "#10B981",
  dot: "#D1D5DB",
  dotActive: "#111827",
};

const SCREEN_W = Dimensions.get("window").width;
const CARD_W = SCREEN_W - 32;

type VehicleKind = "Car" | "Bus" | "Bike";

export default function AfterAccepting() {
  const navigation = useNavigation<Nav>();

  const [userName] = useState("User");
  const [selected, setSelected] = useState<VehicleKind>("Car");

  /* ---------- Banner carousel ---------- */
  const banners = useMemo(
    () => [
      { id: "1", uri: "https://i.imgur.com/fKxkC1x.png" }, // placeholder
      { id: "2", uri: "https://i.imgur.com/3QjO2dC.png" },
      { id: "3", uri: "https://i.imgur.com/c3ge9yJ.png" },
    ],
    []
  );
  const [page, setPage] = useState(0);
  const onBannerScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const p = Math.round(x / CARD_W);
    setPage(p);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Top bar (hamburger + title + avatar) */}
      <View style={styles.topBar}>
        <Pressable hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="menu" size={22} color={COLORS.text} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.welcome}>
            Welcome Back, <Text style={{ fontWeight: "900" }}>{userName}</Text>{" "}
            <Text>👋</Text>
          </Text>
        </View>

        <Pressable hitSlop={8} style={styles.avatarWrap}>
          <Image
            source={{ uri: "https://i.pravatar.cc/100?img=12" }}
            style={styles.avatar}
          />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110 }}
      >
        {/* Banner card with carousel */}
        <View style={[styles.card, styles.shadow]}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onBannerScrollEnd}
          >
            {banners.map((b) => (
              <View key={b.id} style={{ width: CARD_W, height: 130 }}>
                <Image
                  source={{ uri: b.uri }}
                  style={{ width: "100%", height: "100%", borderRadius: 12 }}
                  resizeMode="cover"
                />
              </View>
            ))}
          </ScrollView>

          {/* dots */}
          <View style={styles.dotsRow}>
            {banners.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === page && { backgroundColor: COLORS.dotActive, width: 20 },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Vehicle Types + Space card */}
        <Pressable
          onPress={() => navigation.navigate("ShowDetails", { id: 1 })}
          style={[styles.card, styles.shadow, { marginTop: 12 }]}
        >
          <Text style={styles.sectionTitle}>Vehicle Types</Text>
          <View style={styles.chipsRow}>
            {(["Car", "Bus", "Bike"] as VehicleKind[]).map((k) => {
              const active = selected === k;
              return (
                <Pressable
                  key={k}
                  onPress={(e: GestureResponderEvent) => {
                    e.stopPropagation(); // prevent triggering card press
                    setSelected(k);
                  }}
                  style={[styles.chip, active && { backgroundColor: COLORS.text }]}
                >
                  <Text style={[styles.chipText, active && { color: "#fff" }]}>
                    {k}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Space info */}
          <View style={{ marginTop: 6 }}>
            <View style={styles.row}>
              <Ionicons name="location-sharp" size={16} color={COLORS.danger} />
              <Text style={styles.rowText}>Thummulla</Text>
            </View>
            <View style={styles.row}>
              <MaterialCommunityIcons
                name="parking"
                size={16}
                color={COLORS.brand}
              />
              <Text style={styles.rowText}>Spaces Available: 10</Text>
            </View>
            <View style={styles.row}>
              <Ionicons name="cash-outline" size={16} color={COLORS.text} />
              <Text style={styles.rowText}>Type: Paid Parking</Text>
            </View>
            <View style={styles.row}>
              <Ionicons name="time-outline" size={16} color={COLORS.text} />
              <Text style={styles.rowText}>Open: 6:00 AM - 10:00 PM</Text>
            </View>
          </View>

          {/* Preview image */}
          <View style={{ marginTop: 10 }}>
            <Image
              source={{ uri: "https://i.imgur.com/Mm1aVtP.png" }}
              style={{ width: "100%", height: 110, borderRadius: 12 }}
              resizeMode="cover"
            />
          </View>
        </Pressable>
      </ScrollView> {/* ✅ close ScrollView */}

      {/* Floating + button */}
      <Pressable
        onPress={() => navigation.navigate("AddSpaceDetails")}
        style={({ pressed }) => [
          styles.fab,
          pressed && { transform: [{ scale: 0.98 }] },
        ]}
        hitSlop={8}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  welcome: {
    fontSize: 20,
    color: COLORS.text,
    fontWeight: "700",
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  avatar: { width: "100%", height: "100%" },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 12,
  },
  dotsRow: {
    flexDirection: "row",
    alignSelf: "center",
    marginTop: 6,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: COLORS.dot,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 10,
  },
  chipsRow: { flexDirection: "row", gap: 10, marginBottom: 6 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.chip,
    borderRadius: 10,
  },
  chipText: { color: COLORS.text, fontWeight: "700" },

  row: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8 },
  rowText: { color: COLORS.text, fontSize: 13.5 },

  fab: {
    position: "absolute",
    bottom: 18,
    left: (SCREEN_W - 56) / 2,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  shadow: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 3 },
  }) as object,
});
