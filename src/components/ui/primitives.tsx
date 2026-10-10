import { ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";

import { AppIcon, AppIconName } from "@/components/ui/app-icon";
import { Layout, Palette, Radius, Space } from "@/constants/design";

type AppTextVariant =
  | "display"
  | "title"
  | "heading"
  | "body"
  | "bodyStrong"
  | "small"
  | "label";

type AppTextProps = {
  children: ReactNode;
  variant?: AppTextVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  selectable?: boolean;
};

export function AppText({
  children,
  variant = "body",
  color = Palette.ink,
  style,
  numberOfLines,
  selectable,
}: AppTextProps) {
  return (
    <Text
      numberOfLines={numberOfLines}
      selectable={selectable}
      style={[textStyles.base, textStyles[variant], { color }, style]}
    >
      {children}
    </Text>
  );
}

type CardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: "paper" | "mint" | "sun" | "sky" | "coral" | "dark";
  padded?: boolean;
};

const cardTones = {
  paper: Palette.paper,
  mint: Palette.mint,
  sun: Palette.sunSoft,
  sky: Palette.skySoft,
  coral: Palette.coralSoft,
  dark: Palette.forestDark,
};

export function Card({
  children,
  style,
  tone = "paper",
  padded = true,
}: CardProps) {
  const { width } = useWindowDimensions();
  const compact = width < Layout.compactBreakpoint;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: cardTones[tone] },
        padded && styles.cardPadded,
        padded && compact && styles.cardPaddedCompact,
        tone === "paper" && styles.paperBorder,
        style,
      ]}
    >
      {children}
    </View>
  );
}

type ButtonVariant = "primary" | "secondary" | "quiet" | "dark";

type ActionButtonProps = {
  label: string;
  onPress?: () => void;
  icon?: AppIconName;
  variant?: ButtonVariant;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  lableStyle?: StyleProp<TextStyle>;
};

const buttonColors: Record<
  ButtonVariant,
  { background: string; text: string; border: string }
> = {
  primary: {
    background: Palette.forest,
    text: Palette.white,
    border: Palette.forest,
  },
  secondary: {
    background: Palette.paper,
    text: Palette.ink,
    border: Palette.line,
  },
  quiet: {
    background: "transparent",
    text: Palette.forest,
    border: "transparent",
  },
  dark: { background: Palette.ink, text: Palette.white, border: Palette.ink },
};

