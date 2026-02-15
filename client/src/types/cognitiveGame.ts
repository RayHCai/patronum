// Cognitive Game Types

export type GameType = 'memory_recall' | 'pattern_recognition' | 'image_matching';

export interface ImageOption {
  id: string;
  imageUrl: string;
  label: string;
}

export interface PatternOption {
  id: string;
  pattern: string[]; // Array of visual elements (emojis or icon names)
  label: string;
}

export interface GameQuestion {
  id: string;
  type: GameType;
  question: string;
  options: string[] | ImageOption[] | PatternOption[];
  correctAnswer: string;
  hint?: string;
  audioUrl?: string;
}

export interface GameAnswer {
  questionId: string;
  selectedAnswer: string;
  wasCorrect: boolean;
  timeSpent: number; // milliseconds
}

export interface CognitiveGameState {
  showGameChoice: boolean;
  showCognitiveGame: boolean;
  gameType: GameType | null;
  cognitiveGameQuestions: GameQuestion[];
  gameStartTime: number | null;
  gameScore: number;
  gameAnswers: GameAnswer[];
}
