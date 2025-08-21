// app/Login_Owner.tsx
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
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
import { loginOwner } from "./api";

/** ---- Routes in your navigator ---- */
type RootStackParamList = {
  Login_Owner: undefined;
  SignUp_Owner: undefined;
  Owner_Home: undefined; // <— must exist in your Stack.Navigator
};

/** ---- Optional props for reuse ---- */
type Props = {
  onBack?: () => void;
  onLogin?: (identifier: string, password: string) => Promise<void> | void;
  onGoogle?: () => void;
  onSignup?: () => void;
  headerImageUri?: string;
};

const BRAND = "#2F80ED";
const BG = "#F5F7FB";
const TEXT = "#111827";
const SUB = "#6B7280";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1550355291-bbee04a92027?q=80&w=1600&auto=format&fit=crop";

export default function Login_Owner({
  onBack,
  onLogin,
  onGoogle,
  onSignup,
  headerImageUri = DEFAULT_IMAGE,
}: Props) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [identifier, setIdentifier] = useState(""); // username OR email
  const [password, setPassword] = useState("");
  const [hide, setHide] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;

    const id = identifier.trim();
    if (!id || !password) {
      Alert.alert("Missing fields", "Enter your username or email and password.");
      return;
    }

    setLoading(true);
    try {
      // If a custom handler was passed in, use it; otherwise call PHP API
      if (onLogin) {
        await onLogin(id, password);
      } else {
        const res = await loginOwner(id, password); // { success: true, owner: {...} }
        // Persist for Owner_Home (optional but handy)
        await AsyncStorage.setItem("pm_owner", JSON.stringify(res.owner));
      }

      // ✅ Go to Owner_Home and remove Login from back stack
      navigation.replace("Owner_Home");
    } catch (e: any) {
      Alert.alert("Login failed", e?.message ?? "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            {/* Header image + fade + back */}
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
                  onPress={() => (onBack ? onBack() : navigation.goBack())}
                  hitSlop={12}
                  style={({ pressed }) => [
                    styles.backBtn,
                    pressed && { opacity: 0.6 },
                  ]}
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

            {/* Form */}
            <View style={styles.form}>
              <TextInput
                placeholder="User Name / Email"   // ← removed “/ Phone”
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
                  onSubmitEditing={handleLogin}
                />
                <Pressable
                  onPress={() => setHide((v) => !v)}
                  style={styles.eyeBtn}
                  hitSlop={8}
                >
                  <Ionicons
                    name={hide ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#6B7280"
                  />
                </Pressable>
              </View>

              <Pressable
                onPress={handleLogin}
                disabled={loading}
                style={({ pressed }) => [
                  styles.loginBtn,
                  pressed && { transform: [{ scale: 0.997 }] },
                  loading && { opacity: 0.7 },
                ]}
                android_ripple={{ color: "#1f6fd6" }}
              >
                <Text style={styles.loginText}>
                  {loading ? "Logging in..." : "Log in"}
                </Text>
              </Pressable>

              <Text style={styles.or}>Or</Text>

              <Pressable
                onPress={onGoogle}
                style={({ pressed }) => [
                  styles.googleBtn,
                  pressed && { opacity: 0.95 },
                ]}
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
                  onPress={() =>
                    onSignup ? onSignup() : navigation.navigate("SignUp_Owner")
                  }
                  hitSlop={6}
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

/* ---------------- Styles ---------------- */
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