export function ActionButton({
  label,
  onPress,
  icon,
  variant = "primary",
  disabled = false,
  compact = false,
  style,
  lableStyle,
}: ActionButtonProps) {
  const colors = buttonColors[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: colors.background, borderColor: colors.border },
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      {icon && (
        <AppIcon name={icon} size={compact ? 17 : 19} color={colors.text} />
      )}
      <AppText
        variant="bodyStrong"
        color={colors.text}
        style={[
          styles.buttonText,
          compact && styles.buttonTextCompact,
          lableStyle,
        ]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

type PillProps = {
  children: ReactNode;
  tone?: "mint" | "sun" | "sky" | "coral" | "neutral";
  icon?: AppIconName;
};

const pillTones = {
  mint: { background: Palette.mint, text: Palette.forest },
  sun: { background: Palette.sunSoft, text: "#735817" },
  sky: { background: Palette.skySoft, text: "#2E6474" },
  coral: { background: Palette.coralSoft, text: "#84412F" },
  neutral: { background: "#EEF1EF", text: Palette.inkSoft },
};

export function Pill({ children, tone = "neutral", icon }: PillProps) {
  const colors = pillTones[tone];
  return (
    <View style={[styles.pill, { backgroundColor: colors.background }]}>
      {icon && <AppIcon name={icon} size={14} color={colors.text} />}
      <AppText variant="label" color={colors.text}>
        {children}
      </AppText>
    </View>
  );
}

type PageScaffoldProps = {
  children: ReactNode;
  title?: string;
  titleStyle?: StyleProp<TextStyle>;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
  actionAbove?: boolean;
};

export function PageScaffold({
  children,
  title,
  titleStyle,
  eyebrow,
  description,
  action,
  actionAbove = false,
}: PageScaffoldProps) {
  const { width } = useWindowDimensions();
  const compact = width < Layout.compactBreakpoint;

  return (
    <ScrollView
      style={styles.pageScroll}
      contentContainerStyle={[
        styles.pageScrollContent,
        compact && styles.pageScrollContentCompact,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
    >
      <View style={styles.pageInner}>
        {(title || eyebrow || description || action) && (
          <View
            style={[
              styles.pageHeader,
              compact && styles.pageHeaderCompact,
              actionAbove && styles.pageHeaderActionAbove,
            ]}
          >
            <View style={styles.pageHeadingCopy}>
              {eyebrow && (
                <AppText
                  variant="label"
                  color={Palette.forest}
                  style={styles.eyebrow}
                >
                  {eyebrow}
                </AppText>
              )}
              {title && (
                <AppText
                  variant={compact ? "title" : "display"}
                  style={titleStyle}
                >
                  {title}
                </AppText>
              )}
              {description && (
                <AppText color={Palette.inkSoft} style={styles.description}>
                  {description}
                </AppText>
              )}
            </View>
            {action}
          </View>
        )}
        {children}
      </View>
    </ScrollView>
  );
}

type SectionHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function SectionHeader({
  title,
  description,
  action,
}: SectionHeaderProps) {
  const { width } = useWindowDimensions();
  const compact = width < Layout.compactBreakpoint;

  return (
    <View
      style={[styles.sectionHeader, compact && styles.sectionHeaderCompact]}
    >
      <View style={styles.sectionHeaderCopy}>
        <AppText variant="heading">{title}</AppText>
        {description && (
          <AppText color={Palette.inkSoft}>{description}</AppText>
        )}
      </View>
      {action}
    </View>
  );
}

type EmptyStateProps = {
  icon: AppIconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}: EmptyStateProps) {
  return (
    <View style={[styles.emptyState, compact && styles.emptyStateCompact]}>
      <View style={styles.emptyIcon}>
        <AppIcon name={icon} size={compact ? 25 : 30} color={Palette.forest} />
      </View>
      <AppText
        variant={compact ? "bodyStrong" : "heading"}
        style={styles.emptyTitle}
      >
        {title}
      </AppText>
      <AppText color={Palette.inkSoft} style={styles.emptyDescription}>
        {description}
      </AppText>
      {actionLabel && onAction && (
        <ActionButton
          label={actionLabel}
          onPress={onAction}
          icon="add"
          compact
        />
      )}
    </View>
  );
}

type ProgressBarProps = {
  value: number;
  color?: string;
  trackColor?: string;
};

export function ProgressBar({
  value,
  color = Palette.forest,
  trackColor = "#E7ECE9",
}: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
      <View
        style={[
          styles.progressValue,
          { backgroundColor: color, width: `${safeValue}%` },
        ]}
      />
    </View>
  );
}

type StatCardProps = {
  icon: AppIconName;
  value: string;
  label: string;
  tone?: "mint" | "sun" | "sky" | "coral";
};

const statIconColors = {
  mint: Palette.forest,
  sun: "#846211",
  sky: "#2E6474",
  coral: "#934E39",
};

export function StatCard({ icon, value, label, tone = "mint" }: StatCardProps) {
  return (
    <Card tone={tone} style={styles.statCard}>
      <View style={styles.statIcon}>
        <AppIcon name={icon} size={22} color={statIconColors[tone]} />
      </View>
      <View>
        <AppText variant="title">{value}</AppText>
        <AppText variant="small" color={Palette.inkSoft}>
          {label}
        </AppText>
      </View>
    </Card>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  helper?: string;
};

export function Field({
  label,
  helper,
  style,
  multiline,
  ...props
}: FieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={Palette.muted}
        style={[styles.field, multiline && styles.fieldMultiline, style]}
      />
      {helper && (
        <AppText variant="small" color={Palette.muted}>
          {helper}
        </AppText>
      )}
    </View>
  );
}

type SegmentedOption<T extends string | number> = { value: T; label: string };

type SegmentedControlProps<T extends string | number> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { width } = useWindowDimensions();
  const compact = width < Layout.compactBreakpoint;

  return (
    <View style={[styles.segmented, compact && styles.segmentedCompact]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <AppText
              variant="bodyStrong"
              color={selected ? Palette.white : Palette.inkSoft}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SkeletonLine({
  width = "100%",
}: {
  width?: ViewStyle["width"];
}) {
  return <View style={[styles.skeletonLine, { width }]} />;
}

const textStyles = StyleSheet.create({
  base: {
    fontFamily: "system-ui",
  },
  display: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    letterSpacing: -1.1,
  },
  title: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "800",
    letterSpacing: -0.65,
  },
  heading: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400",
  },
  bodyStrong: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
  },
  small: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  label: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
    letterSpacing: 0.55,
    textTransform: "uppercase",
  },
});

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.large,
    overflow: "hidden",
  },
  cardPadded: {
    padding: Space.xl,
  },
  cardPaddedCompact: {
    padding: Space.lg,
  },
  paperBorder: {
    borderWidth: 1,
    borderColor: Palette.line,
    boxShadow: "0 5px 12px rgba(20, 56, 52, 0.035)",
  },
  button: {
    minHeight: 48,
    borderRadius: Radius.medium,
    borderWidth: 1,
    paddingHorizontal: 19,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Space.sm,
    maxWidth: "100%",
    flexShrink: 1,
  },
  buttonCompact: {
    minHeight: 40,
    paddingHorizontal: 15,
    borderRadius: Radius.small,
  },
  buttonTextCompact: {
    fontSize: 14,
  },
  buttonText: {
    flexShrink: 1,
    textAlign: "center",
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  buttonDisabled: {
    opacity: 0.42,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: "100%",
    flexShrink: 1,
  },
  pageScroll: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    maxWidth: "100%",
    backgroundColor: Palette.cream,
  },
  pageScrollContent: {
    flexGrow: 1,
    width: "100%",
    maxWidth: "100%",
    paddingHorizontal: Space.xxl,
    paddingTop: Space.xxl,
    paddingBottom: 64,
    alignItems: "center",
  },
  pageScrollContentCompact: {
    paddingHorizontal: Space.lg,
    paddingTop: Space.xl,
    paddingBottom: 112,
  },
  pageInner: {
    width: "100%",
    minWidth: 0,
    flexShrink: 1,
    maxWidth: Layout.contentMaxWidth,
    gap: Space.xl,
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: Space.xl,
    marginBottom: Space.sm,
  },
  pageHeaderCompact: {
    alignItems: "stretch",
    flexDirection: "column",
  },
  pageHeaderActionAbove: {
    alignItems: "flex-start",
    flexDirection: "column-reverse",
    gap: Space.lg,
  },
  pageHeadingCopy: {
    flex: 1,
    gap: Space.sm,
  },
  eyebrow: {
    marginBottom: 2,
  },
  description: {
    maxWidth: 650,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.lg,
  },
  sectionHeaderCompact: {
    alignItems: "flex-start",
    flexDirection: "column",
    gap: Space.md,
  },
  sectionHeaderCopy: {
    gap: 3,
    flex: 1,
    minWidth: 0,
  },
  emptyState: {
    minHeight: 300,
    justifyContent: "center",
    alignItems: "center",
    padding: Space.xxl,
  },
  emptyStateCompact: {
    minHeight: 210,
    padding: Space.xl,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: Palette.mint,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Space.lg,
  },
  emptyTitle: {
    textAlign: "center",
  },
  emptyDescription: {
    textAlign: "center",
    maxWidth: 430,
    marginTop: 6,
    marginBottom: Space.lg,
  },
  progressTrack: {
    height: 8,
    borderRadius: Radius.pill,
    overflow: "hidden",
  },
  progressValue: {
    height: "100%",
    borderRadius: Radius.pill,
  },
  statCard: {
    minWidth: 190,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Space.lg,
  },
  statIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  fieldGroup: {
    gap: Space.sm,
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
  },
  field: {
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    minHeight: 48,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.white,
    borderRadius: Radius.small,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Palette.ink,
    fontSize: 15,
    fontFamily: "system-ui",
    outlineColor: Palette.forest,
  },
  fieldMultiline: {
    minHeight: 112,
    textAlignVertical: "top",
  },
  segmented: {
    borderRadius: Radius.medium,
    padding: 4,
    backgroundColor: "#E8ECE9",
    flexDirection: "row",
    flexWrap: "wrap",
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  segmentedCompact: {
    alignSelf: "stretch",
  },
  segment: {
    paddingHorizontal: Space.lg,
    minHeight: 39,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    maxWidth: "100%",
    flexShrink: 1,
  },
  segmentSelected: {
    backgroundColor: Palette.forest,
  },
  skeletonLine: {
    height: 11,
    borderRadius: Radius.pill,
    backgroundColor: "#E7ECE9",
  },
});
