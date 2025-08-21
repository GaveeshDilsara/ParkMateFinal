// app/_layout.tsx (or wherever your RootLayout is)
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,         // 👈 hides the native header above your custom header
      }}
    />
  );
}
