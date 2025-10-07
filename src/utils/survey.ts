import { Language } from "../context/LanguageContext";
import { getTranslation } from "../i18n";
import { supabase } from "../lib/supabase";
import { Survey, SurveyQuestion } from "../types/survey";

// Rate limiting configuration
const SURVEY_RATE_LIMIT_PER_HOUR = 5; // User can submit maximum 5 surveys per hour

/**
 * Get the current rate limit configuration
 */
export function getSurveyRateLimit(): number {
  return SURVEY_RATE_LIMIT_PER_HOUR;
}

/**
 * Check if user can submit a survey response based on rate limiting
 * @param userId The user ID to check
 * @returns Promise with result indicating if user can submit and next available time
 */
export async function checkSurveyRateLimit(userId: string): Promise<{
  canSubmit: boolean;
  nextAvailableTime?: Date;
  submissionsInLastHour: number;
}> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  console.log("Rate limit check:", {
    userId,
    oneHourAgo: oneHourAgo.toISOString(),
    currentTime: new Date().toISOString(),
    limit: SURVEY_RATE_LIMIT_PER_HOUR,
  });

  // Count submissions in the last hour
  const { count, error, data } = await supabase
    .from("survey_responses")
    .select("id, submitted_at, survey_id", { count: "exact" })
    .eq("user_id", userId)
    .eq("status", "submitted")
    .gte("submitted_at", oneHourAgo.toISOString());

  console.log("Rate limit query result:", {
    count,
    error,
    dataLength: data?.length,
    responses: data?.map((r) => ({
      id: r.id,
      submitted_at: r.submitted_at,
      survey_id: r.survey_id,
    })),
  });

  if (error) {
    console.error("Error checking rate limit:", error);
    // If we can't check, allow submission (fail open)
    return { canSubmit: true, submissionsInLastHour: 0 };
  }

  const submissionsInLastHour = count || 0;
  console.log(
    `User ${userId} has submitted ${submissionsInLastHour} surveys in the last hour (limit: ${SURVEY_RATE_LIMIT_PER_HOUR})`
  );

  if (submissionsInLastHour >= SURVEY_RATE_LIMIT_PER_HOUR) {
    console.log("Rate limit exceeded, calculating next available time...");

    // Get the oldest submission in the last hour to calculate next available time
    const { data: oldestSubmission } = await supabase
      .from("survey_responses")
      .select("submitted_at")
      .eq("user_id", userId)
      .eq("status", "submitted")
      .gte("submitted_at", oneHourAgo.toISOString())
      .order("submitted_at", { ascending: true })
      .limit(1)
      .single();

    let nextAvailableTime: Date | undefined;
    if (oldestSubmission) {
      // Next available time is 1 hour after the oldest submission
      nextAvailableTime = new Date(
        new Date(oldestSubmission.submitted_at).getTime() + 60 * 60 * 1000
      );
      console.log("Next available time:", nextAvailableTime.toISOString());
    }

    return {
      canSubmit: false,
      nextAvailableTime,
      submissionsInLastHour,
    };
  }

  console.log("Rate limit check passed, user can submit");
  return { canSubmit: true, submissionsInLastHour };
}

/**
 * Submits a survey response and its answers to Supabase.
 * @param survey The survey object
 * @param answers An object mapping question_id to answer value
 * @param completionTimeSeconds Optional completion time in seconds
 * @returns {Promise<{ success: boolean; error?: string; errorType?: string; nextAvailableTime?: Date }>}
 */
