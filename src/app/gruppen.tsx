import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppIcon } from "@/components/ui/app-icon";
import {
  ChoiceChips,
  DataLoading,
  ErrorBanner,
  FormDialog,
  RowActions,
} from "@/components/ui/data-ui";
import {
  ActionButton,
  AppText,
  Card,
  EmptyState,
  Field,
  PageScaffold,
  Pill,
  SectionHeader,
  StatCard,
} from "@/components/ui/primitives";
import { Palette, Radius, Space } from "@/constants/design";
import { useAcademyData } from "@/context/academy-data-context";
import { useAuth } from "@/context/auth-context";
import {
  adminAssignChildTimeGroup,
  createRecord,
  deleteRecord,
  reviewTimeGroupRequest,
  updateRecord,
} from "@/lib/academy-api";
import type { GroupMemberRow, GroupRow } from "@/types/database";
import { confirmAction } from "@/utils/feedback";
import { apiErrorMessage } from "@/utils/format";

type GroupForm = {
  name: string;
  scheduleLabel: string;
  yearId: number | null;
  ageGroupId: number | null;
  teacherProfileId: number | null;
};

const emptyForm: GroupForm = {
  name: "",
  scheduleLabel: "",
  yearId: null,
  ageGroupId: null,
  teacherProfileId: null,
};

