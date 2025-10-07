export interface AnsweredSurvey {
  id: string;
  name: string;
  rewardsEarned: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  credits: number;
  profileImage?: string;
}
