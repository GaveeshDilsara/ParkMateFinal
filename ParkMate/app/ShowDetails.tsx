// app/ShowDetails.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// API
import { checkInVehicle, checkOutVehicle, lookupVehicle, VehicleKey } from "./api";

import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

/* ---------- THEME ---------- */
const BRAND = "#2F80ED";
const INK = "#0F172A";
const SUB = "#6B7280";
const CARD = "#FFFFFF";
const BG = "#F7F9FC";
const BORDER = "#E5E7EB";
const GREEN = "#10B981";

/* ---------- Types ---------- */
type Counts = { cars: number; vans: number; bikes: number; buses: number };
type Space = {
  id: number;
  parking_name: string;
  availability?: string; // kept for future use if needed
  counts: Counts;
};

/* ---------- Icon & labels ---------- */
const VEH_ICON: Record<VehicleKey, keyof typeof MaterialCommunityIcons.glyphMap> = {
  cars: "car",
  vans: "van-passenger",
  bikes: "motorbike",
  buses: "bus",
};
const VEH_LABEL: Record<VehicleKey, string> = {
  cars: "Cars",
  vans: "Vans",
  bikes: "Bikes",
  buses: "Buses",
};

/* ---------- helpers ---------- */
function nowHHMM() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
function dbToHHMM(dbTs?: string) {
  if (!dbTs) return "";
  const m = dbTs.match(/\s(\d{2}:\d{2})/); // "YYYY-MM-DD HH:MM:SS"
  return m ? m[1] : "";
}

const OCC_KEY = (spaceId: number) => `pm:space:${spaceId}:occupancy:v1`;

