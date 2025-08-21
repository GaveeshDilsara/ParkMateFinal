// AfterSubmitting.tsx
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

type RootStackParamList = {
  AddSpaceDetails: undefined;
  SetTimeSlots: { initial?: string; onDone?: (value: string) => void };
  AfterSubmitting: undefined;
  Owner_Home: undefined; // 👈 added
};
type Nav = NativeStackNavigationProp<RootStackParamList>;

const C = {
  bg: "#F5F7FB",
  card: "#FFFFFF",
  text: "#111827",
  sub: "#6B7280",
  bar: "#2F80ED",
};

export default function AfterSubmitting() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Bar */}
      <View style={styles.appbar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.leftBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Submitted</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.card}>
          <Ionicons name="checkmark-circle" size={56} color={C.bar} />
          <Text style={styles.big}>Request Submitted!</Text>
          <Text style={styles.msg}>
            Your parking space details were sent for review. We’ll notify you once approved.
          </Text>

          {/* 👉 Forward button */}
          <Pressable
            onPress={() => navigation.navigate("Owner_Home")}
            style={({ pressed }) => [
              styles.btn,
              pressed && { transform: [{ scale: 0.997 }] },
            ]}
          >
            <Text style={styles.btnText}>Continue</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  appbar: {
    height: 48,
    backgroundColor: C.bar,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  leftBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, textAlign: "center", color: "#fff", fontWeight: "800", fontSize: 18, marginRight: 36 },
  body: { flex: 1, padding: 16, alignItems: "center", justifyContent: "center" },
  card: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  big: { marginTop: 10, fontSize: 20, fontWeight: "800", color: C.text },
  msg: { marginTop: 6, color: C.sub, textAlign: "center" },
  btn: {
    marginTop: 16,
    backgroundColor: C.bar,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  btnText: { color: "#fff", fontWeight: "800" },
});
