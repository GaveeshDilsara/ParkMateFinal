// app/SetTimeSlots.tsx — brand-forward • sequential Start→End • persisted • pretty range pill (robust reopen via onHide)
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // ✅ NEW

type DaySlot = {
  day: string;
  enabled: boolean;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
};

const STORAGE_KEY = "pm_timeSlots";
const SUMMARY_KEY = "pm_timeSummary";
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"] as const;
const BRAND = "#2F80ED";

// ---- Helpers ----
const toHHmm = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

const to12h = (t: string) => {
  if (!t) return "--:--";
  const [h, m] = t.split(":").map(Number);
  const am = h < 12;
  const hr = ((h + 11) % 12) + 1;
  return `${hr}:${String(m).padStart(2, "0")} ${am ? "AM" : "PM"}`;
};

const mins = (t: string) => {
  if (!t) return NaN;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const dateFromHHmm = (t?: string) => {
  const d = new Date();
  if (t && /^\d{2}:\d{2}$/.test(t)) {
    const [h, m] = t.split(":").map(Number);
    d.setHours(h, m, 0, 0);
  } else {
    d.setSeconds(0, 0);
    d.setMilliseconds(0);
  }
  return d;
};

// Build a pretty, grouped summary like: "Mon–Fri 9:00 AM — 5:00 PM; Sat 10:00 AM — 2:00 PM; Sun Closed"
function buildSummary(rows: DaySlot[]): string {
  const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"] as const;
  const short: Record<(typeof DAYS)[number], string> = {
    Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu",
    Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
  } as const;

  // label for enabled days, null for disabled
  const labels = rows.map(r =>
    r.enabled && r.startTime && r.endTime
      ? `${to12h(r.startTime)} — ${to12h(r.endTime)}`
      : null
  );

  type Run = { startIdx: number; endIdx: number; label: string };
  const runs: Run[] = [];
  let i = 0;
  while (i < DAYS.length) {
    if (labels[i] == null) { i++; continue; }
    const label = labels[i]!;
    let j = i;
    while (j + 1 < DAYS.length && labels[j + 1] === label) j++;
    runs.push({ startIdx: i, endIdx: j, label });
    i = j + 1;
  }

  if (!runs.length) return "";

  const parts = runs.map(run => {
    const startDay = short[rows[run.startIdx].day as keyof typeof short];
    const endDay = short[rows[run.endIdx].day as keyof typeof short];
    const daySpan = run.startIdx === run.endIdx ? startDay : `${startDay}–${endDay}`;
    return `${daySpan} ${run.label}`;
  });

  return parts.join("; ");
}

export default function SetTimeSlots() {
  const insets = useSafeAreaInsets();                 // ✅ NEW
  const [footerH, setFooterH] = useState(0);          // ✅ NEW

  const [local, setLocal] = useState<DaySlot[]>(
    DAYS.map((day) => ({ day, enabled: false, startTime: "", endTime: "" }))
  );
  const [loading, setLoading] = useState(true);

  // time picker state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<"start" | "end">("start");
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  // used to re-open the picker for End only after the Start picker fully hides
  const [pendingStep, setPendingStep] = useState<null | { idx: number; mode: "start" | "end" }>(null);

  // Load saved slots on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as DaySlot[];
          if (Array.isArray(parsed) && parsed.length === 7) {
            setLocal(parsed);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openPicker = (idx: number, mode: "start" | "end") => {
    if (mode === "end" && !local[idx].startTime) {
      Alert.alert("Pick start first", "Please set a start time before the end time.");
      setActiveIdx(idx);
      setPickerMode("start");
      setPickerVisible(true);
      return;
    }
    setActiveIdx(idx);
    setPickerMode(mode);
    setPickerVisible(true);
  };

  const onConfirm = (date: Date) => {
    if (activeIdx == null) {
      setPickerVisible(false);
      return;
    }
    const value = toHHmm(date);

    if (pickerMode === "start") {
      setLocal((prev) => {
        const copy = [...prev];
        const row = { ...copy[activeIdx] };
        row.startTime = value;
        if (!row.endTime) {
          const startM = mins(value);
          const seededM = isNaN(startM) ? 17 * 60 : startM + 60; // +1h default
          const hh = String(Math.floor((seededM / 60) % 24)).padStart(2, "0");
          const mm = String(seededM % 60).padStart(2, "0");
          row.endTime = `${hh}:${mm}`;
        }
        copy[activeIdx] = row;
        return copy;
      });

      setPendingStep({ idx: activeIdx, mode: "end" });
      setPickerVisible(false);
      return;
    }

    // pickerMode === "end"
    setLocal((prev) => {
      const copy = [...prev];
      const row = { ...copy[activeIdx] };
      const startM = mins(row.startTime);
      const endM = mins(value);

      if (!isNaN(startM) && !isNaN(endM) && endM <= startM) {
        setPickerVisible(false);
        Alert.alert("Invalid time", "End time must be after the start time.");
        return prev;
      }

      row.endTime = value;
      copy[activeIdx] = row;
      return copy;
    });

    setPickerVisible(false);
  };

  const onHide = () => {
    if (pendingStep) {
      setActiveIdx(pendingStep.idx);
      setPickerMode(pendingStep.mode);
      setPendingStep(null);
      setTimeout(() => setPickerVisible(true), 0);
    }
  };

  const toggleEnabled = (idx: number, enabled: boolean) => {
    setLocal((prev) => {
      const copy = [...prev];
      const row = { ...copy[idx], enabled };
      if (enabled && !row.startTime && !row.endTime) {
        row.startTime = "09:00";
        row.endTime = "17:00";
      }
      copy[idx] = row;
      return copy;
    });
  };

  const saveAndBack = async () => {
    // Validate enabled rows
    const bad = local.find(
      (r) =>
        r.enabled &&
        (!r.startTime || !r.endTime || isNaN(mins(r.startTime)) || isNaN(mins(r.endTime)) || mins(r.endTime) <= mins(r.startTime))
    );
    if (bad) {
      Alert.alert(
        "Fix times",
        `Please set a valid Start and End for ${bad.day}. End must be after Start.`
      );
      return;
    }

    try {
      // Persist the raw rows
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(local));

      // Build & persist the pretty summary string
      const summary = buildSummary(local);
      await AsyncStorage.setItem(SUMMARY_KEY, summary);

      router.back();
    } catch {
      Alert.alert("Error", "Could not save time slots.");
    }
  };

  const prettyRange = (row: DaySlot) =>
    row.enabled && row.startTime && row.endTime
      ? `${to12h(row.startTime)} — ${to12h(row.endTime)}`
      : "";

  // initial time to show in the picker for better UX
  const pickerDate = useMemo(() => {
    if (activeIdx == null) return new Date();
    const row = local[activeIdx];
    return dateFromHHmm(pickerMode === "start" ? row.startTime : row.endTime);
  }, [activeIdx, pickerMode, local]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set Availability</Text>
        <View style={styles.headerBtn} />
      </View>

      {/* Days list */}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          // ✅ Make sure content isn't hidden behind the sticky footer
          { paddingBottom: footerH + 16 + insets.bottom },
        ]}
      >
        {local.map((row, idx) => {
          const range = prettyRange(row);
          const showRange = !!range;
          return (
            <View key={row.day} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.day}>{row.day}</Text>
                <View style={styles.switchWrap}>
                  <Text style={styles.enabledLabel}>{row.enabled ? "Enabled" : "Disabled"}</Text>
                  <Switch
                    value={row.enabled}
                    onValueChange={(v) => toggleEnabled(idx, v)}
                    trackColor={{ true: BRAND, false: "#CBD5E1" }}
                    thumbColor="#fff"
                  />
                </View>
              </View>

              <View style={styles.timesRow}>
                <TouchableOpacity
                  style={[styles.timeBtn, !row.enabled && styles.disabledBtn]}
                  onPress={() => row.enabled && openPicker(idx, "start")}
                  disabled={!row.enabled || loading}
                >
                  <Ionicons name="time-outline" size={16} color={BRAND} />
                  <Text style={styles.timeText}>
                    {row.startTime ? to12h(row.startTime) : "Start"}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.toText}>to</Text>

                <TouchableOpacity
                  style={[styles.timeBtn, !row.enabled && styles.disabledBtn]}
                  onPress={() => row.enabled && openPicker(idx, "end")}
                  disabled={!row.enabled || loading}
                >
                  <Ionicons name="time-outline" size={16} color={BRAND} />
                  <Text style={styles.timeText}>
                    {row.endTime ? to12h(row.endTime) : "End"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Pretty range pill */}
              {showRange && (
                <View style={styles.rangePill}>
                  <Ionicons name="calendar-outline" size={14} color={BRAND} />
                  <Text style={styles.rangeText}>{range}</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Footer (sticky, safe-area aware) */}
      <View
        style={[
          styles.footer,
          { paddingBottom: 12 + insets.bottom },      // ✅ safe-area bottom
        ]}
        onLayout={(e) => setFooterH(e.nativeEvent.layout.height)} // ✅ measure to pad scroll
      >
        <TouchableOpacity style={styles.saveBtnFull} onPress={saveAndBack} disabled={loading}>
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Time Picker */}
      <DateTimePickerModal
        isVisible={pickerVisible}
        mode="time"
        is24Hour={false}
        date={pickerDate}          // show current value for better UX
        onConfirm={onConfirm}
        onCancel={() => setPickerVisible(false)}
        onHide={onHide}            // reopen End after Start closes
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  header: {
    backgroundColor: BRAND,
    padding: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, color: "#fff", fontWeight: "800" },

  content: { padding: 16 },

  card: {
    borderWidth: 1,
    borderColor: "#E4ECFF",
    backgroundColor: "#F8FBFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  day: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  switchWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  enabledLabel: { marginRight: 4, color: "#334155", fontWeight: "700", fontSize: 12.5 },

  // ✅ responsive time buttons row
  timesRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  timeBtn: {
    flex: 1,                   // ✅ make them share width
    minWidth: 0,               // ✅ allow shrinking on narrow screens
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D6E6FF",
    backgroundColor: "#FFFFFF",
  },
  disabledBtn: { opacity: 0.5 },
  timeText: { color: "#0F172A", fontWeight: "700" },
  toText: { marginHorizontal: 10, color: "#6B7280", fontWeight: "700" },

  // Pretty range pill
  rangePill: {
    marginTop: 10,
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
  rangeText: { color: BRAND, fontWeight: "800", fontSize: 12.5 },

  // ✅ sticky footer
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#EEF2F6",
  },
  // ✅ full-width, comfy CTA that fits any device
  saveBtnFull: {
    width: "100%",
    minHeight: 50,
    backgroundColor: BRAND,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  saveText: { color: "#fff", fontWeight: "800" },
});
