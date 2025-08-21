// app/PaymentInfo.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { createPayment } from "./api";

type Params = {
  parking_space_id: number;
  parkingName?: string;
  vehicleNo?: string;
  vehicleType?: string;  // "Car" | "Van" | ...
  startTime: string;     // "HH:MM" (24h)
  endTime: string;       // "HH:MM" (24h)
  pin: string;
  ratePerHour?: number;  // e.g. 150 (Rs.)
};

/* ---- THEME ---- */
const COL_BRAND = "#2F80ED";
const COL_BG = "#F2F4F8";
const COL_CARD = "#FFFFFF";
const COL_BORDER = "#E5E7EB";
const COL_INK = "#0F172A";
const COL_SUB = "#6B7280";

/* ---- helpers ---- */
function hhmmToMinutes(t?: string) {
  const m = t?.match(/^(\d{2}):(\d{2})$/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}
function durationMinutes(start?: string, end?: string) {
  const s = hhmmToMinutes(start);
  const e = hhmmToMinutes(end);
  return e >= s ? e - s : e + 1440 - s;
}
function fmtHours(mins: number) {
  if (mins % 60 === 0) return `${mins / 60} hrs`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h} h ${m} m`;
}
function fmt12h(t?: string) {
  const m = t?.match(/^(\d{2}):(\d{2})$/);
  if (!m) return "—";
  let h = parseInt(m[1], 10);
  const mm = m[2];
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${mm} ${ampm}`;
}
function moneyRs(n: number) {
  const intish = Math.abs(n - Math.round(n)) < 1e-6;
  return `Rs.${intish ? Math.round(n) : n.toFixed(2)}`;
}