export async function submitSurveyResponse(
  survey: Survey,
  answers: Record<string, any>,
  completionTimeSeconds?: number
): Promise<{
  success: boolean;
  error?: string;
  errorType?: string;
  nextAvailableTime?: Date;
  submissionsInLastHour?: number;
}> {
  // 1. Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, error: "User not authenticated" };
  }

  // 2. Check rate limit
  const rateLimitCheck = await checkSurveyRateLimit(user.id);
  if (!rateLimitCheck.canSubmit) {
    return {
      success: false,
      error: "Rate limit exceeded",
      errorType: "RATE_LIMIT_EXCEEDED",
      nextAvailableTime: rateLimitCheck.nextAvailableTime,
      submissionsInLastHour: rateLimitCheck.submissionsInLastHour,
    };
  }

  // 3. Insert into survey_responses
  // give the user a reward based on the survey's reward type
  // for now only per-survey and hybrid rewards are supported
  const rewardAmount = getSurveyReward(survey);
  const responseInsertData: any = {
    survey_id: survey.id,
    user_id: user.id,
    status: "submitted",
    reward_gained: rewardAmount,
  };

  // Add completion time if provided
  if (completionTimeSeconds !== undefined) {
    responseInsertData.completion_time_seconds = completionTimeSeconds;
  }

  const { data: responseData, error: responseError } = await supabase
    .from("survey_responses")
    .insert([responseInsertData])
    .select("id")
    .single();

  if (responseError || !responseData) {
    // Check if this is a survey quota full error
    if (responseError?.message?.includes("SURVEY_QUOTA_FULL")) {
      const quotaMessage =
        responseError.message.split("SURVEY_QUOTA_FULL: ")[1] ||
        "Thank you for your interest! This survey has just reached its maximum number of participants. Please explore other available surveys that you can participate in.";
      return {
        success: false,
        error: quotaMessage,
        errorType: "QUOTA_FULL",
      };
    }

    return {
      success: false,
      error: responseError?.message || "Failed to create response",
    };
  }

  const responseId = responseData.id;

  // 4. Prepare answers for bulk insert
  const answersToInsert = Object.entries(answers).map(
    ([questionId, answerValue]) => ({
      response_id: responseId,
      question_id: questionId,
      answer:
        typeof answerValue === "object" ? answerValue : { value: answerValue },
      // answered_at will default to now()
    })
  );

  // 5. Insert into survey_answers
  const { error: answersError } = await supabase
    .from("survey_answers")
    .insert(answersToInsert);

  if (answersError) {
    return { success: false, error: answersError.message };
  }

  // 6. Create credit transaction for the participant's reward
  if (rewardAmount > 0) {
    const { error: creditError } = await supabase
      .from("credit_transactions")
      .insert({
        user_id: user.id,
        transaction_type: "reward", // This is earnings for the participant
        credit_amount: rewardAmount,
        status: "completed",
        description: `Survey completion reward for "${survey.name}"`,
        related_survey_id: survey.id,
      });

    if (creditError) {
      console.error("Failed to create credit transaction:", creditError);
      // Don't fail the entire submission if credit transaction fails
      // The response is already recorded
    } else {
      // Create notification for the participant about their reward
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: user.id,
          type: "survey_reward",
          title: "Survey Reward Earned",
          message: `You earned ${rewardAmount} credits for completing the survey "${survey.name}"`,
          survey_id: survey.id,
          data: {
            reward_amount: rewardAmount,
            survey_name: survey.name,
            survey_id: survey.id,
          },
        });

      if (notificationError) {
        console.error(
          "Failed to create reward notification:",
          notificationError
        );
      }
    }
  }

  return { success: true };
}

function getSurveyReward(survey: Survey): number {
  if (survey.reward_type === "per-survey" || survey.reward_type === "hybrid") {
    return survey.per_survey_reward || 0;
  } else if (survey.reward_type === "lottery") {
    return survey.lottery_tiers?.[0]?.amount || 0; // Assuming lottery tiers are sorted by amount
  }
  return 0;
}

