// app/Login_Driver.tsx
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loginDriver } from "./api";

type Props = {
  onBack?: () => void;
  onLoginPress?: (identifier: string, password: string) => void;
  onGooglePress?: () => void;
  onSignupPress?: () => void; // optional; falls back to router.push
  headerImageUri?: string;
  loading?: boolean;
};

const BRAND = "#2F80ED";
const BG = "#F5F7FB";
const TEXT = "#111827";
const SUB = "#6B7280";
const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1550355291-bbee04a92027?q=80&w=1600&auto=format&fit=crop";

export default function LoginDriverUI({
  onBack,
  onLoginPress,
  onGooglePress,
  onSignupPress,
  headerImageUri = DEFAULT_IMAGE,
  loading: loadingProp = false,
}: Props) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [hide, setHide] = useState(true);
  const [loading, setLoading] = useState(false);

  const doLogin = async (id: string, pass: string) => {
    if (onLoginPress) return onLoginPress(id, pass);

    const cleanId = id.trim();
    if (!cleanId || !pass) {
      Alert.alert("Missing info", "Please enter your email/username and password.");
      return;
    }
    try {
      setLoading(true);
      const res = await loginDriver(cleanId, pass);
      await AsyncStorage.setItem("pm_driver", JSON.stringify(res.driver));
      // TODO: change to your driver landing route
      router.replace("/Driver_Home");
    } catch (e: any) {
      Alert.alert("Login failed", e?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding" }) as any}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            <View style={styles.headerWrap}>
              <ImageBackground
                source={{ uri: headerImageUri }}
                resizeMode="cover"
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={["rgba(255,255,255,0)", BG]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0.2 }}
                end={{ x: 0.5, y: 1 }}
              />
              <View style={styles.headerTopBar}>
                <Pressable
                  onPress={onBack ?? (() => router.back())}
                  hitSlop={12}
                  style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
                  android_ripple={{ color: "#E5E7EB", radius: 20 }}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <Ionicons name="chevron-back" size={22} color={TEXT} />
                </Pressable>
              </View>

              <View style={styles.titleBlock}>
                <Text style={styles.title}>Let’s get started</Text>
                <Text style={styles.subtitle}>
                  Sign up or log in to find out the best{"\n"}Place for you
                </Text>
              </View>
            </View>

            <View style={styles.form}>
              <TextInput
                placeholder="User Name / Email"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                returnKeyType="next"
              />

              <View style={styles.passwordWrap}>
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, { paddingRight: 44, marginTop: 12 }]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={hide}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={() => doLogin(identifier, password)}
                />
                <Pressable onPress={() => setHide((v) => !v)} style={styles.eyeBtn} hitSlop={8}>
                  <Ionicons
                    name={hide ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#6B7280"
                  />
                </Pressable>
              </View>

              <Pressable
                onPress={() => doLogin(identifier, password)}
                disabled={loading || loadingProp}
                style={({ pressed }) => [
                  styles.loginBtn,
                  pressed && { transform: [{ scale: 0.997 }] },
                  (loading || loadingProp) && { opacity: 0.7 },
                ]}
                android_ripple={{ color: "#1f6fd6" }}
              >
                <Text style={styles.loginText}>
                  {loading || loadingProp ? "Logging in..." : "Log in"}
                </Text>
              </Pressable>

              <Text style={styles.or}>Or</Text>

              <Pressable
                onPress={onGooglePress}
                style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.95 }]}
                android_ripple={{ color: "#E5E7EB" }}
              >
                <View style={styles.googleLeft}>
                  <FontAwesome name="google" size={18} color="#DB4437" />
                </View>
                <Text style={styles.googleText}>Log In with Google</Text>
              </Pressable>

              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Don’t Have an Account ? </Text>
                <Pressable
                  hitSlop={6}
                  onPress={onSignupPress ? onSignupPress : () => router.push("/SignUp_Driver")}
                >
                  <Text style={styles.signup}>sign up</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: BG },
  headerWrap: { height: 280, overflow: "hidden", backgroundColor: "#ddd" },
  headerTopBar: {
    height: 44,
    paddingHorizontal: 16,
    justifyContent: "center",
    marginTop: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  titleBlock: { position: "absolute", left: 24, right: 24, bottom: 16 },
  title: { fontSize: 26, fontWeight: "800", color: TEXT },
  subtitle: { marginTop: 4, color: SUB, fontSize: 13.5, lineHeight: 18 },
  form: { paddingHorizontal: 20, paddingTop: 10 },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.select({ ios: 14, android: 12 }) as number,
    fontSize: 15,
    color: TEXT,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  passwordWrap: { position: "relative" },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  loginBtn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,
    shadowColor: BRAND,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  loginText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  or: { textAlign: "center", marginVertical: 12, color: SUB, fontSize: 13.5 },
  googleBtn: {
    backgroundColor: "#EFEFEF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  googleLeft: {
    position: "absolute",
    left: 14,
    height: 20,
    width: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  googleText: { fontSize: 15, fontWeight: "600", color: TEXT },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  footerText: { fontSize: 13.5, color: SUB },
  signup: { fontSize: 13.5, fontWeight: "700", color: BRAND },
});
