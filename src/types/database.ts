export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type DatabaseRole = 'parent' | 'teacher' | 'admin';
export type LessonStatus = 'draft' | 'scheduled' | 'published' | 'archived';
export type LessonStepType = 'start' | 'discover' | 'explain' | 'quiz' | 'challenge';
export type LiveSessionStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';
export type SubmissionType = 'confirmation' | 'text' | 'audio' | 'image';
export type MediaType = 'image' | 'audio' | 'video' | 'document';
export type MessageAudience = 'all' | 'profile' | 'group';
export type GroupMembershipStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type PaymentMethod = 'paypal' | 'bank_transfer';
export type PaymentAgreementStatus = 'active' | 'cancelled';
export type MonthlyPaymentStatus = 'pending' | 'paid' | 'overdue' | 'waived';

export type ProfileRow = {
  id: number;
  auth_user_id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
};

export type UserRoleRow = {
  id: number;
  profile_id: number;
  role: DatabaseRole;
  created_at: string;
};

export type AcademyYearRow = {
  id: number;
  title: string;
  starts_on: string;
  ends_on: string;
  is_active: boolean;
  created_at: string;
};

export type AgeGroupRow = {
  id: number;
  title: string;
  min_age: number;
  max_age: number;
  position: number;
  created_at: string;
  date_time: string | null;
};

export type ChildRow = {
  id: number;
  parent_profile_id: number;
  display_name: string;
  birth_date: string | null;
  age_group_id: number;
  avatar_key: string | null;
  created_at: string;
  gender: "male" | "female" | null;
};

export type LearningJourneyRow = {
  id: number;
  academy_year_id: number;
  age_group_id: number;
  title: string;
  description: string | null;
  position: number;
  is_published: boolean;
  created_at: string;
};

export type LessonRow = {
  id: number;
  learning_journey_id: number;
  title: string;
  description: string | null;
  intro_text: string;
  status: LessonStatus;
  position: number;
  publish_at: string | null;
  replay_url: string | null;
  is_released: boolean;
  released_at: string | null;
  released_by_profile_id: number | null;
  created_at: string;
  youtube_url: string | null;
};

export type LessonStepRow = {
  id: number;
  lesson_id: number;
  step_type: LessonStepType;
  title: string | null;
  content: Json;
  position: number;
  created_at: string;
};

export type GroupRow = {
  id: number;
  academy_year_id: number;
  teacher_profile_id: number | null;
  name: string;
  age_group_id: number;
  schedule_label: string;
  created_at: string;
};

export type GroupMemberRow = {
  id: number;
  group_id: number;
  child_id: number;
  membership_status: GroupMembershipStatus;
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by_profile_id: number | null;
  created_at: string;
};

export type LiveSessionRow = {
  id: number;
  lesson_id: number;
  group_id: number | null;
  title: string | null;
  starts_at: string;
  ends_at: string;
  meeting_url: string | null;
  replay_url: string | null;
  status: LiveSessionStatus;
  created_at: string;
};

export type LessonQuizRow = {
  id: number;
  lesson_id: number;
  title: string;
  description: string | null;
  passing_percent: number;
  is_published: boolean;
  released_at: string | null;
  released_by_profile_id: number | null;
  created_at: string;
};

export type QuizQuestionRow = {
  id: number;
  quiz_id: number;
  question_text: string;
  position: number;
  created_at: string;
};

export type QuizOptionRow = {
  id: number;
  question_id: number;
  option_text: string;
  position: number;
  created_at: string;
};

export type QuizAnswerKeyRow = {
  id: number;
  question_id: number;
  correct_option_id: number;
  explanation: string | null;
  created_at: string;
};

export type QuizAttemptRow = {
  id: number;
  child_id: number;
  quiz_id: number;
  correct_answers: number;
  total_questions: number;
  score_percent: number;
  passed: boolean;
  submitted_at: string;
  created_at: string;
};

export type QuizAttemptAnswerRow = {
  id: number;
  attempt_id: number;
  question_id: number;
  selected_option_id: number;
  is_correct: boolean;
  created_at: string;
};

