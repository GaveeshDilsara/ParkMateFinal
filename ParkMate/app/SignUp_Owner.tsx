// app/SignUp_Owner.tsx
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
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
import { registerOwner } from "./api";

type RootStackParamList = { SignUp_Owner: undefined; Login_Owner: undefined };

type SubmitPayload = {
  full_name: string;
  username: string;
  password: string;
  email: string;
  nic: string;
  phone: string;
};

type Props = {
  onBack?: () => void;
  onGoogle?: () => void;
  onSubmit?: (payload: SubmitPayload) => void;
  headerImageUri?: string;
};

const BRAND = "#2F80ED";
const BG = "#F5F7FB";
const TEXT = "#111827";
const SUB = "#6B7280";
const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1550355291-bbee04a92027?q=80&w=1600&auto=format&fit=crop";

export default function SignUp_Owner({
  onBack,
  onGoogle,
  onSubmit,
  headerImageUri = DEFAULT_IMAGE,
}: Props) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // form state
  const [full_name, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [nic, setNic] = useState("");
  const [phone, setPhone] = useState("");
  const [hide, setHide] = useState(true);
  const [loading, setLoading] = useState(false);

  // Refs for scrolling/focus chaining
  const scrollRef = useRef<ScrollView | null>(null);
  const fullNameRef = useRef<TextInput | null>(null);
  const usernameRef = useRef<TextInput | null>(null);
  const passwordRef = useRef<TextInput | null>(null);
  const emailRef = useRef<TextInput | null>(null);
  const nicRef = useRef<TextInput | null>(null);
  const phoneRef = useRef<TextInput | null>(null);

  // Track Y positions for smooth scroll-to-focused-input (works on small screens)
  const yPos = useRef<Record<string, number>>({});
  const scrollTo = (key: string) => {
    const y = yPos.current[key] ?? 0;
    scrollRef.current?.scrollTo({
      y: Math.max(y - 80, 0), // lift a bit above the keyboard
      animated: true,
    });
  };

  const handleSubmit = async () => {
    const payload: SubmitPayload = {
      full_name: full_name.trim(),
      username: username.trim(),
      password,
      email: email.trim(),
      nic: nic.trim().toUpperCase(),
      phone: phone.trim(),
    };

    // quick client checks
    if (!payload.full_name) return Alert.alert("Required", "Please enter your full name.");
    if (!payload.username) return Alert.alert("Required", "Please enter a username.");
    if (!payload.password || payload.password.length < 6)
      return Alert.alert("Required", "Password must be at least 6 characters.");
    if (!payload.email) return Alert.alert("Required", "Please enter an email.");
    if (!payload.nic) return Alert.alert("Required", "Please enter NIC.");
    if (!payload.phone) return Alert.alert("Required", "Please enter phone number.");

    if (onSubmit) {
      onSubmit(payload);
      return;
    }

    if (loading) return;
    setLoading(true);
    try {
      await registerOwner(payload); // sends full_name to PHP
      Alert.alert("Success", "Account created. Please log in.", [
        { text: "OK", onPress: () => navigation.navigate("Login_Owner") },
      ]);
    } catch (e: any) {
      Alert.alert("Sign up failed", e?.message ?? "Server error");
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
                <Text style={styles.title}>Register Here</Text>
              </View>
            </View>

            {/* Scrollable form – fits any frame & stays above keyboard */}
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={[styles.form, { paddingBottom: 28 }]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              showsVerticalScrollIndicator={false}
            >
              {/* Full Name */}
              <View
                onLayout={(e) => (yPos.current.full_name = e.nativeEvent.layout.y)}
              >
                <TextInput
                  ref={fullNameRef}
                  placeholder="Full Name"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                  value={full_name}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  textContentType="name"
                  returnKeyType="next"
                  onFocus={() => scrollTo("fullName")}
                  onSubmitEditing={() => usernameRef.current?.focus()}
                />
              </View>

              {/* Username */}
              <View
                onLayout={(e) => (yPos.current.username = e.nativeEvent.layout.y)}
                style={{ marginTop: 12 }}
              >
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
                  returnKeyType="next"
                  onFocus={() => scrollTo("password")}
                  onSubmitEditing={() => emailRef.current?.focus()}
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
                  onSubmitEditing={() => nicRef.current?.focus()}
                />
              </View>

              {/* NIC */}
              <View
                onLayout={(e) => (yPos.current.nic = e.nativeEvent.layout.y)}
                style={{ marginTop: 12 }}
              >
                <TextInput
                  ref={nicRef}
                  placeholder="NIC"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                  value={nic}
                  onChangeText={(t) => setNic(t.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="next"
                  onFocus={() => scrollTo("nic")}
                  onSubmitEditing={() => phoneRef.current?.focus()}
                />
              </View>

              {/* Phone */}
              <View
                onLayout={(e) => (yPos.current.phone = e.nativeEvent.layout.y)}
                style={{ marginTop: 12 }}
              >
                <TextInput
                  ref={phoneRef}
                  placeholder="Phone number"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoCorrect={false}
                  textContentType="telephoneNumber"
                  returnKeyType="done"
                  onFocus={() => scrollTo("phone")}
                  onSubmitEditing={handleSubmit}
                />
              </View>

              {/* Submit */}
              <Pressable
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.signupBtn,
                  pressed && { transform: [{ scale: 0.997 }] },
                ]}
                android_ripple={{ color: "#1f6fd6" }}
              >
                <Text style={styles.signupText}>
                  {loading ? "Creating..." : "Sign up"}
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
