export type RewardType = "per-survey" | "lottery" | "hybrid";
export type SurveyStatus =
  | "draft"
  | "waiting-for-live"
  | "live"
  | "finished"
  | "canceled"
  | "deleted";
export type PaymentStatus = "pending" | "paid" | "failed";

export interface LotteryTier {
  amount: number;
  winners: number;
}

import type { Language } from "../context/LanguageContext";

// UI-facing translation settings (used in components)
export interface TranslationSettings {
  mode: "none" | "auto" | "manual";
  primary: Language;
  secondary: Record<Language, string>;
}

// Database format for translation data
export interface TranslationLanguageData {
  mode: "auto" | "manual";
  value: string;
  hash?: string;
  updated_at?: string;
}

export interface TranslationDbFormat {
  primary: string;
  secondary: Record<string, TranslationLanguageData>;
}

// Option translation support - can be either a simple string or a translation object
export interface OptionTranslation {
  primary: string;
  secondary: Record<string, TranslationLanguageData>;
}

export type SurveyOption = string | OptionTranslation;

// New normalized survey option structure
export interface SurveyOptionEntity {
  id: string;
  question_id: string;
  value: string; // Primary option text
  value_translations?: TranslationDbFormat | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Survey {
  id?: string;
  creator_id: string;
  name: string;
  description?: string | null;
  primary_language?: Language; // The primary language selected by the user
  reward_type: RewardType;
  per_survey_reward?: number | null;
  lottery_tiers?: LotteryTier[] | null;
  status: SurveyStatus;
  target_countries?: string[] | null;
  required_info?: Record<string, boolean> | null;
  start_date?: string | null; // ISO string
  end_date?: string | null; // ISO string
  manual_start?: boolean; // If true, requires manual start after payment
  manual_end: boolean;
  target_respondent_count?: number | null;
  no_target_respondent: boolean;
  created_at?: string; // ISO string
  updated_at?: string; // ISO string
  title_translations?: TranslationDbFormat | null;
  description_translations?: TranslationDbFormat | null;
  // Payment tracking fields
  payment_status?: PaymentStatus;
  payment_amount?: number | null;
  paid_at?: string | null; // ISO string
}

// Survey questions
export type QuestionType =
  | "text"
  | "paragraph"
  | "radio"
  | "checkbox"
  | "select"
  | "scale"
  | "date"
  | "time"
  | "i_text"; // prefix i to indicate information

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  question: string;
  section_id?: string | null; // optional, if the question belongs to a section
  description?: string | null;
  type: QuestionType;
  options?: SurveyOption[] | null; // Legacy field - will be deprecated
  survey_options?: SurveyOptionEntity[] | null; // New normalized options
  required: boolean;
  allow_other?: boolean; // Allow "Other" option for radio, select, checkbox questions
  media?: {
    type: "image" | "video";
    url: string;
  } | null;
  style?: {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: string;
    textAlign?: string;
  } | null;
  order?: number | null;
  created_at: string;
  updated_at: string;
  question_translations?: TranslationSettings | null;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  user_id: string;
  submitted_at: string; // ISO string
  status: "submitted" | "draft"; // or just string if you allow more statuses
}

export interface SurveyAnswer {
  id: string;
  response_id: string;
  question_id: string;
  answer: string; // jsonb, can be typed more strictly if you want
  answered_at: string; // ISO string
}

export interface Tag {
  id: string;
  name: string;
  created_at?: string;
}

export interface TagTranslation {
  id: string;
  tag_id: string;
  language_code: string;
  translated_name: string;
  created_at: string;
}

export interface TagWithTranslations extends Tag {
  translations?: TagTranslation[];
  translated_name?: string; // Current translated name based on selected language
}

export interface SurveyTag {
  survey_id: string;
  tag_id: string;
}

export interface SurveyWithTags extends Survey {
  tags: Tag[];
  total_count?: number; // present only on the first row for pagination
}

