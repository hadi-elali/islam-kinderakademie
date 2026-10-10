import {
  AcademyData,
  AcademyInsert,
  AcademyTableName,
  AcademyTableRowMap,
  AcademyUpdate,
  AdminAccountSummary,
  ChildLessonProgressRow,
  LessonEditorInput,
  LessonDocumentRow,
  MediaAssetRow,
  MediaType,
  QuizEditorInput,
  QuizSubmissionResult,
  TeachingContact,
  emptyDatabaseData,
} from '@/types/database';
import { supabase } from '@/lib/supabase';

export class AcademyApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AcademyApiError';
  }
}

function client() {
  if (!supabase) {
    throw new AcademyApiError(
      'Supabase ist noch nicht konfiguriert.'
    );
  }

  return supabase;
}

function fail(error: { message: string } | null) {
  if (error) {
    throw new AcademyApiError(error.message);
  }
}

export async function ensureCurrentProfileId() {
  const { data, error } = await client().rpc(
    'ensure_current_profile'
  );

  fail(error);

  const profileId = Number(data);

  if (!Number.isFinite(profileId)) {
    throw new AcademyApiError(
      'Das Supabase-Profil konnte nicht bereitgestellt werden.'
    );
  }

  return profileId;
}

export async function listAdminAccounts() {
  const { data, error } = await client().rpc(
    'list_admin_accounts'
  );

  fail(error);

  return withStaffPortraitUrls((data ?? []) as AdminAccountSummary[]);
}

async function withStaffPortraitUrls<T extends { portrait_path: string | null }>(rows: T[]) {
  const paths = [...new Set(rows.flatMap((row) => row.portrait_path ? [row.portrait_path] : []))];
  if (paths.length === 0) return rows.map((row) => ({ ...row, portrait_url: null }));
  const { data, error } = await client().storage.from('staff-portraits').createSignedUrls(paths, 3600);
  fail(error);
  const urls = new Map(data?.map((item) => [item.path, item.signedUrl]));
  return rows.map((row) => ({ ...row, portrait_url: row.portrait_path ? urls.get(row.portrait_path) ?? null : null }));
}

async function listTeachingContacts(): Promise<TeachingContact[]> {
  const { data, error } = await client().rpc('list_teaching_contacts');
  fail(error);
  return withStaffPortraitUrls((data ?? []) as TeachingContact[]);
}

