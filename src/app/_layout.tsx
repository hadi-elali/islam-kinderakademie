import { Href, Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppShell } from "@/components/app-shell";
import { BrandMark } from "@/components/brand-mark";
import { PrivacyGate } from "@/components/privacy-gate";
import { Palette } from "@/constants/design";
import { AcademyProvider, useAcademy } from "@/context/academy-context";
import { AcademyDataProvider } from "@/context/academy-data-context";
import { AuthProvider, useAuth } from "@/context/auth-context";
import { PrivacyProvider, usePrivacy } from "@/context/privacy-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AcademyProvider>
          <PrivacyProvider>
            <AcademyDataProvider>
              <RootNavigator />
            </AcademyDataProvider>
          </PrivacyProvider>
        </AcademyProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { isAuthenticated, isInitializing, isProfileLoading, profile } =
    useAuth();
  const { activeRole } = useAcademy();
  const { canLoadAcademyData } = usePrivacy();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const isPublicEntry =
      pathname === "/" ||
      pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/passwort-vergessen";

    if (
      !isInitializing &&
      !isProfileLoading &&
      isAuthenticated &&
      isPublicEntry
    ) {
      router.replace("/dashboard" as Href);
    }
  }, [isAuthenticated, isInitializing, isProfileLoading, pathname, router]);

  const isLoadingInitialProfile =
    isAuthenticated && isProfileLoading && !profile;

  // Privacy information must be readable before authentication initializes,
  // including in the generated HTML when JavaScript is unavailable.
  const isPrivacyPage = pathname === '/datenschutz';
  if ((isInitializing || isLoadingInitialProfile) && !isPrivacyPage) {
    return (
      <View style={styles.loadingScreen}>
        <BrandMark dark={true} style={{width: 200}}/>
        <ActivityIndicator color={Palette.forest} size="small" />
      </View>
    );
  }

  const canManagePrivacy = pathname === '/datenschutz' || pathname === '/impressum' || pathname === '/account';
  if (isAuthenticated && !canLoadAcademyData && !canManagePrivacy) {
    return <PrivacyGate />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <AppShell>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Palette.cream },
            animation: "fade",
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="impressum" />
          <Stack.Screen name="datenschutz" />

          <Stack.Protected guard={!isAuthenticated}>
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="passwort-vergessen" />
          </Stack.Protected>

          <Stack.Protected guard={isAuthenticated}>
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="kalender" />
            <Stack.Screen name="mitteilungen" />
            <Stack.Screen name="mitteilung/[id]" />
            <Stack.Screen name="account" />

            <Stack.Protected guard={activeRole === "child"}>
              <Stack.Screen name="lernreisen" />
              <Stack.Screen name="islam-pass" />
              <Stack.Screen name="lektion/[id]" />
              <Stack.Screen name="quiz/[lessonId]" />
            </Stack.Protected>

            <Stack.Protected guard={activeRole === "parent"}>
              <Stack.Screen name="kinder" />
            </Stack.Protected>

            <Stack.Protected guard={activeRole === "team"}>
              <Stack.Screen name="curriculum" />
              <Stack.Screen name="lektionen" />
              <Stack.Screen name="lektion-neu" />
              <Stack.Screen name="quiz-bearbeiten" />
              <Stack.Screen name="gruppen" />
              <Stack.Screen name="medien" />
              <Stack.Screen name="abzeichen" />
              <Stack.Screen name="abgaben" />

              <Stack.Protected guard={profile?.role === "admin"}>
                <Stack.Screen name="konten" />
              </Stack.Protected>
            </Stack.Protected>
          </Stack.Protected>
        </Stack>
      </AppShell>
    </>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    backgroundColor: Palette.cream,
  },
});
