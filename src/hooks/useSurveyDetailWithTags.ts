import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Survey } from "../types/survey";

export interface SurveyDetails extends Survey {
  tags: string[];
  questions: any[];
}

export function useSurveyDetails(surveyId?: string) {
  const [survey, setSurvey] = useState<SurveyDetails | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSurvey = async () => {
    setLoading(true);
    // Fetch survey
    const { data: surveyData } = await supabase
      .from("surveys")
      .select("*")
      .eq("id", surveyId)
      .single();

    // Fetch tags via survey_tags join
    const { data: tagJoins } = await supabase
      .from("survey_tags")
      .select("tags(name)")
      .eq("survey_id", surveyId);

    // Fetch questions
    const { data: questions } = await supabase
      .from("survey_questions")
      .select("*")
      .eq("survey_id", surveyId)
      .order("order", { ascending: true });

    setSurvey({
      ...(surveyData || {}),
      tags: tagJoins?.map((t: any) => t.tags?.name).filter(Boolean) || [],
      questions: questions || [],
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchSurvey();
  }, [surveyId]);

  return { survey, loading, refresh: fetchSurvey };
}