export async function uploadStaffPortrait(input: {
  profileId: number; mimeType: string; data: ArrayBuffer; previousPath: string | null;
}) {
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[input.mimeType];
  if (!extension || input.data.byteLength === 0 || input.data.byteLength > 5 * 1024 * 1024) {
    throw new AcademyApiError('Bitte wähle ein JPG-, PNG- oder WebP-Bild mit maximal 5 MB.');
  }
  const path = `${input.profileId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const bucket = client().storage.from('staff-portraits');
  const { error } = await bucket.upload(path, input.data, { contentType: input.mimeType, upsert: false });
  fail(error);
  try {
    const { error: profileError } = await client().rpc('set_staff_portrait', {
      target_profile_id: input.profileId, new_portrait_path: path,
    });
    fail(profileError);
  } catch (reason) {
    await bucket.remove([path]);
    throw reason;
  }
  if (input.previousPath) await bucket.remove([input.previousPath]);
}

export async function removeStaffPortrait(profileId: number, path: string) {
  const { error } = await client().rpc('set_staff_portrait', {
    target_profile_id: profileId, new_portrait_path: null,
  });
  fail(error);
  const { error: storageError } = await client().storage.from('staff-portraits').remove([path]);
  fail(storageError);
}

export async function setProfilePrimaryRole(
  profileId: number,
  role: 'parent' | 'teacher' | 'admin',
  ageGroupId: number | null = null
) {
  const { error } = await client().rpc(
    'set_profile_primary_role',
    {
      target_profile_id: profileId,
      next_role: role,
      teaching_age_group_id: ageGroupId,
    }
  );

  fail(error);
}

export async function setLessonRelease(
  lessonId: number,
  isReleased: boolean
) {
  const { error } = await client().rpc(
    'set_lesson_release',
    {
      target_lesson_id: lessonId,
      release_lesson: isReleased,
    }
  );

  fail(error);
}

export async function setQuizRelease(
  quizId: number,
  isReleased: boolean
) {
  const { error } = await client().rpc(
    'set_quiz_release',
    {
      target_quiz_id: quizId,
      release_quiz: isReleased,
    }
  );

  fail(error);
}

async function selectTable<T>(
  table: AcademyTableName,
  order: string,
  ascending = true
) {
  const { data, error } = await client()
    .from(table)
    .select('*')
    .order(order, {
      ascending,
    });

  fail(error);

  return (data ?? []) as T[];
}

export async function loadAcademyData(account?: { id: number | null; role: string }): Promise<AcademyData> {
  if (!supabase) {
    return emptyDatabaseData;
  }

  const [
    teachingContacts,
    profiles,
    userRoles,
    academyYears,
    ageGroups,
    children,
    journeys,
    lessons,
    lessonSteps,
    groups,
    groupMembers,
    liveSessions,
    quizzes,
    quizQuestions,
    quizOptions,
    quizAnswerKeys,
    quizAttempts,
    quizAttemptAnswers,
    lessonProgress,
    stepProgress,
    submissions,
    badges,
    childBadges,
    mediaAssets,
    lessonDocuments,
    messages,
    messageReads,
  ] = await Promise.all([
    listTeachingContacts(),
    selectTable<AcademyData['profiles'][number]>(
      'profiles',
      'display_name'
    ),

    selectTable<AcademyData['userRoles'][number]>(
      'user_roles',
      'created_at'
    ),

    selectTable<AcademyData['academyYears'][number]>(
      'academy_years',
      'starts_on',
      false
    ),

    selectTable<AcademyData['ageGroups'][number]>(
      'age_groups',
      'position'
    ),

    selectTable<AcademyData['children'][number]>(
      'children',
      'display_name'
    ),

    selectTable<AcademyData['journeys'][number]>(
      'learning_journeys',
      'position'
    ),

    selectTable<AcademyData['lessons'][number]>(
      'lessons',
      'position'
    ),

    selectTable<AcademyData['lessonSteps'][number]>(
      'lesson_steps',
      'position'
    ),

    selectTable<AcademyData['groups'][number]>(
      'groups',
      'name'
    ),

    selectTable<AcademyData['groupMembers'][number]>(
      'group_members',
      'created_at'
    ),

    selectTable<AcademyData['liveSessions'][number]>(
      'live_sessions',
      'starts_at'
    ),

    selectTable<AcademyData['quizzes'][number]>(
      'lesson_quizzes',
      'created_at'
    ),

    selectTable<AcademyData['quizQuestions'][number]>(
      'quiz_questions',
      'position'
    ),

    selectTable<AcademyData['quizOptions'][number]>(
      'quiz_options',
      'position'
    ),

    selectTable<AcademyData['quizAnswerKeys'][number]>(
      'quiz_answer_keys',
      'created_at'
    ),

    selectTable<AcademyData['quizAttempts'][number]>(
      'quiz_attempts',
      'submitted_at',
      false
    ),

    selectTable<AcademyData['quizAttemptAnswers'][number]>(
      'quiz_attempt_answers',
      'created_at'
    ),

    selectTable<AcademyData['lessonProgress'][number]>(
      'child_lesson_progress',
      'created_at'
    ),

    selectTable<AcademyData['stepProgress'][number]>(
      'child_step_progress',
      'created_at'
    ),

    selectTable<AcademyData['submissions'][number]>(
      'submissions',
      'submitted_at',
      false
    ),

    selectTable<AcademyData['badges'][number]>(
      'badges',
      'title'
    ),

    selectTable<AcademyData['childBadges'][number]>(
      'child_badges',
      'awarded_at',
      false
    ),

    selectTable<AcademyData['mediaAssets'][number]>(
      'media_assets',
      'created_at',
      false
    ),

    selectTable<AcademyData['lessonDocuments'][number]>(
      'lesson_documents',
      'position'
    ),

    selectTable<AcademyData['messages'][number]>(
      'messages',
      'created_at',
      false
    ),

    selectTable<AcademyData['messageReads'][number]>(
      'message_reads',
      'read_at',
      false
    ),
  ]);

  return {
    teachingContacts,
    profiles,
    userRoles,
    academyYears,
    ageGroups: account?.role === 'teacher'
      ? ageGroups.filter((group) => group.id === teachingContacts.find((contact) => contact.profile_id === account.id)?.age_group_id)
      : ageGroups,
    children,
    journeys,
    lessons,
    lessonSteps,
    groups,
    groupMembers,
    liveSessions,
    quizzes,
    quizQuestions,
    quizOptions,
    quizAnswerKeys,
    quizAttempts,
    quizAttemptAnswers,
    lessonProgress,
    stepProgress,
    submissions,
    badges,
    childBadges,
    mediaAssets,
    lessonDocuments,
    messages,
    messageReads,
  };
}

export async function markMessageRead(
  messageId: number,
  profileId: number
) {
  const { data, error } = await client()
    .from('message_reads')
    .upsert(
      {
        message_id: messageId,
        profile_id: profileId,
      },
      { onConflict: 'message_id,profile_id' }
    )
    .select('*')
    .single();

  fail(error);

  return data as AcademyData['messageReads'][number];
}

export async function createRecord<
  K extends AcademyTableName,
>(
  table: K,
  values: AcademyInsert<K>
): Promise<AcademyTableRowMap[K]> {
  const { data, error } = await client()
    .from(table)
    .insert(values as never)
    .select('*')
    .single();

  fail(error);

  return data as AcademyTableRowMap[K];
}

export async function updateRecord<
  K extends AcademyTableName,
>(
  table: K,
  id: number,
  values: AcademyUpdate<K>
): Promise<AcademyTableRowMap[K]> {
  const { data, error } = await client()
    .from(table)
    .update(values as never)
    .eq('id', id)
    .select('*')
    .single();

  fail(error);

  return data as AcademyTableRowMap[K];
}

export async function deleteRecord(
  table: AcademyTableName,
  id: number
) {
  const { error } = await client()
    .from(table)
    .delete()
    .eq('id', id);

  fail(error);
}

export async function saveChildWithTimeGroupRequest(input: {
  id?: number;
  displayName: string;
  birthDate: string;
  ageGroupId: number;
  gender: 'male' | 'female';
  avatarKey: string;
  timeGroupId: number;
}) {
  const { data, error } = await client().rpc(
    'save_child_with_time_group_request',
    {
      target_child_id: input.id ?? null,
      child_display_name: input.displayName.trim(),
      child_birth_date: input.birthDate,
      child_age_group_id: input.ageGroupId,
      child_gender: input.gender,
      child_avatar_key: input.avatarKey,
      requested_group_id: input.timeGroupId,
    }
  );

  fail(error);

  return Number(data);
}

export async function reviewTimeGroupRequest(
  groupMemberId: number,
  decision: 'approved' | 'rejected'
) {
  const { data, error } = await client().rpc(
    'review_time_group_request',
    {
      target_group_member_id: groupMemberId,
      review_decision: decision,
    }
  );

  fail(error);

  return Number(data);
}

export async function adminAssignChildTimeGroup(
  childId: number,
  timeGroupId: number
) {
  const { data, error } = await client().rpc(
    'admin_assign_child_time_group',
    {
      target_child_id: childId,
      target_group_id: timeGroupId,
    }
  );

  fail(error);

  return Number(data);
}

/* ============================================================
 * LESSON
 * ============================================================ */

export async function saveLesson(
  input: LessonEditorInput
) {
  const lessonValues = {
    learning_journey_id:
      input.learningJourneyId,

    title:
      input.title.trim(),

    description:
      input.description?.trim() ||
      null,

    intro_text:
      input.introText.trim(),

    status:
      input.status,

    position:
      input.position,

    publish_at:
      input.publishAt ||
      null,

    replay_url:
      input.replayUrl?.trim() ||
      null,

    /*
     * NEU:
     * YouTube-Aufzeichnung
     */
    youtube_url:
      input.youtubeUrl?.trim() ||
      null,
  };

  const lesson = input.id
    ? await updateRecord(
        'lessons',
        input.id,
        lessonValues
      )
    : await createRecord(
        'lessons',
        lessonValues
      );

  if (input.liveSession) {
    const sessionValues = {
      lesson_id:
        lesson.id,

      group_id:
        null,

      title:
        input.liveSession.title?.trim() ||
        lesson.title,

      starts_at:
        input.liveSession.startsAt,

      ends_at:
        input.liveSession.endsAt,

      meeting_url:
        input.liveSession.meetingUrl?.trim() ||
        null,

      status:
        'scheduled' as const,
    };

    if (input.liveSession.id) {
      await updateRecord(
        'live_sessions',
        input.liveSession.id,
        sessionValues
      );
    } else {
      await createRecord(
        'live_sessions',
        sessionValues
      );
    }

    if (input.id) {
      // Auch vorhandene gruppenspezifische Termine verwenden den gemeinsamen Link.
      const { error } = await client()
        .from('live_sessions')
        .update({ meeting_url: sessionValues.meeting_url })
        .eq('lesson_id', lesson.id);

      fail(error);
    }
  }

  return lesson;
}

/* ============================================================
 * QUIZ
 * ============================================================ */

export async function saveMultipleChoiceQuiz(
  input: QuizEditorInput
) {
  const { data, error } = await client().rpc(
    'save_multiple_choice_quiz',
    {
      target_lesson_id:
        input.lessonId,

      quiz_title:
        input.title.trim(),

      quiz_description:
        input.description?.trim() ||
        '',

      required_passing_percent:
        input.passingPercent,

      publish_quiz:
        input.isPublished,

      question_definitions:
        input.questions.map(
          (question) => ({
            question_text:
              question.questionText.trim(),

            explanation:
              question.explanation?.trim() ||
              '',

            options:
              question.options.map(
                (option) => ({
                  option_text:
                    option.optionText.trim(),

                  is_correct:
                    option.isCorrect,
                })
              ),
          })
        ),
    }
  );

  fail(error);

  return Number(data);
}

export async function submitMultipleChoiceQuiz(
  childId: number,
  quizId: number,
  answers: {
    questionId: number;
    optionId: number;
  }[]
) {
  const { data, error } = await client().rpc(
    'submit_multiple_choice_quiz',
    {
      target_child_id:
        childId,

      target_quiz_id:
        quizId,

      submitted_answers:
        answers.map(
          (answer) => ({
            question_id:
              answer.questionId,

            option_id:
              answer.optionId,
          })
        ),
    }
  );

  fail(error);

  const result =
    Array.isArray(data)
      ? data[0]
      : data;

  if (!result) {
    throw new AcademyApiError(
      'Das Quiz-Ergebnis konnte nicht gespeichert werden.'
    );
  }

  const submissionResult = result as Omit<QuizSubmissionResult, 'answers'>;
  const { data: evaluatedAnswers, error: answersError } = await client().rpc(
    'review_multiple_choice_quiz_attempt',
    {
      target_attempt_id: submissionResult.attempt_id,
    }
  );

  fail(answersError);

  return {
    ...submissionResult,
    answers: evaluatedAnswers ?? [],
  } as QuizSubmissionResult;
}

/* ============================================================
 * LESSON PROGRESS
 * ============================================================ */

async function refreshLessonProgress(
  childId: number,
  lessonId: number
) {
  const db = client();

  const {
    data: steps,
    error: stepsError,
  } = await db
    .from('lesson_steps')
    .select('id')
    .eq(
      'lesson_id',
      lessonId
    );

  fail(stepsError);

  const stepIds =
    (steps ?? []).map(
      (step) =>
        step.id as number
    );

  let completedCount = 0;

  if (stepIds.length > 0) {
    const {
      count,
      error: completedError,
    } = await db
      .from(
        'child_step_progress'
      )
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq(
        'child_id',
        childId
      )
      .in(
        'lesson_step_id',
        stepIds
      );

    fail(completedError);

    completedCount =
      count ?? 0;
  }

  const percent =
    stepIds.length === 0
      ? 0
      : Math.round(
          (completedCount /
            stepIds.length) *
            100
        );

  const progress: Partial<ChildLessonProgressRow> =
    {
      child_id:
        childId,

      lesson_id:
        lessonId,

      status:
        percent === 100
          ? 'completed'
          : percent > 0
            ? 'in_progress'
            : 'not_started',

      progress_percent:
        percent,

      last_opened_at:
        new Date().toISOString(),

      completed_at:
        percent === 100
          ? new Date().toISOString()
          : null,
    };

  const { error } = await db
    .from(
      'child_lesson_progress'
    )
    .upsert(
      progress,
      {
        onConflict:
          'child_id,lesson_id',
      }
    );

  fail(error);
}

export async function setStepCompleted(
  childId: number,
  lessonId: number,
  lessonStepId: number,
  completed: boolean
) {
  const db = client();

  if (completed) {
    const { error } = await db
      .from(
        'child_step_progress'
      )
      .upsert(
        {
          child_id:
            childId,

          lesson_step_id:
            lessonStepId,
        },
        {
          onConflict:
            'child_id,lesson_step_id',
        }
      );

    fail(error);
  } else {
    const { error } = await db
      .from(
        'child_step_progress'
      )
      .delete()
      .eq(
        'child_id',
        childId
      )
      .eq(
        'lesson_step_id',
        lessonStepId
      );

    fail(error);
  }

  await refreshLessonProgress(
    childId,
    lessonId
  );
}

/* ============================================================
 * SUBMISSIONS
 * ============================================================ */

export async function saveTextSubmission(
  childId: number,
  lessonId: number,
  lessonStepId: number,
  text: string
) {
  const existing =
    await client()
      .from('submissions')
      .select('id')
      .eq(
        'child_id',
        childId
      )
      .eq(
        'lesson_step_id',
        lessonStepId
      )
      .eq(
        'submission_type',
        'text'
      )
      .maybeSingle();

  fail(existing.error);

  if (existing.data?.id) {
    return updateRecord(
      'submissions',
      existing.data.id as number,
      {
        text_value:
          text.trim(),

        submitted_at:
          new Date().toISOString(),
      }
    );
  }

  return createRecord(
    'submissions',
    {
      child_id:
        childId,

      lesson_id:
        lessonId,

      lesson_step_id:
        lessonStepId,

      submission_type:
        'text',

      text_value:
        text.trim(),

      storage_path:
        null,

      submitted_at:
        new Date().toISOString(),
    }
  );
}

export async function saveConfirmationSubmission(
  childId: number,
  lessonId: number,
  lessonStepId: number,
  text?: string
) {
  const existing =
    await client()
      .from('submissions')
      .select('id')
      .eq(
        'child_id',
        childId
      )
      .eq(
        'lesson_step_id',
        lessonStepId
      )
      .eq(
        'submission_type',
        'confirmation'
      )
      .limit(1)
      .maybeSingle();

  fail(existing.error);

  const values = {
    text_value:
      text?.trim() ||
      null,

    submitted_at:
      new Date().toISOString(),
  };

  if (existing.data?.id) {
    return updateRecord(
      'submissions',
      existing.data.id as number,
      values
    );
  }

  return createRecord(
    'submissions',
    {
      child_id:
        childId,

      lesson_id:
        lessonId,

      lesson_step_id:
        lessonStepId,

      submission_type:
        'confirmation',

      storage_path:
        null,

      ...values,
    }
  );
}

/* ============================================================
 * MEDIA
 * ============================================================ */

export async function uploadMediaAsset(
  input: {
    profileId: number;
    ageGroupId?: number | null;
    fileName: string;
    mimeType: string | null;
    size: number | null;
    data: ArrayBuffer;
  }
): Promise<MediaAssetRow> {
  const safeName =
    input.fileName.replace(
      /[^a-zA-Z0-9._-]/g,
      '-'
    );

  const path =
    `${input.profileId}/${Date.now()}-${safeName}`;

  const mediaType: MediaType =
    input.mimeType?.startsWith(
      'image/'
    )
      ? 'image'
      : input.mimeType?.startsWith(
            'audio/'
          )
        ? 'audio'
        : input.mimeType?.startsWith(
              'video/'
            )
          ? 'video'
          : 'document';

  const {
    error: uploadError,
  } = await client()
    .storage
    .from(
      'academy-media'
    )
    .upload(
      path,
      input.data,
      {
        contentType:
          input.mimeType ??
          undefined,

        upsert:
          false,
      }
    );

  fail(uploadError);

  try {
    return await createRecord(
      'media_assets',
      {
        age_group_id: input.ageGroupId ?? null,
        uploaded_by_profile_id:
          input.profileId,

        media_type:
          mediaType,

        bucket_name:
          'academy-media',

        storage_path:
          path,

        file_name:
          input.fileName,

        mime_type:
          input.mimeType,

        size_bytes:
          input.size,
      }
    );
  } catch (error) {
    await client()
      .storage
      .from(
        'academy-media'
      )
      .remove([
        path,
      ]);

    throw error;
  }
}

export async function getMediaSignedUrl(
  asset: MediaAssetRow
) {
  const {
    data,
    error,
  } = await client()
    .storage
    .from(
      asset.bucket_name
    )
    .createSignedUrl(
      asset.storage_path,
      60 * 10
    );

  fail(error);

  return data?.signedUrl ??
    null;
}

export async function deleteMediaAsset(
  asset: MediaAssetRow
) {
  const {
    error: storageError,
  } = await client()
    .storage
    .from(
      asset.bucket_name
    )
    .remove([
      asset.storage_path,
    ]);

  fail(storageError);

  await deleteRecord(
    'media_assets',
    asset.id
  );
}

export async function uploadLessonPdf(
  input: {
    lessonId: number;
    profileId: number;
    fileName: string;
    mimeType: string | null;
    size: number | null;
    data: ArrayBuffer;
    position: number;
  }
): Promise<LessonDocumentRow> {
  const isPdf =
    input.mimeType?.toLowerCase() === 'application/pdf' ||
    input.fileName.toLowerCase().endsWith('.pdf');

  if (!isPdf) {
    throw new AcademyApiError('Only PDF lesson documents are allowed');
  }

  const asset = await uploadMediaAsset({
    profileId: input.profileId,
    fileName: input.fileName,
    mimeType: 'application/pdf',
    size: input.size,
    data: input.data,
  });

  const title = (
    input.fileName.replace(/\.pdf$/i, '').trim() || 'PDF-Dokument'
  ).slice(0, 160);

  try {
    return await createRecord('lesson_documents', {
      lesson_id: input.lessonId,
      media_asset_id: asset.id,
      title,
      position: input.position,
    });
  } catch (error) {
    await deleteMediaAsset(asset);
    throw error;
  }
}

export async function deleteLessonPdf(
  document: LessonDocumentRow,
  asset: MediaAssetRow | null
) {
  if (asset) {
    await deleteMediaAsset(asset);
    return;
  }

  await deleteRecord('lesson_documents', document.id);
}