export interface AnsweredSurvey extends SurveyWithTags {
  response: SurveyResponse;
  answers: SurveyAnswer[];
}

// Enhanced Branching/Conditional Logic Types
export type BranchingOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "is_blank"
  | "is_not_blank"
  | "less_than"
  | "greater_than"
  | "between";

export type LogicalOperator = "AND" | "OR";

export interface BranchingCondition {
  questionId: string;
  sectionId?: string; // For cross-section question references
  operator: BranchingOperator;
  value: string | number | [number, number]; // Range array for 'between' operator
  questionType: QuestionType; // To determine appropriate operators and UI
}

export interface BranchingConditionGroup {
  id: string;
  conditions: BranchingCondition[];
  conditionOperator: LogicalOperator; // How to combine conditions within this group
}

export interface BranchingRule {
  id: string;
  priority: number; // For hierarchical conflict resolution
  conditionGroups: BranchingConditionGroup[];
  groupOperator?: LogicalOperator; // How to combine groups (default: AND)
  nextSectionId: string | null; // Where to navigate if this rule matches
}

export interface EnhancedBranchingLogic {
  rules: BranchingRule[];
  defaultNextSectionId?: string | null; // Fallback if no rules match
}

// Legacy support - keep for backward compatibility
export interface LegacyBranchingRule {
  questionId: string;
  conditions: LegacyBranchingCondition[];
  defaultNextSectionId?: string | null;
}

export interface LegacyBranchingCondition {
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "greater_than"
    | "less_than";
  value: string | number;
  nextSectionId: string | null;
}

// Union type to support both legacy and enhanced formats
export type BranchingLogic = EnhancedBranchingLogic | LegacyBranchingRule;

// Utility types for branching
export interface BranchingConflict {
  ruleId1: string;
  ruleId2: string;
  priority1: number;
  priority2: number;
  conflictType:
    | "identical_conditions"
    | "overlapping_conditions"
    | "priority_conflict";
  description: string;
}

export interface BranchingValidationResult {
  isValid: boolean;
  conflicts: BranchingConflict[];
  warnings: string[];
  suggestions: string[];
}

// Type guards for branching logic
export function isEnhancedBranching(
  branching: BranchingLogic
): branching is EnhancedBranchingLogic {
  return (branching as EnhancedBranchingLogic).rules !== undefined;
}

export function isLegacyBranching(
  branching: BranchingLogic
): branching is LegacyBranchingRule {
  return (branching as LegacyBranchingRule).questionId !== undefined;
}

// Operator sets for different question types
export const TEXT_OPERATORS: BranchingOperator[] = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "is_blank",
  "is_not_blank",
];

export const NUMERIC_OPERATORS: BranchingOperator[] = [
  "equals",
  "not_equals",
  "less_than",
  "greater_than",
  "between",
];

export const CHOICE_OPERATORS: BranchingOperator[] = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
];

// Helper function to get available operators for a question type
export function getAvailableOperators(
  questionType: QuestionType
): BranchingOperator[] {
  switch (questionType) {
    case "text":
    case "paragraph":
      return TEXT_OPERATORS;
    case "scale":
    case "date":
    case "time":
      return NUMERIC_OPERATORS;
    case "radio":
    case "select":
    case "checkbox":
      return CHOICE_OPERATORS;
    default:
      return ["equals", "not_equals"];
  }
}

// Special navigation actions
export type NavigationAction =
  | "next_section"
  | "end_survey"
  | "jump_to_section";

export interface SurveySection {
  id: string;
  survey_id?: string;
  title: string;
  description?: string;
  order: number;
  branching?: BranchingLogic | null; // Enhanced branching logic supporting both new and legacy formats
  questions: SurveyQuestion[];
  created_at?: string; // ISO string
  title_translations?: TranslationSettings | null;
  description_translations?: TranslationSettings | null;
}