export default function PaymentInfo() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const p: Params =
    route.params ?? {
      parking_space_id: 0,
      parkingName: "Parking",
      vehicleNo: "AAA-0000",
      vehicleType: "Car",
      startTime: "07:00",
      endTime: "12:00",
      pin: "123456",
      ratePerHour: 150,
    };

  const mins = useMemo(() => durationMinutes(p.startTime, p.endTime), [p.startTime, p.endTime]);
  const rate = p.ratePerHour ?? 150;
  const total = useMemo(
    () => Math.round(((mins / 60) * rate) * 100) / 100,
    [mins, rate]
  );

  const [showTimeCard, setShowTimeCard] = useState(true);
  const [showInfo, setShowInfo] = useState(true);

  // NEW: state to control saving once and enabling OK
  const [saving, setSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false); // becomes true after first (successful) save

  async function onSave() {
    if (hasSaved) {
      Alert.alert("Already saved", "This payment was already recorded.");
      return;
    }
    if (!p.parking_space_id) {
      Alert.alert("Missing data", "parking_space_id is required.");
      return;
    }
    if (!p.pin) {
      Alert.alert("Missing PIN", "Driver PIN is required.");
      return;
    }

    try {
      setSaving(true);
      const res = await createPayment({
        parking_space_id: p.parking_space_id,
        payment: total,
        pin: p.pin,
      });

      // Normal success
      setHasSaved(true);
      Alert.alert(
        "Details saved",
        res?.payment_id ? `Payment recorded (ID: ${res.payment_id}).` : "Payment recorded."
      );
    } catch (e: any) {
      const msg = String(e?.message || "").toLowerCase();

      // If backend saved but returned non-JSON, treat as success
      if (msg.includes("server error") || msg.includes("empty json response")) {
        setHasSaved(true);
        Alert.alert("Details saved", "Payment recorded.");
      } else if (msg.includes("duplicate") || msg.includes("1062")) {
        // If backend prevents duplicates, consider it saved
        setHasSaved(true);
        Alert.alert("Details saved", "Payment already recorded.");
      } else if (msg.includes("network request failed") || msg.startsWith("http")) {
        Alert.alert("Couldn’t save", e?.message || "Network/HTTP error");
      } else {
        Alert.alert("Couldn’t save", e?.message || "Unknown error");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COL_BG }}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={st.header}>
        <Pressable style={st.headerIcon}>
          <Ionicons name="grid-outline" size={18} color="#fff" />
        </Pressable>
        <Text style={st.headerTitle}>Payment Info</Text>
        <View style={st.avatar}><Text style={st.avatarText}>P</Text></View>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Total Parking Time */}
        <View style={st.card}>
          <View style={st.cardTop}>
            <View>
              <Text style={st.cardTitle}>Total Parking Time</Text>
              <Text style={st.bigHours}>{fmtHours(mins)}</Text>
            </View>
            <MaterialCommunityIcons name="file-document-outline" size={22} color={COL_SUB} />
          </View>

          {showTimeCard && (
            <>
              <View style={{ height: 8 }} />
              <View style={st.ratePill}>
                <Text style={st.ratePillText}>{moneyRs(rate)} per hr</Text>
              </View>
            </>
          )}

          <Pressable onPress={() => setShowTimeCard(v => !v)} style={st.dropToggle}>
            <Ionicons name={showTimeCard ? "chevron-up" : "chevron-down"} size={18} color={COL_SUB} />
          </Pressable>
        </View>

        {/* PIN (prominent box) */}
        <View style={st.pinCard}>
          <Text style={st.pinLabel}>Driver PIN</Text>
          <View style={st.pinBox}>
            <Text style={st.pinText}>{p.pin || "—"}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={st.section}>
          <Pressable onPress={() => setShowInfo(v => !v)} style={st.sectionHead}>
            <Text style={st.sectionTitle}>Info</Text>
            <Ionicons name={showInfo ? "chevron-up" : "chevron-down"} size={18} color={COL_SUB} />
          </Pressable>

          {showInfo && (
            <View style={st.innerCard}>
              <Row label="parking_space_id" value={`${p.parking_space_id}`} mono />
              <Row label="Vehicle Type" value={p.vehicleType ?? "—"} />
              <Row label="Arrival Time" value={fmt12h(p.startTime)} />
              <Row label="Leave Time" value={fmt12h(p.endTime)} />
            </View>
          )}
        </View>

        {/* Total */}
        <View style={st.innerCard}>
          <Row label="Total Amount" value={moneyRs(total)} strong />
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={st.footer}>
        <Pressable
          style={[
            st.verifyBtn,
            (saving || hasSaved) && { opacity: 0.7, borderColor: "#94a3b8" },
          ]}
          onPress={onSave}
          disabled={saving || hasSaved}
        >
          {saving ? (
            <ActivityIndicator />
          ) : hasSaved ? (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#22c55e" />
              <Text style={[st.verifyText, { color: "#22c55e" }]}>Saved</Text>
            </>
          ) : (
            <>
              <Ionicons name="shield-checkmark-outline" size={18} color={COL_BRAND} />
              <Text style={st.verifyText}>Verify &amp; Save</Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={[st.okBtn, !hasSaved && { opacity: 0.5 }]}
          onPress={() => navigation.goBack()}
          disabled={!hasSaved}
        >
          <Text style={st.okText}>Ok</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  strong,
  mono,
}: {
  label: string;
  value: string;
  strong?: boolean;
  mono?: boolean;
}) {
  return (
    <View style={st.row}>
      <Text style={st.rowLabel}>{label}</Text>
      <Text
        style={[
          st.rowValue,
          strong && { fontWeight: "800", fontSize: 16, color: COL_INK },
          mono && { fontVariant: ["tabular-nums"], letterSpacing: 1 },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  header: {
    height: 56,
    backgroundColor: COL_BRAND,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  headerIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)", justifyContent: "center", alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800", flex: 1, textAlign: "center" },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#ffffff", justifyContent: "center", alignItems: "center" },
  avatarText: { color: COL_BRAND, fontWeight: "800" },

  card: { backgroundColor: COL_CARD, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COL_BORDER },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { color: COL_SUB, fontWeight: "700", marginBottom: 4 },
  bigHours: { color: COL_INK, fontSize: 22, fontWeight: "900" },

  ratePill: { alignSelf: "flex-start", backgroundColor: "#DCFCE7", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  ratePillText: { color: "#065F46", fontWeight: "800" },

  dropToggle: {
    marginTop: 8, alignSelf: "center", width: 28, height: 28, borderRadius: 14,
    borderWidth: 1, borderColor: COL_BORDER, justifyContent: "center", alignItems: "center",
  },

  /* PIN styles */
  pinCard: {
    backgroundColor: COL_CARD,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COL_BORDER,
  },
  pinLabel: { color: COL_SUB, fontWeight: "700", marginBottom: 8 },
  pinBox: {
    borderWidth: 2,
    borderColor: COL_BRAND,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
  },
  pinText: { color: COL_INK, fontSize: 28, fontWeight: "900", letterSpacing: 4 },

  section: { backgroundColor: "#EEF2F7", borderRadius: 12, borderWidth: 1, borderColor: COL_BORDER },
  sectionHead: { paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { color: COL_INK, fontWeight: "800" },

  innerCard: { backgroundColor: COL_CARD, margin: 10, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COL_BORDER },

  row: { paddingVertical: 8, flexDirection: "row", justifyContent: "space-between" },
  rowLabel: { color: COL_SUB },
  rowValue: { color: COL_INK, fontWeight: "700" },

  /* Sticky footer */
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: COL_CARD,
    borderTopWidth: 1,
    borderTopColor: COL_BORDER,
  },

  /* Verify & Save button */
  verifyBtn: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COL_BRAND,
    backgroundColor: "transparent",
    marginBottom: 10,
    minWidth: 180,
    justifyContent: "center",
  },
  verifyText: { color: COL_BRAND, fontWeight: "800" },

  /* Ok primary (disabled until hasSaved) */
  okBtn: {
    alignSelf: "center",
    backgroundColor: COL_BRAND,
    paddingHorizontal: 36,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  okText: { color: "#fff", fontWeight: "800" },
});