export type ChildLessonProgressRow = {
  id: number;
  child_id: number;
  lesson_id: number;
  status: ProgressStatus;
  progress_percent: number;
  last_opened_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type ChildStepProgressRow = {
  id: number;
  child_id: number;
  lesson_step_id: number;
  completed_at: string;
  created_at: string;
};

export type SubmissionRow = {
  id: number;
  child_id: number;
  lesson_id: number;
  lesson_step_id: number | null;
  submission_type: SubmissionType;
  text_value: string | null;
  storage_path: string | null;
  submitted_at: string;
  created_at: string;
};

export type BadgeRow = {
  id: number;
  age_group_id: number | null;
  title: string;
  description: string | null;
  icon_key: string;
  created_at: string;
};

export type ChildBadgeRow = {
  id: number;
  child_id: number;
  badge_id: number;
  lesson_id: number | null;
  awarded_at: string;
  created_at: string;
};

export type MediaAssetRow = {
  id: number;
  age_group_id: number | null;
  uploaded_by_profile_id: number | null;
  media_type: MediaType;
  bucket_name: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export type LessonDocumentRow = {
  id: number;
  lesson_id: number;
  media_asset_id: number;
  title: string;
  position: number;
  created_at: string;
};

export type MessageRow = {
  id: number;
  sender_profile_id: number | null;
  recipient_profile_id: number | null;
  group_id: number | null;
  audience: MessageAudience;
  subject: string;
  body: string;
  published_at: string | null;
  created_at: string;
};

export type MessageReadRow = {
  id: number;
  message_id: number;
  profile_id: number;
  read_at: string;
  created_at: string;
};

export type PaymentAgreementRow = {
  id: number;
  auth_user_id: string | null;
  payment_method: PaymentMethod;
  payer_name: string | null;
  monthly_amount_cents: number;
  payment_accepted: boolean;
  accepted_at: string;
  agreement_status: PaymentAgreementStatus;
  consent_version: number;
  created_at: string;
  updated_at: string;
};

export type MonthlyPaymentRow = {
  id: number;
  payment_agreement_id: number;
  billing_month: string;
  amount_cents: number;
  status: MonthlyPaymentStatus;
  paid_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminAccountSummary = {
  profile_id: number;
  display_name: string;
  email: string | null;
  account_role: DatabaseRole;
  profile_created_at: string;
  age_group_id: number | null;
  portrait_path: string | null;
  portrait_url: string | null;
};

export type TeachingContact = Pick<AdminAccountSummary,
  'profile_id' | 'display_name' | 'email' | 'account_role' | 'age_group_id' | 'portrait_path' | 'portrait_url'
>;

export type AcademyData = {
  teachingContacts: TeachingContact[];
  profiles: ProfileRow[];
  userRoles: UserRoleRow[];
  academyYears: AcademyYearRow[];
  ageGroups: AgeGroupRow[];
  children: ChildRow[];
  journeys: LearningJourneyRow[];
  lessons: LessonRow[];
  lessonSteps: LessonStepRow[];
  groups: GroupRow[];
  groupMembers: GroupMemberRow[];
  liveSessions: LiveSessionRow[];
  quizzes: LessonQuizRow[];
  quizQuestions: QuizQuestionRow[];
  quizOptions: QuizOptionRow[];
  quizAnswerKeys: QuizAnswerKeyRow[];
  quizAttempts: QuizAttemptRow[];
  quizAttemptAnswers: QuizAttemptAnswerRow[];
  lessonProgress: ChildLessonProgressRow[];
  stepProgress: ChildStepProgressRow[];
  submissions: SubmissionRow[];
  badges: BadgeRow[];
  childBadges: ChildBadgeRow[];
  mediaAssets: MediaAssetRow[];
  lessonDocuments: LessonDocumentRow[];
  messages: MessageRow[];
  messageReads: MessageReadRow[];
};

export const emptyDatabaseData: AcademyData = {
  teachingContacts: [],
  profiles: [],
  userRoles: [],
  academyYears: [],
  ageGroups: [],
  children: [],
  journeys: [],
  lessons: [],
  lessonSteps: [],
  groups: [],
  groupMembers: [],
  liveSessions: [],
  quizzes: [],
  quizQuestions: [],
  quizOptions: [],
  quizAnswerKeys: [],
  quizAttempts: [],
  quizAttemptAnswers: [],
  lessonProgress: [],
  stepProgress: [],
  submissions: [],
  badges: [],
  childBadges: [],
  mediaAssets: [],
  lessonDocuments: [],
  messages: [],
  messageReads: [],
};

export type AcademyTableRowMap = {
  profiles: ProfileRow;
  user_roles: UserRoleRow;
  academy_years: AcademyYearRow;
  age_groups: AgeGroupRow;
  children: ChildRow;
  learning_journeys: LearningJourneyRow;
  lessons: LessonRow;
  lesson_steps: LessonStepRow;
  groups: GroupRow;
  group_members: GroupMemberRow;
  live_sessions: LiveSessionRow;
  lesson_quizzes: LessonQuizRow;
  quiz_questions: QuizQuestionRow;
  quiz_options: QuizOptionRow;
  quiz_answer_keys: QuizAnswerKeyRow;
  quiz_attempts: QuizAttemptRow;
  quiz_attempt_answers: QuizAttemptAnswerRow;
  child_lesson_progress: ChildLessonProgressRow;
  child_step_progress: ChildStepProgressRow;
  submissions: SubmissionRow;
  badges: BadgeRow;
  child_badges: ChildBadgeRow;
  media_assets: MediaAssetRow;
  lesson_documents: LessonDocumentRow;
  messages: MessageRow;
  message_reads: MessageReadRow;
  payment_agreements: PaymentAgreementRow;
  monthly_payments: MonthlyPaymentRow;
};

export type AcademyTableName = keyof AcademyTableRowMap;
export type AcademyInsert<K extends AcademyTableName> = Partial<
  Omit<AcademyTableRowMap[K], 'id' | 'created_at'>
>;
export type AcademyUpdate<K extends AcademyTableName> = Partial<
  Omit<AcademyTableRowMap[K], 'id' | 'created_at'>
>;

export type LessonEditorInput = {
  id?: number;
  learningJourneyId: number;
  title: string;
  description?: string;
  introText: string;
  status: LessonStatus;
  position: number;
  youtubeUrl?: string | null;
  publishAt?: string | null;
  replayUrl?: string | null;
  liveSession?: {
    id?: number;
    title?: string;
    startsAt: string;
    endsAt: string;
    meetingUrl?: string;
  } | null;
};

export type QuizEditorInput = {
  lessonId: number;
  title: string;
  description?: string;
  passingPercent: number;
  isPublished: boolean;
  questions: {
    questionText: string;
    explanation?: string;
    options: {
      optionText: string;
      isCorrect: boolean;
    }[];
  }[];
};

export type QuizSubmissionResult = {
  attempt_id: number;
  correct_answers: number;
  total_questions: number;
  score_percent: number;
  passed: boolean;
  answers: (Pick<
    QuizAttemptAnswerRow,
    'question_id' | 'selected_option_id' | 'is_correct'
  > & {
    correct_option_id: number;
  })[];
};
