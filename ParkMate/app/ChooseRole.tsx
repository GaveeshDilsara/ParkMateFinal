// ChooseRole.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ReactNode } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

// 👇 Make sure these route names match your navigator
type RootStackParamList = {
  ChooseRole: undefined;
  Login_Owner: undefined; // screen that renders Login_Owner.tsx
  Login_Driver: undefined;
};

type Props = {
  onBack?: () => void;
  onPickDriver?: () => void;
  onPickOwner?: () => void;
};

const COLORS = {
  bg: "#F5F7FB",
  text: "#111827",
  sub: "#6B7280",
  brand: "#2F80ED",
  card: "#FFFFFF",
  shadow: "#000000",
};

export default function ChooseRole({
  onBack,
  onPickDriver,
  onPickOwner,
}: Props) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => (onBack ? onBack() : navigation.goBack())}
          hitSlop={12}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.6 },
          ]}
          android_ripple={{ color: "#E5E7EB", borderless: true, radius: 18 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </Pressable>
        <View />
      </View>

      {/* Heading */}
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome To</Text>
        <Text style={styles.brand}>ParkMate</Text>
        <Text style={styles.subtitle}>Choose how you’d like to use the app</Text>
      </View>

      {/* Cards */}
      <View style={styles.cards}>
        <CardButton
          icon={<ParkingWithCarIcon />}
          title="I'm a Driver"
          caption="Find parking near you"
          onPress={() =>
            onPickDriver ? onPickDriver() : navigation.navigate("Login_Driver")
          }
          testID="choose-driver"
        />
        <CardButton
          icon={<HomeWithCarIcon />}
          title="I'm a parking owner"
          caption="List your parkings and earn"
          onPress={() =>
            onPickOwner ? onPickOwner() : navigation.navigate("Login_Owner")
          }
          testID="choose-owner"
        />
      </View>
    </SafeAreaView>
  );
}

/* ---------- Reusable components ---------- */
function CardButton({
  icon,
  title,
  caption,
  onPress,
  testID,
}: {
  icon: ReactNode;
  title: string;
  caption: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        pressed && { transform: [{ scale: 0.995 }] },
      ]}
      android_ripple={{ color: "#E5E7EB" }}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.cardIcon}>{icon}</View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardCaption}>{caption}</Text>
    </Pressable>
  );
}

/* ---------- Icons ---------- */
function ParkingWithCarIcon() {
  return (
    <View style={styles.iconStack}>
      <MaterialCommunityIcons name="parking" size={60} color={COLORS.text} />
      <MaterialCommunityIcons
        name="car-side"
        size={38}
        color={COLORS.text}
        style={styles.iconOverlayBottomRight}
      />
    </View>
  );
}

function HomeWithCarIcon() {
  return (
    <View style={styles.iconStack}>
      <MaterialCommunityIcons
        name="home-outline"
        size={60}
        color={COLORS.text}
      />
      <MaterialCommunityIcons
        name="car-side"
        size={38}
        color={COLORS.text}
        style={styles.iconOverlayBottomLeft}
      />
    </View>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { height: 44, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 24, marginTop: 8, alignItems: "flex-start" },
  welcome: { fontSize: 24, fontWeight: "800", color: COLORS.text },
  brand: { fontSize: 28, fontWeight: "800", color: COLORS.brand, marginTop: 2 },
  subtitle: { marginTop: 12, fontSize: 14, color: COLORS.sub },
  cards: { paddingHorizontal: 20, marginTop: 20 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 18,
    marginVertical: 10,
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardIcon: { marginBottom: 8 },
  cardTitle: { fontSize: 20, fontWeight: "800", color: COLORS.text, textAlign: "center", marginTop: 4 },
  cardCaption: { marginTop: 6, fontSize: 13, color: COLORS.sub, textAlign: "center" },
  iconStack: { width: 76, height: 64, alignItems: "center", justifyContent: "center" },
  iconOverlayBottomRight: { position: "absolute", right: 0, bottom: -2 },
  iconOverlayBottomLeft: { position: "absolute", left: 0, bottom: -2 },
});
