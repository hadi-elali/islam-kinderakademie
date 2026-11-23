import { Href, useRouter } from "expo-router";
import type { ReactNode } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { BrandMark } from "@/components/brand-mark";
import {
  AppText,
  Card,
  PageScaffold,
  Pill,
} from "@/components/ui/primitives";
import { Layout, Palette, Radius, Space } from "@/constants/design";
import { useAuth } from "@/context/auth-context";

export type LegalPlaceholderField = {
  label: string;
  placeholder: string;
  href?: string;
  content?: ReactNode;
};

type LegalPlaceholderProps = {
  title: string;
  description: string;
  fields: LegalPlaceholderField[];
  isPlaceholder?: boolean;
};

export function LegalPlaceholder({
  title,
  description,
  fields,
  isPlaceholder = true,
}: LegalPlaceholderProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { isAuthenticated } = useAuth();
  const compact = width < Layout.compactBreakpoint;

  const open = (href: string) => router.push(href as Href);

  const legalContent = (
    <>
      {isPlaceholder && (
        <Card tone="sun" style={styles.notice}>
          <AppText variant="bodyStrong">
            Noch nicht veröffentlichungsfertig
          </AppText>
          <AppText color={Palette.inkSoft}>
            Die folgenden Platzhalter müssen vor der Veröffentlichung durch
            vollständige, rechtlich geprüfte Angaben ersetzt werden.
          </AppText>
        </Card>
      )}

      <Card style={styles.fieldsCard}>
        {fields.map((field, index) => (
          <View
            key={field.label}
            style={[
              styles.field,
              index < fields.length - 1 && styles.fieldWithBorder,
            ]}
          >
            <AppText variant="label" color={Palette.forest}>
              {field.label}
            </AppText>
            {field.content ?? (field.href ? (
              <Pressable
                accessibilityRole="link"
                onPress={() => void Linking.openURL(field.href!)}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <AppText color={Palette.forest} style={styles.linkText}>
                  {field.placeholder}
                </AppText>
              </Pressable>
            ) : (
              <AppText color={Palette.inkSoft}>{field.placeholder}</AppText>
            ))}
          </View>
        ))}
      </Card>
    </>
  );

  if (isAuthenticated) {
    return (
      <PageScaffold
        eyebrow="RECHTLICHES"
        title={title}
        description={description}
      >
        <View style={styles.authenticatedContent}>{legalContent}</View>
      </PageScaffold>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.pageContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, compact && styles.headerCompact]}>
        <Pressable accessibilityRole="link" onPress={() => open("/")}>
          <BrandMark dark />
        </Pressable>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.canGoBack() ? router.back() : open("/")}
          style={({ pressed }) => [
            styles.homeLink,
            pressed && styles.pressed,
          ]}
        >
          <AppText variant="bodyStrong" color={Palette.forest}>
            {router.canGoBack() ? "Zurück" : "Zur Startseite"}
          </AppText>
        </Pressable>
      </View>

      <View style={[styles.content, compact && styles.contentCompact]}>
        <View style={styles.heading}>
          <Pill tone={isPlaceholder ? "sun" : "mint"}>
            {isPlaceholder ? "PLATZHALTER" : "RECHTLICHES"}
          </Pill>
          <AppText variant={compact ? "title" : "display"}>{title}</AppText>
          <AppText color={Palette.inkSoft} style={styles.description}>
            {description}
          </AppText>
        </View>

        {legalContent}
      </View>

      <View style={[styles.footer, compact && styles.footerCompact]}>
        <AppText variant="small" color={Palette.muted}>
          © {new Date().getFullYear()} Islam-Kinderakademie
        </AppText>
        <View style={styles.footerLinks}>
          <LegalLink label="Impressum" onPress={() => open("/impressum")} />
          <LegalLink
            label="Datenschutz"
            onPress={() => open("/datenschutz")}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function LegalLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <AppText variant="small" color={Palette.forest} style={styles.linkText}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Palette.cream },
  pageContent: { alignItems: "center", minHeight: "100%" },
  header: {
    width: "100%",
    maxWidth: 1040,
    minHeight: 82,
    paddingHorizontal: Space.xxl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerCompact: { minHeight: 72, paddingHorizontal: Space.lg },
  homeLink: {
    minHeight: 44,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    width: "100%",
    maxWidth: 880,
    paddingHorizontal: Space.xxl,
    paddingTop: 64,
    paddingBottom: 72,
    gap: Space.xl,
  },
  contentCompact: {
    paddingHorizontal: Space.lg,
    paddingTop: Space.xxl,
    paddingBottom: Space.huge,
  },
  heading: { alignItems: "flex-start", gap: Space.lg },
  description: { maxWidth: 720, fontSize: 17, lineHeight: 26 },
  authenticatedContent: { gap: Space.xl },
  notice: { gap: Space.sm },
  fieldsCard: { paddingVertical: 0 },
  field: { paddingVertical: Space.xl, gap: Space.sm },
  fieldWithBorder: { borderBottomWidth: 1, borderBottomColor: Palette.line },
  footer: {
    width: "100%",
    maxWidth: 1040,
    minHeight: 100,
    marginTop: "auto",
    paddingHorizontal: Space.xxl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: Palette.line,
  },
  footerCompact: {
    minHeight: 120,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.lg,
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: Space.md,
  },
  footerLinks: { flexDirection: "row", flexWrap: "wrap", gap: Space.xl },
  linkText: { textDecorationLine: "underline" },
  pressed: { opacity: 0.68 },
});
