import type { AcademyData, AcademyTableName } from '@/types/database';

export type AcademyDataKey = keyof AcademyData;
type Source = { table: AcademyTableName; columns: string; order: string; ascending?: boolean };

// Explicit projections prevent new or large unused columns from silently
// becoming part of every dashboard request. lesson_steps.content is not used
// by any current screen; legacy submission lists only need the step's title.
export const academySources = {
  teachingContacts: null,
  profiles: { table: 'profiles', columns: 'id,auth_user_id,display_name,avatar_url,created_at', order: 'display_name' },
  userRoles: { table: 'user_roles', columns: 'id,profile_id,role,created_at', order: 'created_at' },
  academyYears: { table: 'academy_years', columns: 'id,title,starts_on,ends_on,is_active,created_at', order: 'starts_on', ascending: false },
  ageGroups: { table: 'age_groups', columns: 'id,title,min_age,max_age,position,created_at,date_time', order: 'position' },
  children: { table: 'children', columns: 'id,parent_profile_id,display_name,birth_date,age_group_id,avatar_key,created_at,gender', order: 'display_name' },
  journeys: { table: 'learning_journeys', columns: 'id,academy_year_id,age_group_id,title,description,position,is_published,created_at', order: 'position' },
  lessons: { table: 'lessons', columns: 'id,learning_journey_id,title,description,intro_text,status,position,publish_at,replay_url,is_released,released_at,released_by_profile_id,created_at,youtube_url', order: 'position' },
  lessonSteps: { table: 'lesson_steps', columns: 'id,lesson_id,step_type,title,position,created_at', order: 'position' },
  groups: { table: 'groups', columns: 'id,academy_year_id,teacher_profile_id,name,age_group_id,schedule_label,created_at', order: 'name' },
  groupMembers: { table: 'group_members', columns: 'id,group_id,child_id,membership_status,requested_at,reviewed_at,reviewed_by_profile_id,created_at', order: 'created_at' },
  liveSessions: { table: 'live_sessions', columns: 'id,lesson_id,group_id,title,starts_at,ends_at,meeting_url,replay_url,status,created_at', order: 'starts_at' },
  quizzes: { table: 'lesson_quizzes', columns: 'id,lesson_id,title,description,passing_percent,is_published,released_at,released_by_profile_id,created_at', order: 'created_at' },
  quizQuestions: { table: 'quiz_questions', columns: 'id,quiz_id,question_text,position,created_at', order: 'position' },
  quizOptions: { table: 'quiz_options', columns: 'id,question_id,option_text,position,created_at', order: 'position' },
  quizAnswerKeys: { table: 'quiz_answer_keys', columns: 'id,question_id,correct_option_id,explanation,created_at', order: 'created_at' },
  quizAttempts: { table: 'quiz_attempts', columns: 'id,child_id,quiz_id,correct_answers,total_questions,score_percent,passed,submitted_at,created_at', order: 'submitted_at', ascending: false },
  quizAttemptAnswers: { table: 'quiz_attempt_answers', columns: 'id,attempt_id,question_id,selected_option_id,is_correct,created_at', order: 'created_at' },
  lessonProgress: { table: 'child_lesson_progress', columns: 'id,child_id,lesson_id,status,progress_percent,last_opened_at,completed_at,created_at', order: 'created_at' },
  stepProgress: { table: 'child_step_progress', columns: 'id,child_id,lesson_step_id,completed_at,created_at', order: 'created_at' },
  submissions: { table: 'submissions', columns: 'id,child_id,lesson_id,lesson_step_id,submission_type,text_value,storage_path,submitted_at,created_at', order: 'submitted_at', ascending: false },
  badges: { table: 'badges', columns: 'id,age_group_id,title,description,icon_key,created_at', order: 'title' },
  childBadges: { table: 'child_badges', columns: 'id,child_id,badge_id,lesson_id,awarded_at,created_at', order: 'awarded_at', ascending: false },
  mediaAssets: { table: 'media_assets', columns: 'id,age_group_id,uploaded_by_profile_id,media_type,bucket_name,storage_path,file_name,mime_type,size_bytes,created_at', order: 'created_at', ascending: false },
  lessonDocuments: { table: 'lesson_documents', columns: 'id,lesson_id,media_asset_id,title,position,created_at', order: 'position' },
  messages: { table: 'messages', columns: 'id,sender_profile_id,recipient_profile_id,group_id,audience,subject,body,published_at,created_at', order: 'created_at', ascending: false },
  messageReads: { table: 'message_reads', columns: 'id,message_id,profile_id,read_at,created_at', order: 'read_at', ascending: false },
} satisfies Record<AcademyDataKey, Source | null>;

// Questions remain available for the counts shown by dashboards and lists.
// Options and correct answers are needed only on the quiz/editor screens.
export const deferredAcademyKeys: readonly AcademyDataKey[] = ['quizOptions', 'quizAnswerKeys'];
export const initialAcademyKeys = (Object.keys(academySources) as AcademyDataKey[])
  .filter((key) => !deferredAcademyKeys.includes(key));

export const deferredAcademyDependencies: ReadonlyMap<AcademyDataKey, readonly AcademyDataKey[]> = new Map([
  ['quizOptions', ['quizzes', 'quizQuestions']],
  ['quizAnswerKeys', ['quizzes', 'quizQuestions', 'quizOptions']],
]);