export default function GroupsScreen() {
  const { profile } = useAuth();
  const { data, isLoading, error: loadError, refresh, execute } =
    useAcademyData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GroupRow | null>(null);
  const [form, setForm] = useState<GroupForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [movingMembership, setMovingMembership] =
    useState<GroupMemberRow | null>(null);
  const [moveGroupId, setMoveGroupId] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const isAdmin = profile?.role === "admin";

  const teacherProfiles = useMemo(
    () => data.teachingContacts.filter((contact) => contact.account_role === 'admin' || contact.age_group_id === form.ageGroupId),
    [data.teachingContacts, form.ageGroupId],
  );

  const pendingRequests = data.groupMembers.filter(
    (member) => member.membership_status === "pending",
  );
  const approvedMembers = data.groupMembers.filter(
    (member) => member.membership_status === "approved",
  );

  function openGroup(group?: GroupRow) {
    setEditing(group ?? null);
    setForm(
      group
        ? {
            name: group.name,
            scheduleLabel: group.schedule_label,
            yearId: group.academy_year_id,
            ageGroupId: group.age_group_id,
            teacherProfileId: group.teacher_profile_id,
          }
        : {
            name: "",
            scheduleLabel: "",
            yearId:
              data.academyYears.find((year) => year.is_active)?.id ??
              data.academyYears[0]?.id ??
              null,
            ageGroupId: data.ageGroups[0]?.id ?? null,
            teacherProfileId: null,
          },
    );
    setFormError(null);
    setDialogOpen(true);
  }

  async function save() {
    if (
      !form.name.trim() ||
      !form.scheduleLabel.trim() ||
      !form.yearId ||
      !form.ageGroupId
    ) {
      setFormError(
        "Name, Unterrichtszeit, Akademiejahr und Altersgruppe sind erforderlich.",
      );
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      await execute(() => {
        const values = {
          name: form.name.trim(),
          schedule_label: form.scheduleLabel.trim(),
          academy_year_id: form.yearId!,
          age_group_id: form.ageGroupId!,
          teacher_profile_id: form.teacherProfileId,
        };

        return editing
          ? updateRecord("groups", editing.id, values)
          : createRecord("groups", values);
      });

      setDialogOpen(false);
    } catch (reason) {
      setFormError(apiErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function reviewRequest(
    membership: GroupMemberRow,
    decision: "approved" | "rejected",
  ) {
    setReviewingId(membership.id);
    setActionError(null);

    try {
      await execute(() => reviewTimeGroupRequest(membership.id, decision));
    } catch (reason) {
      setActionError(apiErrorMessage(reason));
    } finally {
      setReviewingId(null);
    }
  }

  function openMoveDialog(membership: GroupMemberRow) {
    const child = data.children.find(
      (entry) => entry.id === membership.child_id,
    );
    const alternativeGroup = data.groups.find(
      (group) =>
        membership.membership_status === "pending" &&
        group.id !== membership.group_id &&
        group.age_group_id === child?.age_group_id &&
        data.academyYears.some(
          (year) => year.id === group.academy_year_id && year.is_active,
        ),
    );

    setMovingMembership(membership);
    setMoveGroupId(alternativeGroup?.id ?? membership.group_id);
    setMoveError(null);
  }

  async function moveChild() {
    const child = data.children.find(
      (entry) => entry.id === movingMembership?.child_id,
    );
    const targetGroup = data.groups.find(
      (entry) => entry.id === moveGroupId,
    );
    const targetYear = data.academyYears.find(
      (entry) => entry.id === targetGroup?.academy_year_id,
    );

    if (
      !child ||
      !targetGroup ||
      !targetYear?.is_active ||
      targetGroup.age_group_id !== child.age_group_id
    ) {
      setMoveError(
        "Wähle eine aktive Zeitgruppe aus der Altersgruppe des Kindes.",
      );
      return;
    }

    setMoving(true);
    setMoveError(null);

    try {
      await execute(() =>
        adminAssignChildTimeGroup(child.id, targetGroup.id),
      );
      setMovingMembership(null);
    } catch (reason) {
      setMoveError(apiErrorMessage(reason));
    } finally {
      setMoving(false);
    }
  }

  async function remove(group: GroupRow) {
    const confirmed = await confirmAction(
      "Zeitgruppe löschen?",
      `Die Zeitgruppe „${group.name}“ und alle Anfragen und Zuordnungen werden gelöscht. Kinderprofile bleiben erhalten.`,
    );

    if (!confirmed) return;

    setActionError(null);

    try {
      await execute(() => deleteRecord("groups", group.id));
    } catch (reason) {
      setActionError(apiErrorMessage(reason));
    }
  }

  const scheduledSessions = data.liveSessions.filter(
    (session) => session.status === "scheduled",
  ).length;
  const movingChild = data.children.find(
    (entry) => entry.id === movingMembership?.child_id,
  );
  const moveTimeGroups = data.groups.filter(
    (group) =>
      group.age_group_id === movingChild?.age_group_id &&
      data.academyYears.some(
        (year) => year.id === group.academy_year_id && year.is_active,
      ),
  );
  const assigningPendingRequest =
    movingMembership?.membership_status === "pending";
  const selectableMoveTimeGroups = assigningPendingRequest
    ? moveTimeGroups.filter(
        (group) => group.id !== movingMembership?.group_id,
      )
    : moveTimeGroups;

  return (
    <PageScaffold
      eyebrow="Team-Bereich"
      title="Zeitgruppen"
      description="Unterrichtszeiten verwalten und Anfragen von Familien freischalten. Die Lerninhalte bleiben an die Altersgruppe gebunden."
      action={
        <ActionButton
          label="Zeitgruppe anlegen"
          icon="add"
          disabled={
            data.academyYears.length === 0 || data.ageGroups.length === 0
          }
          onPress={() => openGroup()}
        />
      }
    >
      {loadError && (
        <ErrorBanner message={loadError} onRetry={() => void refresh()} />
      )}
      {actionError && <ErrorBanner message={actionError} />}
      {data.academyYears.length === 0 && (
        <ErrorBanner message="Lege im Curriculum zuerst ein Akademiejahr an." />
      )}
      {data.ageGroups.length === 0 && (
        <ErrorBanner message="Lege im Curriculum zuerst eine Altersgruppe an." />
      )}

      <View style={styles.statsGrid}>
        <StatCard
          icon="groups"
          value={String(data.groups.length)}
          label="Zeitgruppen"
          tone="mint"
        />
        <StatCard
          icon="children"
          value={String(
            new Set(approvedMembers.map((member) => member.child_id)).size,
          )}
          label="Freigeschaltete Kinder"
          tone="sun"
        />
        <StatCard
          icon="clock"
          value={String(pendingRequests.length)}
          label="Offene Anfragen"
          tone="coral"
        />
        <StatCard
          icon="calendar"
          value={String(scheduledSessions)}
          label="Geplante Termine"
          tone="sky"
        />
      </View>

      {isAdmin && (
        <Card>
          <SectionHeader
            title="Offene Zeitgruppenanfragen"
            description="Nur eine Freigabe durch einen Admin macht die Zuordnung wirksam."
          />

          {pendingRequests.length === 0 ? (
            <EmptyState
              compact
              icon="check"
              title="Keine offenen Anfragen"
              description="Neue Zeitgruppenwünsche von Familien erscheinen automatisch hier."
            />
          ) : (
            <View style={styles.requestList}>
              {pendingRequests.map((membership) => {
                const child = data.children.find(
                  (entry) => entry.id === membership.child_id,
                );
                const timeGroup = data.groups.find(
                  (entry) => entry.id === membership.group_id,
                );
                const ageGroup = data.ageGroups.find(
                  (entry) => entry.id === child?.age_group_id,
                );
                const parent = data.profiles.find(
                  (entry) => entry.id === child?.parent_profile_id,
                );
                const reviewing = reviewingId === membership.id;
                const hasAlternativeTimeGroup = data.groups.some(
                  (group) =>
                    group.id !== membership.group_id &&
                    group.age_group_id === child?.age_group_id &&
                    data.academyYears.some(
                      (year) =>
                        year.id === group.academy_year_id && year.is_active,
                    ),
                );

                return (
                  <View key={membership.id} style={styles.requestRow}>
                    <View style={styles.requestIcon}>
                      <AppIcon name="clock" size={21} color={Palette.forest} />
                    </View>

                    <View style={styles.requestCopy}>
                      <View style={styles.titleLine}>
                        <AppText variant="bodyStrong">
                          {child?.display_name ?? "Unbekanntes Kind"}
                        </AppText>
                        <Pill tone="sun">Freigabe ausstehend</Pill>
                      </View>
                      <AppText color={Palette.inkSoft}>
                        {timeGroup?.name ?? "Unbekannte Zeitgruppe"} ·{" "}
                        {timeGroup?.schedule_label ?? "Keine Zeit hinterlegt"}
                      </AppText>
                      <AppText variant="small" color={Palette.muted}>
                        {ageGroup?.title ?? "Unbekannte Altersgruppe"} · Elternkonto:{" "}
                        {parent?.display_name ?? "Unbekannt"}
                      </AppText>
                    </View>

                    <View style={styles.requestActions}>
                      {hasAlternativeTimeGroup && (
                        <ActionButton
                          label="Andere Gruppe zuweisen"
                          compact
                          icon="groups"
                          variant="secondary"
                          disabled={reviewing}
                          onPress={() => openMoveDialog(membership)}
                        />
                      )}
                      <ActionButton
                        label="Ablehnen"
                        compact
                        variant="secondary"
                        disabled={reviewing}
                        onPress={() =>
                          void reviewRequest(membership, "rejected")
                        }
                      />
                      <ActionButton
                        label={reviewing ? "Wird gespeichert …" : "Freischalten"}
                        compact
                        icon="check"
                        disabled={reviewing}
                        onPress={() =>
                          void reviewRequest(membership, "approved")
                        }
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      )}

      <Card style={styles.listCard}>
        <SectionHeader
          title="Zeitgruppen"
          description="Mehrere Zeiten einer Altersgruppe verwenden dieselben Lernreisen und Lektionen."
        />

        {isLoading && data.groups.length === 0 ? (
          <DataLoading />
        ) : data.groups.length === 0 ? (
          <EmptyState
            icon="groups"
            title="Noch keine Zeitgruppen"
            description="Lege mehrere Unterrichtszeiten an und verbinde sie jeweils mit einer Altersgruppe."
            actionLabel="Erste Zeitgruppe anlegen"
            onAction={() => openGroup()}
          />
        ) : (
          <View style={styles.groupList}>
            {data.groups.map((group) => {
              const year = data.academyYears.find(
                (entry) => entry.id === group.academy_year_id,
              );
              const teacher = data.profiles.find(
                (entry) => entry.id === group.teacher_profile_id,
              );
              const members = approvedMembers.filter(
                (member) => member.group_id === group.id,
              );
              const requests = pendingRequests.filter(
                (member) => member.group_id === group.id,
              );
              const sessions = data.liveSessions.filter(
                (session) => session.group_id === group.id,
              );
              const ageGroup = data.ageGroups.find(
                (entry) => entry.id === group.age_group_id,
              );
              return (
                <View key={group.id} style={styles.groupRow}>
                  <View style={styles.groupIcon}>
                    <AppIcon name="groups" size={23} color={Palette.forest} />
                  </View>
                  <View style={styles.groupCopy}>
                    <View style={styles.titleLine}>
                      <AppText variant="bodyStrong">{group.name}</AppText>
                      <Pill tone="mint">
                        {ageGroup?.title ?? "Unbekannte Altersgruppe"}
                      </Pill>
                      {requests.length > 0 && (
                        <Pill tone="sun">
                          {requests.length} offene{" "}
                          {requests.length === 1 ? "Anfrage" : "Anfragen"}
                        </Pill>
                      )}
                    </View>
                    <AppText color={Palette.inkSoft}>
                      {group.schedule_label}
                    </AppText>
                    <AppText variant="small" color={Palette.inkSoft}>
                      {year?.title ?? "Unbekanntes Jahr"} · {members.length}{" "}
                      freigeschaltete Kinder · {sessions.length} Termine
                    </AppText>
                    <AppText variant="small" color={Palette.muted}>
                      Lehrkraft: {teacher?.display_name ?? "Noch nicht zugeordnet"}
                    </AppText>
                    {members.length > 0 && (
                      <View style={styles.memberList}>
                        <AppText variant="small" color={Palette.muted}>
                          Freigeschaltete Kinder
                        </AppText>
                        {members.map((membership) => {
                          const child = data.children.find(
                            (entry) => entry.id === membership.child_id,
                          );

                          return (
                            <View
                              key={membership.id}
                              style={styles.memberRow}
                            >
                              <View style={styles.memberName}>
                                <AppIcon
                                  name="children"
                                  size={16}
                                  color={Palette.forest}
                                />
                                <AppText variant="small" color={Palette.inkSoft}>
                                  {child?.display_name ?? "Unbekanntes Kind"}
                                </AppText>
                              </View>
                              {isAdmin && (
                                <ActionButton
                                  label="Zeitgruppe ändern"
                                  compact
                                  variant="quiet"
                                  onPress={() => openMoveDialog(membership)}
                                />
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                  <RowActions
                    onEdit={() => openGroup(group)}
                    onDelete={() => void remove(group)}
                  />
                </View>
              );
            })}
          </View>
        )}
      </Card>

      <FormDialog
        visible={dialogOpen}
        title={editing ? "Zeitgruppe bearbeiten" : "Zeitgruppe anlegen"}
        description="Die Inhalte stammen aus der Altersgruppe; hier wird nur der konkrete Unterrichtszeitraum organisiert."
        saving={saving}
        onClose={() => setDialogOpen(false)}
        onSave={() => void save()}
      >
        {formError && <ErrorBanner message={formError} />}
        <Field
          label="Name der Zeitgruppe"
          placeholder="Zum Beispiel Freitagsgruppe A"
          value={form.name}
          onChangeText={(name) =>
            setForm((current) => ({ ...current, name }))
          }
        />
        <Field
          label="Unterrichtszeit"
          placeholder="Zum Beispiel Freitag, 17:00–17:45 Uhr"
          value={form.scheduleLabel}
          onChangeText={(scheduleLabel) =>
            setForm((current) => ({ ...current, scheduleLabel }))
          }
          helper="Diese Angabe sehen Familien bei der Auswahl."
        />
        <ChoiceChips
          label="Akademiejahr"
          value={form.yearId}
          onChange={(yearId) =>
            setForm((current) => ({ ...current, yearId }))
          }
          options={data.academyYears.map((year) => ({
            value: year.id,
            label: year.title,
          }))}
        />
        <ChoiceChips
          label="Altersgruppe und Inhalte"
          value={form.ageGroupId}
          onChange={(ageGroupId) =>
            setForm((current) => ({ ...current, ageGroupId, teacherProfileId: null }))
          }
          options={data.ageGroups.map((ageGroup) => ({
            value: ageGroup.id,
            label: ageGroup.title,
          }))}
        />
        <ChoiceChips
          label="Lehrkraft"
          value={form.teacherProfileId}
          allowEmpty
          onChange={(teacherProfileId) =>
            setForm((current) => ({ ...current, teacherProfileId }))
          }
          options={teacherProfiles.map((teacherProfile) => ({
            value: teacherProfile.profile_id,
            label: teacherProfile.display_name,
          }))}
        />
      </FormDialog>

      <FormDialog
        visible={Boolean(movingMembership)}
        title={
          assigningPendingRequest
            ? "Andere Zeitgruppe zuweisen"
            : "Zeitgruppe des Kindes ändern"
        }
        description={
          movingChild
            ? assigningPendingRequest
              ? `${movingChild.display_name} wird direkt der ausgewählten Zeitgruppe zugewiesen und freigeschaltet. Die ursprüngliche Anfrage wird beendet.`
              : `${movingChild.display_name} wird direkt in die ausgewählte Zeitgruppe verschoben. Eine neue Elternanfrage ist nicht erforderlich.`
            : undefined
        }
        saveLabel={assigningPendingRequest ? "Zuweisen" : "Speichern"}
        saving={moving}
        onClose={() => setMovingMembership(null)}
        onSave={() => void moveChild()}
      >
        {moveError && <ErrorBanner message={moveError} />}
        <ChoiceChips
          label={assigningPendingRequest ? "Zeitgruppe" : "Neue Zeitgruppe"}
          value={moveGroupId}
          onChange={setMoveGroupId}
          options={selectableMoveTimeGroups.map((group) => ({
            value: group.id,
            label: `${group.name} · ${group.schedule_label}`,
          }))}
        />
        {selectableMoveTimeGroups.length <
          (assigningPendingRequest ? 1 : 2) && (
          <AppText variant="small" color={Palette.muted}>
            Für diese Altersgruppe ist aktuell keine weitere aktive Zeitgruppe
            eingerichtet.
          </AppText>
        )}
      </FormDialog>
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: "row",
    gap: Space.lg,
    flexWrap: "wrap",
  },
  listCard: {
    minHeight: 470,
  },
  requestList: {
    marginTop: Space.lg,
  },
  requestRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: Space.md,
    borderBottomWidth: 1,
    borderBottomColor: Palette.line,
    paddingVertical: Space.md,
  },
  requestIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.medium,
    backgroundColor: Palette.sunSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  requestCopy: {
    flex: 1,
    flexBasis: 260,
    minWidth: 0,
    gap: 3,
  },
  requestActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
  },
  groupList: {
    gap: Space.sm,
    marginTop: Space.lg,
  },
  groupRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: Space.md,
    borderBottomWidth: 1,
    borderBottomColor: Palette.line,
    paddingVertical: Space.lg,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.medium,
    backgroundColor: Palette.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  groupCopy: {
    flex: 1,
    flexBasis: 240,
    minWidth: 0,
    gap: 4,
  },
  memberList: {
    gap: Space.xs,
    marginTop: Space.sm,
  },
  memberRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.sm,
    paddingVertical: Space.xs,
    paddingHorizontal: Space.sm,
    borderRadius: Radius.small,
    backgroundColor: Palette.mint,
  },
  memberName: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs,
  },
  titleLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Space.sm,
  },
});
