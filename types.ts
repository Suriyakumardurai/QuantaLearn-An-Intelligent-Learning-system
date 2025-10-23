
export interface User {
  id: string;
  email: string;
  name?: string;
  age?: number;
  bio?: string;
  apiKey?: string;
}

export enum QuizType {
  MCQ = 'MCQ', // Multiple Choice Question
  MSQ = 'MSQ', // Multiple Select Question
  FIB = 'FIB', // Fill In The Blanks,
}

export interface Question {
  question: string;
  type: QuizType;
  options?: string[];
  correctAnswers: string[];
}

export interface Quiz {
  title: string;
  questions: Question[];
}

export enum GenerationState {
    LOCKED = 'LOCKED',
    GENERATING = 'GENERATING',
    READY = 'READY',
    FAILED = 'FAILED',
}

export interface Module {
  title: string;
  objective: string;
  content?: string;
  quiz?: Quiz;
  isCompleted: boolean;
  generationState: GenerationState;
  quizScore?: number;
}

export interface Badge {
  courseTitle: string;
  score: number;
  dateAwarded: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  modules: Module[];
  badge?: Badge;
  unlockedModuleIndex: number;
  isCompleted: boolean;
  mockTest?: Quiz;
  mockTestState?: GenerationState;
  mockTestScore?: number;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  courses: Course[];
  unlockedCourseIndex: number;
}