export async function cloneSurvey(surveyId: string, userId: string) {
  // 1. Fetch the survey
  const { data: survey, error: surveyError } = await supabase
    .from("surveys")
    .select("*")
    .eq("id", surveyId)
    .single();
  if (surveyError || !survey)
    throw new Error(surveyError?.message || "Survey not found");

  // 2. Fetch the questions
  const { data: questions, error: questionsError } = await supabase
    .from("survey_questions")
    .select("*")
    .eq("survey_id", surveyId);
  if (questionsError) throw new Error(questionsError.message);

  // 3. Insert new survey (change name, reset dates, etc.)
  const { id, ...surveyWithoutId } = survey;
  const { data: newSurvey, error: insertError } = await supabase
    .from("surveys")
    .insert([
      {
        ...surveyWithoutId,
        name: survey.name + " (Clone)",
        created_at: new Date().toISOString(),
        status: "draft",
        payment_status: "pending",
        payment_amount: 0, // Reset payment amount for clone
        start_date: new Date().toISOString(), // by default start now
        end_date: null,
        manual_end: true,
        creator_id: userId,
      },
    ])
    .select("*")
    .single();
  if (insertError || !newSurvey)
    throw new Error(insertError?.message || "Failed to clone survey");

  // 4. Fetch survey tags
  const { data: surveyTags } = await supabase
    .from("survey_tags")
    .select("tag_id")
    .eq("survey_id", surveyId);

  // 5. Insert cloned survey tags
  if (surveyTags && surveyTags.length > 0) {
    const newSurveyTags = surveyTags.map(({ tag_id }) => ({
      survey_id: newSurvey.id,
      tag_id,
    }));
    const { error: insertTagsError } = await supabase
      .from("survey_tags")
      .insert(newSurveyTags);
    if (insertTagsError) throw new Error(insertTagsError.message);
  }

  // 6. Fetch and clone sections
  const { data: sections, error: sectionError } = await supabase
    .from("survey_sections")
    .select("*")
    .eq("survey_id", surveyId);
  if (sectionError) return { success: false, error: sectionError.message };

  // 7. Insert cloned sections
  const sectionIdMap: Record<string, string> = {};
  const clonedSections = (sections || []).map((section) => {
    const newSectionId = crypto.randomUUID();
    sectionIdMap[section.id] = newSectionId;
    return {
      ...section,
      id: newSectionId,
      survey_id: newSurvey.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  if (clonedSections.length > 0) {
    const { error: insertSectionError } = await supabase
      .from("survey_sections")
      .insert(clonedSections);
    if (insertSectionError)
      return { success: false, error: insertSectionError.message };
  }

  // 8. Insert cloned questions
  const newQuestions = questions.map(({ id, ...q }) => ({
    ...q,
    section_id: sectionIdMap[q.section_id] || null, // Map old section IDs to new ones
    survey_id: newSurvey.id,
    created_at: new Date().toISOString(),
  }));
  if (newQuestions.length > 0) {
    const { error: qInsertError } = await supabase
      .from("survey_questions")
      .insert(newQuestions);
    if (qInsertError) throw new Error(qInsertError.message);
  }
  return newSurvey;
}

export async function endSurvey(surveyId: string): Promise<{
  success: boolean;
  message: string;
  details?: {
    refundsProcessed: boolean;
    lotteryProcessed: boolean;
    errors?: string[];
  };
}> {
  try {
    // Fetch the survey to check manual end
    const { data: survey, error } = await supabase
      .from("surveys")
      .select("*")
      .eq("id", surveyId)
      .single();

    if (error || !survey) {
      throw new Error(error?.message || "Survey not found");
    }

    // Only allow manual end
    if (!survey.manual_end) {
      throw new Error("Survey is not set to manual end.");
    }

    // Update end_date and status
    const { error: updateError } = await supabase
      .from("surveys")
      .update({
        end_date: new Date().toISOString(),
        status: "finished",
      })
      .eq("id", surveyId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Process lottery distribution and credit refunds immediately
    const details = {
      refundsProcessed: false,
      lotteryProcessed: false,
      errors: [] as string[],
    };

    try {
      console.log("Processing lottery rewards for survey:", surveyId);
      const { error: lotteryError } = await supabase.rpc(
        "process_survey_lottery_rewards"
      );
      if (lotteryError) {
        console.error("Failed to process lottery rewards:", lotteryError);
        details.errors.push(
          `Lottery processing failed: ${lotteryError.message}`
        );
      } else {
        console.log("Lottery rewards processed successfully");
        details.lotteryProcessed = true;
      }
    } catch (error) {
      console.error("Exception in lottery processing:", error);
      details.errors.push(`Lottery processing exception: ${error}`);
    }

    try {
      console.log("Processing credit refunds for survey:", surveyId);
      const { error: refundError } = await supabase.rpc(
        "process_survey_credit_refunds"
      );
      if (refundError) {
        console.error("Failed to process credit refunds:", refundError);
        details.errors.push(`Refund processing failed: ${refundError.message}`);
      } else {
        console.log("Credit refunds processed successfully");
        details.refundsProcessed = true;
      }
    } catch (error) {
      console.error("Exception in refund processing:", error);
      details.errors.push(`Refund processing exception: ${error}`);
    }

    // Determine success message
    let message = "Survey ended successfully.";
    if (details.refundsProcessed && details.lotteryProcessed) {
      message += " Credits have been refunded and lottery prizes distributed.";
    } else if (details.refundsProcessed) {
      message += " Credits have been refunded.";
    } else if (details.lotteryProcessed) {
      message += " Lottery prizes have been distributed.";
    }

    if (details.errors.length > 0) {
      message +=
        " Some post-processing issues occurred but the survey was ended successfully.";
    }

    return {
      success: true,
      message,
      details,
    };
  } catch (error) {
    console.error("Error ending survey:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Add credits to a user's balance and create a transaction record
 */
export async function addUserCredits(
  userId: string,
  amount: number,
  reason: string,
  surveyId?: string
): Promise<boolean> {
  try {
    console.log("addUserCredits called with:", {
      userId,
      amount,
      reason,
      surveyId,
    });

    // Instead of updating profiles table, create a credit transaction record
    // This is the proper way to handle credits in your system
    const { error: transactionError } = await supabase
      .from("credit_transactions")
      .insert({
        user_id: userId,
        transaction_type: "refund",
        credit_amount: amount,
        status: "completed",
        description: reason,
        related_survey_id: surveyId,
      });

    if (transactionError) {
      console.error("Error creating refund transaction:", transactionError);
      throw new Error(
        transactionError.message || "Failed to create refund transaction"
      );
    }

    console.log("Refund transaction created successfully");

    // Create notification for the user
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        type: "credit_refund",
        title: `Credits Refunded: ${amount}`,
        message: reason,
        survey_id: surveyId,
        data: {
          credits_refunded: amount,
          reason: reason,
        },
      });

    if (notificationError)
      console.error("Failed to create notification:", notificationError);

    return true;
  } catch (error) {
    console.error("Error adding credits:", error);
    return false;
  }
}

/**
 * Cancels a survey and processes refunds based on the survey status
 * - For 'waiting-for-live' surveys: Full refund except translation fees
 * - For 'live' surveys: Prorated refund based on completed responses
 * - For 'draft' surveys with payment: Full refund
 */
export async function cancelSurvey(surveyId: string): Promise<{
  success: boolean;
  message: string;
  refundAmount?: number;
}> {
  try {
    // 1. Fetch survey details including creator ID and payment details
    const { data: survey, error } = await supabase
      .from("surveys")
      .select("*, creator:profiles!creator_id(*)")
      .eq("id", surveyId)
      .single();

    if (error || !survey) {
      throw new Error(error?.message || "Survey not found");
    }

    // 2. Check if survey status allows for cancellation (must be waiting-for-live or live)
    if (
      survey.status !== "waiting-for-live" && // only allow cancel from waiting-for-live or live
      survey.status !== "live" &&
      !(survey.status === "draft" && survey.payment_status === "paid") // allow cancel from draft if already paid
    ) {
      return {
        success: false,
        message: `Survey cannot be cancelled from ${survey.status} status`,
      };
    }

    let refundAmount = 0;
    let refundReason = "";

    // 3. Calculate refund amount based on survey status
    if (
      survey.status === "waiting-for-live" ||
      (survey.status === "draft" && survey.payment_status === "paid")
    ) {
      // Full refund except translation fees
      const totalPaymentAmount = survey.payment_amount || 0;
      const translationFee = survey.translation_fee || 0;
      refundAmount = totalPaymentAmount - translationFee;
      refundReason = `Full refund for cancelled survey (${surveyId}) minus translation fees`;
    } else if (survey.status === "live") {
      // For live surveys, calculate prorated refund based on responses
      // Get count of completed responses
      const { count: responseCount, error: countError } = await supabase
        .from("survey_responses")
        .select("*", { count: "exact", head: true })
        .eq("survey_id", surveyId)
        .eq("status", "submitted");

      if (countError) throw new Error(countError.message);

      const completedResponses = responseCount || 0;

      // Calculate refund based on reward type
      if (
        survey.reward_type === "per-survey" ||
        survey.reward_type === "hybrid"
      ) {
        const perSurveyReward = survey.per_survey_reward || 0;
        const targetCount = survey.target_respondent_count || 0;

        // Calculate unused slots
        const unusedSlots = Math.max(0, targetCount - completedResponses);
        refundAmount = unusedSlots * perSurveyReward;

        refundReason = `Prorated refund for ${unusedSlots} unused response slots out of ${targetCount} total slots`;
      } else if (survey.reward_type === "lottery" && completedResponses === 0) {
        // For lottery with no responses, refund full amount
        refundAmount = survey.payment_amount || 0;
        refundReason = "Full refund for lottery survey with no responses";
      } else if (survey.reward_type === "lottery" && completedResponses > 0) {
        // For lottery with responses, no refund as lottery is already processed
        refundAmount = 0;
        refundReason =
          "No refund for lottery survey with existing responses (lottery already processed)";
      }
    }

    // 4. Process refund if amount > 0
    if (refundAmount > 0 && survey.creator?.id) {
      console.log("Processing refund:", {
        userId: survey.creator.id,
        amount: refundAmount,
        reason: refundReason,
      });

      const refundSuccess = await addUserCredits(
        survey.creator.id,
        refundAmount,
        refundReason,
        surveyId
      );

      if (!refundSuccess) {
        console.error("Refund failed");
        return {
          success: false,
          message: "Failed to process refund",
        };
      }

      console.log("Refund successful:", refundAmount);
    } else {
      console.log("No refund to process:", {
        refundAmount,
        hasCreatorId: Boolean(survey.creator?.id),
      });
    }

    // 5. Update survey status to canceled
    const { error: updateError } = await supabase
      .from("surveys")
      .update({
        status: "canceled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", surveyId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Check if the refund was actually processed
    if (refundAmount > 0 && survey.creator?.id) {
      // Verify the credits were added by fetching current balance from the proper view
      const { data: creditBalance } = await supabase
        .from("user_credit_balance")
        .select("credits")
        .eq("user_id", survey.creator.id)
        .single();

      console.log("Final credit balance check:", creditBalance?.credits);
    }

    return {
      success: true,
      message:
        refundAmount > 0
          ? `Survey cancelled successfully. ${refundAmount} credits refunded.`
          : "Survey cancelled successfully. No credits refunded.",
      refundAmount: refundAmount,
    };
  } catch (error) {
    console.error("Error cancelling survey:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// Add this validation function inside your component
export function validateSurvey(
  survey: Survey,
  questions: SurveyQuestion[]
): string | null {
  if (!survey.name?.trim()) return "Survey name is required.";
  // if (!survey.description?.trim()) return "Survey description is required.";
  if (!survey.target_countries || survey.target_countries.length === 0)
    return "At least one target country is required.";
  // Only require start_date if not manual start
  if (!survey.manual_start && !survey.start_date)
    return "Start date is required.";
  if (!survey.end_date && !survey.manual_end) return "End date is required.";
  if (!questions.length) return "At least one question is required.";
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.question?.trim()) return `Question ${i + 1} text is required.`;
    if (!q.type) return `Question ${i + 1} type is required.`;
    if (
      (q.type === "radio" || q.type === "checkbox" || q.type === "select") &&
      (!q.options || q.options.length < 2)
    ) {
      return `Question ${i + 1} must have at least 2 options.`;
    }
    if (q.type === "scale" && (!q.options || q.options.length !== 3)) {
      return `Question ${
        i + 1
      } (Linear Scale) must have exactly 3 options: min, max, and step values.`;
    }
  }
  return null;
}

export function validateSurveySettings(
  survey: Survey,
  language: Language
): {
  errorTitle: string;
  errorMessage: string;
} {
  const settings = survey;
  let errorTitle = "";
  let errorMessage = "";

  // check the respondent count can't be null or less than 1
  if (
    !settings.target_respondent_count ||
    settings.target_respondent_count < 1
  ) {
    errorTitle = getTranslation("alert.error.validationError", language);
    errorMessage = getTranslation(
      "surveyBuilder.validationError.targetRespondentCountRequired",
      language
    );
  } else if (Object.keys(settings.required_info || {}).length === 0) {
    errorTitle = getTranslation("alert.error.validationError", language);
    errorMessage = getTranslation(
      "surveyBuilder.validationError.requiredInfoRequired",
      language
    );
  } else if (
    settings.start_date &&
    settings.end_date &&
    new Date(settings.start_date) >= new Date(settings.end_date)
  ) {
    errorTitle = getTranslation("alert.error.validationError", language);
    errorMessage = getTranslation(
      "surveyBuilder.validationError.startDateBeforeEndDate",
      language
    );
  } else if (!settings.manual_end && !settings.end_date) {
    errorTitle = getTranslation("alert.error.validationError", language);
    errorMessage = getTranslation(
      "surveyBuilder.validationError.endDateRequired",
      language
    );
  }

  // also need to check the prize,
  // if per survey reward is selected, it must be greater than 0
  // if lottery is selected, it must have at least one tier
  // if hybrid is selected, it must have at least one tier and per survey reward must be greater than 0
  if (settings.reward_type === "per-survey") {
    if (!settings.per_survey_reward || settings.per_survey_reward <= 0) {
      errorTitle = getTranslation("alert.error.validationError", language);
      errorMessage = getTranslation(
        "surveyBuilder.validationError.perSurveyRewardRequired",
        language
      );
    }
  } else if (settings.reward_type === "lottery") {
    if (!settings.lottery_tiers || settings.lottery_tiers.length === 0) {
      errorTitle = getTranslation("alert.error.validationError", language);
      errorMessage = getTranslation(
        "surveyBuilder.validationError.lotteryTiersRequired",
        language
      );
    }
  } else if (settings.reward_type === "hybrid") {
    if (!settings.lottery_tiers || settings.lottery_tiers.length === 0) {
      errorTitle = getTranslation("alert.error.validationError", language);
      errorMessage = getTranslation(
        "surveyBuilder.validationError.lotteryTiersRequired",
        language
      );
    }
    if (!settings.per_survey_reward || settings.per_survey_reward <= 0) {
      errorTitle = getTranslation("alert.error.validationError", language);
      errorMessage = getTranslation(
        "surveyBuilder.validationError.perSurveyRewardRequired",
        language
      );
    }
  }

  return {
    errorTitle,
    errorMessage,
  };
}

/**
 * Validate complete survey before proceeding to payment
 * This includes basic settings validation plus questions validation
 */
export function validateSurveyForPayment(
  survey: Survey,
  sections: any[],
  language: Language
): {
  errorTitle: string;
  errorMessage: string;
} {
  // First validate the basic settings
  const settingsValidation = validateSurveySettings(survey, language);
  if (settingsValidation.errorTitle) {
    return settingsValidation;
  }

  // Check if survey name is provided
  if (!survey.name || survey.name.trim() === "") {
    return {
      errorTitle: getTranslation("alert.error.validationError", language),
      errorMessage: getTranslation(
        "surveyBuilder.validationError.nameRequired",
        language
      ),
    };
  }

  // Check if there are sections with questions
  const totalQuestions = sections.reduce(
    (total, section) => total + (section.questions?.length || 0),
    0
  );

  if (totalQuestions === 0) {
    return {
      errorTitle: getTranslation("alert.error.validationError", language),
      errorMessage: getTranslation(
        "surveyBuilder.validationError.questionsRequired",
        language
      ),
    };
  }

  // Check if sections have titles and at least one question
  for (const section of sections) {
    if (!section.title || section.title.trim() === "") {
      return {
        errorTitle: getTranslation("alert.error.validationError", language),
        errorMessage: getTranslation(
          "surveyBuilder.validationError.sectionTitleRequired",
          language
        ),
      };
    }

    // Check if section has at least one question
    if (!section.questions || section.questions.length === 0) {
      return {
        errorTitle: getTranslation("alert.error.validationError", language),
        errorMessage: getTranslation(
          "surveyBuilder.validationError.sectionMustHaveQuestion",
          language
        ),
      };
    }

    // Check if questions have text
    for (const question of section.questions || []) {
      if (!question.question || question.question.trim() === "") {
        return {
          errorTitle: getTranslation("alert.error.validationError", language),
          errorMessage: getTranslation(
            "surveyBuilder.validationError.questionTextRequired",
            language
          ),
        };
      }
    }
  }

  return {
    errorTitle: "",
    errorMessage: "",
  };
}