/* ---------- Screen ---------- */
export default function ShowDetails() {
  const navigation = useNavigation();
  const route = useRoute<any>();

  const fallback: Space = {
    id: 1,
    parking_name: "Thummulla",
    availability: "Open Daily",
    counts: { cars: 6, vans: 2, bikes: 2, buses: 2 },
  };
  const space: Space = route.params?.space ?? fallback;

  // Build slot keys by type
  const grid = useMemo(() => {
    const items: { key: string; type: VehicleKey }[] = [];
    (Object.keys(space.counts) as VehicleKey[]).forEach((k) => {
      const n = space.counts[k] ?? 0;
      for (let i = 0; i < n; i++) items.push({ key: `${k}-${i}`, type: k });
    });
    return items;
  }, [space]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const [showIn, setShowIn] = useState(false);
  const [showOut, setShowOut] = useState(false);

  // ---- Occupancy state (persisted) ----
  const [occupiedKeys, setOccupiedKeys] = useState<Set<string>>(new Set());
  const [byVehicle, setByVehicle] = useState<Record<string, string>>({}); // VEHICLE -> gridKey

  // Load persisted occupancy when space/grid changes
  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(OCC_KEY(space.id));
        if (!raw) return;
        const data = JSON.parse(raw) as { ok?: string[]; bv?: Record<string, string> };
        const allowed = new Set(grid.map((g) => g.key));
        const ok = new Set((data.ok || []).filter((k) => allowed.has(k)));
        const bv: Record<string, string> = {};
        Object.entries(data.bv || {}).forEach(([veh, key]) => {
          if (allowed.has(key)) bv[veh] = key;
        });
        setOccupiedKeys(ok);
        setByVehicle(bv);
      } catch {}
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space.id, grid.length]);

  // Persist occupancy whenever it changes
  useEffect(() => {
    const save = async () => {
      try {
        await AsyncStorage.setItem(
          OCC_KEY(space.id),
          JSON.stringify({ ok: Array.from(occupiedKeys), bv: byVehicle })
        );
      } catch {}
    };
    save();
  }, [occupiedKeys, byVehicle, space.id]);

  const findFreeKeyFor = (type: VehicleKey) => {
    for (const item of grid) {
      if (item.type === type && !occupiedKeys.has(item.key)) return item.key;
    }
    return null;
  };

  const handleCheckInLocal = (p: {
    vehicleNo: string;
    category: VehicleKey;
    phone: string;
    startTime: string;
  }) => {
    const veh = p.vehicleNo.trim().toUpperCase();
    if (byVehicle[veh]) {
      Alert.alert("Already inside", `${veh} is already checked in.`);
      return;
    }
    const freeKey = findFreeKeyFor(p.category);
    if (!freeKey) {
      Alert.alert("Full", `No free ${VEH_LABEL[p.category].slice(0, -1)} slots.`);
      return;
    }
    setOccupiedKeys((prev) => {
      const next = new Set(prev);
      next.add(freeKey);
      return next;
    });
    setByVehicle((prev) => ({ ...prev, [veh]: freeKey }));
    setSelectedKey(freeKey);
  };

  const handleCheckOutLocal = (p: { vehicleNo: string }) => {
    const veh = p.vehicleNo.trim().toUpperCase();
    const key = byVehicle[veh];
    if (!key) {
      Alert.alert("Not found", `${veh} is not currently parked here.`);
      return;
    }
    setOccupiedKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setByVehicle(({ [veh]: _, ...rest }) => rest);
    if (selectedKey === key) setSelectedKey(null);
  };

  // verify used by OutModal
  const verifyVehicle = async (vehicleNo: string) => {
    const veh = vehicleNo.trim().toUpperCase();
    if (!veh) throw new Error("Enter vehicle no");
    const res = await lookupVehicle({
      parking_space_id: space.id,
      vehicle_no: veh,
    });
    return res; // {success, active, in_time, ...}
  };

  // Helper to render one category section
  const renderCategory = (type: VehicleKey) => {
    const count = space.counts[type] ?? 0;
    if (count <= 0) return null;

    const slots = Array.from({ length: count }, (_, i) => ({
      key: `${type}-${i}`,
      type,
    }));

    const occupiedInType = Array.from(occupiedKeys).filter((k) => k.startsWith(`${type}-`)).length;

    return (
      <View key={type} style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleWrap}>
            <View style={styles.sectionIconWrap}>
              <MaterialCommunityIcons name={VEH_ICON[type]} size={18} color={BRAND} />
            </View>
            <Text style={styles.sectionTitle}>{VEH_LABEL[type]}</Text>
          </View>
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Total {count}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: "#E6F7EF", borderColor: "#C6F0DA" }]}>
              <Text style={[styles.badgeText, { color: "#047857" }]}>
                Free {count - occupiedInType}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.slotWrap}>
          {slots.map((slot) => {
            const isOccupied = occupiedKeys.has(slot.key);
            const isSelected = selectedKey === slot.key;
            return (
              <Pressable
                key={slot.key}
                onPress={() => setSelectedKey(slot.key)}
                style={[
                  styles.slot,
                  isSelected && styles.slotSelected,
                  isOccupied && styles.slotOccupied,
                ]}
                android_ripple={{ color: "#e5e7eb", borderless: true }}
              >
                <MaterialCommunityIcons
                  name={VEH_ICON[type]}
                  size={26}
                  color={isOccupied ? "#FFFFFF" : INK}
                />
                {isOccupied && (
                  <View style={styles.tickOverlay}>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{space.parking_name}</Text>
          <Text style={styles.subtitle}>ID #{space.id}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Actions under header */}
      <View style={styles.actionsRow}>
        <Pressable onPress={() => setShowIn(true)} style={[styles.actionBtn, styles.actionIn]}>
          <Ionicons name="log-in-outline" size={18} color="#fff" />
          <Text style={styles.actionText}>In</Text>
        </Pressable>
        <Pressable onPress={() => setShowOut(true)} style={[styles.actionBtn, styles.actionOut]}>
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.actionText}>Out</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {(["cars", "vans", "bikes", "buses"] as VehicleKey[]).map(renderCategory)}
      </ScrollView>

      {/* In popup (category chips, not dropdown) */}
      <EnterInModal
        visible={showIn}
        onClose={() => setShowIn(false)}
        categories={(Object.keys(space.counts) as VehicleKey[]).filter((k) => (space.counts[k] ?? 0) > 0)}
        onSubmit={async (payload) => {
          try {
            await checkInVehicle({
              parking_space_id: space.id,
              vehicle_no: payload.vehicleNo,
              category: payload.category,
              phone: payload.phone,
              in_time: payload.startTime, // "HH:MM"
            });
            handleCheckInLocal(payload);
            setShowIn(false);
          } catch (e: any) {
            Alert.alert("Check-in failed", e?.message || "Server error");
          }
        }}
      />

      {/* Out popup (WITH Verify, 3-digit PIN) */}
      <OutModal
        visible={showOut}
        onClose={() => setShowOut(false)}
        onVerify={verifyVehicle}
        onSubmit={async (payload) => {
          try {
            await checkOutVehicle({
              parking_space_id: space.id,
              vehicle_no: payload.vehicleNo,
              out_time: payload.endTime, // "HH:MM"
              pin: payload.pin, // 3-digit
            });

            handleCheckOutLocal({ vehicleNo: payload.vehicleNo });
            setShowOut(false);

            // @ts-ignore
            navigation.navigate("PaymentInfo", {
              parking_space_id: space.id,
              parkingName: space.parking_name,
              vehicleNo: payload.vehicleNo,
              startTime: payload.startTime,
              endTime: payload.endTime,
              pin: payload.pin,
              // ratePerHour: 200,
            });
          } catch (e: any) {
            Alert.alert("Check-out failed", e?.message || "Server error");
          }
        }}
      />
    </SafeAreaView>
  );
}

/* ---------- EnterIn Modal (category chips + scroll) ---------- */
function EnterInModal({
  visible,
  onClose,
  categories,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  categories: VehicleKey[];
  onSubmit: (p: { vehicleNo: string; category: VehicleKey; phone: string; startTime: string }) => void;
}) {
  const [vehicleNo, setVehicleNo] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState<VehicleKey | null>(null);

  const [timeOpen, setTimeOpen] = useState(false);
  const [startTime, setStartTime] = useState<string>("");

  useEffect(() => {
    if (visible) {
      setVehicleNo("");
      setPhone("");
      setCategory(null);
      setStartTime(nowHHMM());
    }
  }, [visible]);

  const submit = () => {
    if (!vehicleNo.trim() || !category || !startTime) {
      return Alert.alert("Missing", "Please fill Vehicle No, Category and Start Time.");
    }
    onSubmit({
      vehicleNo: vehicleNo.trim().toUpperCase(),
      category,
      phone: phone.trim(),
      startTime,
    });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={m.overlay} onPress={onClose} />
      <View style={m.wrap}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
          style={{ width: "100%" }}
        >
          <View style={m.card}>
            <ScrollView
              contentContainerStyle={m.cardScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={m.headerRow}>
                <View style={m.headerChip}>
                  <Ionicons name="log-in-outline" size={16} color="#fff" />
                </View>
                <Text style={m.title}>Check In</Text>
              </View>

              <Text style={m.label}>Vehicle No</Text>
              <TextInput
                value={vehicleNo}
                onChangeText={setVehicleNo}
                placeholder="e.g. CBA-1234"
                placeholderTextColor={SUB}
                autoCapitalize="characters"
                style={m.input}
              />

              <Text style={m.label}>Category</Text>
              <View style={m.chipsRow}>
                {categories.map((k) => {
                  const active = category === k;
                  return (
                    <Pressable
                      key={k}
                      onPress={() => setCategory(k)}
                      style={[m.catChip, active && m.catChipActive]}
                    >
                      <MaterialCommunityIcons
                        name={VEH_ICON[k]}
                        size={18}
                        color={active ? "#fff" : BRAND}
                      />
                      <Text style={[m.catChipText, active && m.catChipTextActive]}>
                        {VEH_LABEL[k]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={m.label}>Phone</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="07X-XXXXXXX"
                placeholderTextColor={SUB}
                keyboardType="phone-pad"
                style={m.input}
              />

              <Text style={m.label}>Start Time</Text>
              <Pressable style={[m.input, { justifyContent: "center" }]} onPress={() => setTimeOpen(true)}>
                <Text style={[m.inputText, { fontWeight: "700" }]}>{startTime || "Pick time"}</Text>
              </Pressable>

              <View style={m.rowBetween}>
                <Pressable onPress={onClose} style={m.ghostBtn}>
                  <Text style={m.ghostText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={submit} style={m.primaryBtn}>
                  <Text style={m.primaryText}>Enter</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>

      <DateTimePickerModal
        isVisible={timeOpen}
        mode="time"
        onConfirm={(d) => {
          const hh = String(d.getHours()).padStart(2, "0");
          const mm = String(d.getMinutes()).padStart(2, "0");
          setStartTime(`${hh}:${mm}`);
          setTimeOpen(false);
        }}
        onCancel={() => setTimeOpen(false)}
      />
    </Modal>
  );
}

/* ---------- Out Modal (3-digit PIN + scroll) ---------- */
function OutModal({
  visible,
  onClose,
  onSubmit,
  onVerify,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (p: { vehicleNo: string; startTime: string; endTime: string; pin: string }) => void;
  onVerify: (vehicleNo: string) => Promise<{
    success: true;
    active: boolean;
    in_time?: string;
  }>;
}) {
  const [vehicleNo, setVehicleNo] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [pin, setPin] = useState("");

  const [pickerMode, setPickerMode] = useState<"start" | "end">("start");
  const [timeOpen, setTimeOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const hiddenPinRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setVehicleNo("");
      setStartTime("");
      setEndTime("");
      setPin("");
      setPickerMode("start");
      setTimeOpen(false);
      setVerifying(false);
    }
  }, [visible]);

  const openPicker = (mode: "start" | "end") => {
    setPickerMode(mode);
    setTimeOpen(true);
  };

  const verify = async () => {
    const plate = vehicleNo.trim().toUpperCase();
    if (!plate) {
      Alert.alert("Missing", "Enter Vehicle No to verify.");
      return;
    }
    try {
      setVerifying(true);
      const res = await onVerify(plate); // calls lookup_vehicle.php
      if (res.active) {
        setStartTime(dbToHHMM(res.in_time) || "");
        setEndTime(nowHHMM()); // auto End to now
      } else {
        Alert.alert("Not inside", "This vehicle is not currently checked in.");
      }
    } catch (e: any) {
      Alert.alert("Verify failed", e?.message || "Server error");
    } finally {
      setVerifying(false);
    }
  };

  const submit = () => {
    if (!vehicleNo.trim() || !startTime || !endTime || !pin.trim()) {
      return Alert.alert("Missing", "Please fill Vehicle No, Start Time, End Time and PIN.");
    }
    onSubmit({
      vehicleNo: vehicleNo.trim().toUpperCase(),
      startTime,
      endTime,
      pin: pin.trim(), // 3-digit
    });
  };

  // Render 3 PIN boxes from current pin string
  const PinBoxes = () => {
    const cells = Array.from({ length: 3 }, (_, i) => pin[i] ?? "");
    return (
      <Pressable
        onPress={() => hiddenPinRef.current?.focus()}
        style={{ flexDirection: "row", gap: 12, alignSelf: "center", marginTop: 8 }}
      >
        {cells.map((c, i) => (
          <View
            key={i}
            style={[
              m.pinBox,
              { borderColor: c ? BRAND : BORDER, backgroundColor: c ? "#F0F6FF" : "#FFFFFF" },
            ]}
          >
            <Text style={m.pinChar}>{c || " "}</Text>
          </View>
        ))}
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={m.overlay} onPress={onClose} />
      <View style={m.wrap}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
          style={{ width: "100%" }}
        >
          <View style={m.card}>
            <ScrollView
              contentContainerStyle={m.cardScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={m.headerRow}>
                <View style={[m.headerChip, { backgroundColor: "#1F2B59" }]}>
                  <Ionicons name="log-out-outline" size={16} color="#fff" />
                </View>
                <Text style={m.title}>Check Out</Text>
              </View>

              <Text style={m.label}>Vehicle No</Text>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <TextInput
                  value={vehicleNo}
                  onChangeText={setVehicleNo}
                  placeholder="e.g. CBA-1234"
                  placeholderTextColor={SUB}
                  autoCapitalize="characters"
                  style={[m.input, { flex: 1, marginTop: 8 }]}
                />
                <Pressable onPress={verify} disabled={verifying} style={m.secondaryBtn}>
                  <Text style={m.secondaryText}>{verifying ? "..." : "Verify"}</Text>
                </Pressable>
              </View>

              <Text style={[m.label, { marginTop: 14 }]}>Start / End Time</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable style={[m.input, { flex: 1, justifyContent: "center" }]} onPress={() => openPicker("start")}>
                  <Text style={[m.inputText, { fontWeight: "700" }]}>{startTime || "Start Time"}</Text>
                </Pressable>
                <Pressable style={[m.input, { flex: 1, justifyContent: "center" }]} onPress={() => openPicker("end")}>
                  <Text style={[m.inputText, { fontWeight: "700" }]}>{endTime || "End Time"}</Text>
                </Pressable>
              </View>

              <Text style={[m.label, { marginTop: 14 }]}>PIN (3 digits)</Text>
              <PinBoxes />
              {/* Hidden input captures the real PIN */}
              <TextInput
                ref={hiddenPinRef}
                value={pin}
                onChangeText={(t) => setPin(t.replace(/[^\d]/g, "").slice(0, 3))}
                keyboardType="number-pad"
                maxLength={3}
                style={m.hiddenPin}
              />

              <View style={m.rowBetween}>
                <Pressable onPress={onClose} style={m.ghostBtn}>
                  <Text style={m.ghostText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={submit} style={m.primaryBtn}>
                  <Text style={m.primaryText}>Enter</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>

      <DateTimePickerModal
        isVisible={timeOpen}
        mode="time"
        onConfirm={(d) => {
          const hh = String(d.getHours()).padStart(2, "0");
          const mm = String(d.getMinutes()).padStart(2, "0");
          const ts = `${hh}:${mm}`;
          if (pickerMode === "start") setStartTime(ts);
          else setEndTime(ts);
          setTimeOpen(false);
        }}
        onCancel={() => setTimeOpen(false)}
      />
    </Modal>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  header: {
    height: 64,
    backgroundColor: BRAND,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  iconBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  title: { color: "#fff", fontSize: 18, fontWeight: "800", marginLeft: 6 },
  subtitle: { color: "#E5F0FF", fontSize: 12, marginLeft: 6, marginTop: 2 },

  actionsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 1,
  },
  actionIn: { backgroundColor: BRAND },
  actionOut: { backgroundColor: "#1F2B59" },
  actionText: { color: "#fff", fontWeight: "800" },

  section: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitleWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EEF6FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  sectionTitle: { color: INK, fontSize: 15, fontWeight: "800" },
  badges: { flexDirection: "row", gap: 8 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E7E7E7",
  },
  badgeText: { color: INK, fontSize: 12, fontWeight: "700" },

  slotWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  slot: {
    width: "14.6%",
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  slotSelected: { borderColor: BRAND, borderWidth: 2, backgroundColor: "#F2F7FF" },
  slotOccupied: { backgroundColor: BRAND, borderColor: BRAND },
  tickOverlay: {
    position: "absolute",
    right: 4,
    bottom: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
});

/* ---------- Modal styles ---------- */
const m = StyleSheet.create({
  overlay: { position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)" },
  wrap: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  card: {
    backgroundColor: "#F4F6FA",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    width: "100%",
    maxHeight: "100%", // <-- enables inner ScrollView to scroll
  },
  cardScrollContent: {
    paddingBottom: 6,
  },

  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  headerChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "900", color: INK },

  label: { color: SUB, fontSize: 12, marginTop: 8, marginLeft: 4 },

  input: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  inputText: { color: INK },

  // Category chips
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BRAND,
  },
  catChipActive: { backgroundColor: BRAND },
  catChipText: { color: BRAND, fontWeight: "800" },
  catChipTextActive: { color: "#fff" },

  rowBetween: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },

  primaryBtn: {
    backgroundColor: BRAND,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 120,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontWeight: "900" },

  secondaryBtn: {
    backgroundColor: BRAND,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 96,
  },
  secondaryText: { color: "#fff", fontWeight: "800" },

  ghostBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 120,
    alignItems: "center",
  },
  ghostText: { color: INK, fontWeight: "800" },

  // PIN UI (3 boxes)
  pinBox: {
    width: 42,
    height: 50,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pinChar: { fontSize: 20, fontWeight: "800", color: INK },
  hiddenPin: {
    position: "absolute",
    opacity: 0,
    height: 0,
    width: 0,
  },
});
