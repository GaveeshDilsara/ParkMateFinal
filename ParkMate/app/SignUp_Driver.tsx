// app/SignUp_Driver.tsx
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerDriver } from "./api";

export type SubmitPayload = {
  username: string;
  email: string;
  password: string;
};

type Props = {
  onBack?: () => void;
  onGooglePress?: () => void;
  onSubmitPress?: (payload: SubmitPayload) => void;
  headerImageUri?: string;
  loading?: boolean;
  initial?: Partial<SubmitPayload>;
};

const BRAND = "#2F80ED";
const BG = "#F5F7FB";
const TEXT = "#111827";
const SUB = "#6B7280";
const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1550355291-bbee04a92027?q=80&w=1600&auto=format&fit=crop";

export default function SignUpDriverUI({
  onBack,
  onGooglePress,
  onSubmitPress,
  headerImageUri = DEFAULT_IMAGE,
  loading: loadingProp = false,
  initial = {},
}: Props) {
  const [username, setUsername] = useState(initial.username ?? "");
  const [email, setEmail] = useState(initial.email ?? "");
  const [password, setPassword] = useState(initial.password ?? "");
  const [hide, setHide] = useState(true);
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef<ScrollView | null>(null);
  const usernameRef = useRef<TextInput | null>(null);
  const emailRef = useRef<TextInput | null>(null);
  const passwordRef = useRef<TextInput | null>(null);

  const yPos = useRef<Record<string, number>>({});
  const scrollTo = (key: string) => {
    const y = yPos.current[key] ?? 0;
    scrollRef.current?.scrollTo({ y: Math.max(y - 80, 0), animated: true });
  };

  const handleSubmit = async () => {
    const payload: SubmitPayload = {
      username: username.trim(),
      email: email.trim(),
      password,
    };
    if (onSubmitPress) return onSubmitPress(payload);

    if (!payload.username || !payload.email || !payload.password) {
      Alert.alert("Missing info", "Username, email, and password are required.");
      return;
    }
    // quick email check
    if (!/^\S+@\S+\.\S+$/.test(payload.email)) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    if (payload.password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      const res = await registerDriver(payload);
      // store minimal info if you want instant session after signup (optional)
      await AsyncStorage.setItem(
        "pm_driver_prefill",
        JSON.stringify({ identifier: res.username })
      );
      Alert.alert("Success", "Account created! Please log in.", [
        { text: "OK", onPress: () => router.replace("/Login_Driver") },
      ]);
    } catch (e: any) {
      Alert.alert("Sign up failed", e?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: "padding", android: "height" })}
        keyboardVerticalOffset={0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            {/* Header image */}
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
                <Text style={styles.title}>Register Here</Text>
              </View>
            </View>

            {/* Scrollable form */}
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={[styles.form, { paddingBottom: 28 }]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              showsVerticalScrollIndicator={false}
            >
              {/* Username */}
              <View onLayout={(e) => (yPos.current.username = e.nativeEvent.layout.y)}>
                <TextInput
                  ref={usernameRef}
                  placeholder="User Name"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="username"
                  returnKeyType="next"
                  onFocus={() => scrollTo("username")}
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>

              {/* Email */}
              <View
                onLayout={(e) => (yPos.current.email = e.nativeEvent.layout.y)}
                style={{ marginTop: 12 }}
              >
                <TextInput
                  ref={emailRef}
                  placeholder="Email"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  onFocus={() => scrollTo("email")}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>

              {/* Password */}
              <View
                onLayout={(e) => (yPos.current.password = e.nativeEvent.layout.y)}
                style={styles.passwordWrap}
              >
                <TextInput
                  ref={passwordRef}
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, { paddingRight: 44, marginTop: 12 }]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={hide}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                  returnKeyType="done"
                  onFocus={() => scrollTo("password")}
                  onSubmitEditing={handleSubmit}
                />
                <Pressable onPress={() => setHide((v) => !v)} style={styles.eyeBtn} hitSlop={8}>
                  <Ionicons
                    name={hide ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#6B7280"
                  />
                </Pressable>
              </View>

              {/* Submit */}
              <Pressable
                onPress={handleSubmit}
                disabled={loading || loadingProp}
                style={({ pressed }) => [
                  styles.signupBtn,
                  pressed && { transform: [{ scale: 0.997 }] },
                  (loading || loadingProp) && { opacity: 0.7 },
                ]}
                android_ripple={{ color: "#1f6fd6" }}
              >
                <Text style={styles.signupText}>
                  {loading || loadingProp ? "Creating..." : "Sign up"}
                </Text>
              </Pressable>

              <Text style={styles.or}>Or</Text>

              {/* Google OAuth */}
              <Pressable
                onPress={onGooglePress}
                style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.95 }]}
                android_ripple={{ color: "#E5E7EB" }}
              >
                <View style={styles.googleLeft}>
                  <FontAwesome name="google" size={18} color="#DB4437" />
                </View>
                <Text style={styles.googleText}>Sign up with Google</Text>
              </Pressable>
            </ScrollView>
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

  form: { paddingHorizontal: 20, paddingTop: 10 },

  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 16,
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

  signupBtn: {
    backgroundColor: BRAND,
    borderRadius: 22,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,
    shadowColor: BRAND,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  signupText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  or: { textAlign: "center", marginVertical: 12, color: SUB, fontSize: 13.5 },

  googleBtn: {
    backgroundColor: "#EFEFEF",
    borderRadius: 22,
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
});
