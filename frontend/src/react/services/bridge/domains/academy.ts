import { bridgeInvoke } from "../http";

export interface AcademyLearnerProgress {
  completedLabs: string[];
  completedModules: string[];
  skillScores: Record<string, number>;
  portfolioEntryIds: string[];
  lastActive: string;
}

export interface AcademyPortfolioEntry {
  id: string;
  labId: string;
  labTitle: string;
  summary: string;
  commandsUsed: string[];
  findings: string[];
  mitreMappings: string[];
  skillsEarned: string[];
  timestamp: string;
}

export interface AcademyCompletionPayload {
  labId: string;
  labTitle: string;
  score: number;
  findings: string[];
  commandsUsed: string[];
  mitreMappings: string[];
  skillsEarned: string[];
  currentProgress: AcademyLearnerProgress;
}

export interface AcademyCompletionResult {
  portfolioId: string;
  updatedProgress: AcademyLearnerProgress;
}

export const academy = {
  async getProgress(): Promise<AcademyLearnerProgress> {
    return bridgeInvoke<AcademyLearnerProgress>("academy_get_progress");
  },
  async saveProgress(progress: AcademyLearnerProgress): Promise<{ status: string }> {
    return bridgeInvoke<{ status: string }>("academy_save_progress", { progress });
  },
  async savePortfolioEntry(entry: Omit<AcademyPortfolioEntry, "id">): Promise<{ id: string }> {
    return bridgeInvoke<{ id: string }>("academy_save_portfolio_entry", { entry });
  },
  async listPortfolio(): Promise<AcademyPortfolioEntry[]> {
    return bridgeInvoke<AcademyPortfolioEntry[]>("academy_list_portfolio");
  },
  async completeLab(payload: AcademyCompletionPayload): Promise<AcademyCompletionResult> {
    return bridgeInvoke<AcademyCompletionResult>("academy_complete_lab", payload);
  },
  async mentorQuery(payload: {
    context: string;
    question: string;
    history: { role: string; content: string }[];
  }): Promise<{ status: string }> {
    return bridgeInvoke<{ status: string }>("academy_mentor_query", payload);
  },
};
