import { GoogleGenAI, Type } from "@google/genai";
import { QuizType } from '../types';

const courseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    modules: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          objective: { type: Type.STRING },
        },
        required: ['title', 'objective'],
      },
    },
  },
  required: ['title', 'description', 'modules'],
};

const learningPathSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    courses: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          modules: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                objective: { type: Type.STRING },
              },
              required: ['title', 'objective'],
            },
          },
        },
        required: ['title', 'description', 'modules'],
      },
    },
  },
  required: ['title', 'description', 'courses'],
};


const quizSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          type: { type: Type.STRING, enum: [QuizType.MCQ, QuizType.MSQ] },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswers: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['question', 'type', 'options', 'correctAnswers'],
      },
    },
  },
  required: ['title', 'questions'],
};

const moduleContentAndQuizSchema = {
    type: Type.OBJECT,
    properties: {
        content: {
            type: Type.STRING,
            description: "The full educational content for the module in rich markdown format, including LaTeX for mathematical notations."
        },
        quiz: quizSchema
    },
    required: ['content', 'quiz']
};


export const generateCourseOutline = async (apiKey: string, topic: string, level: string, fileContent?: {mimeType: string, data: string}) => {
  if (!apiKey) throw new Error("A valid Gemini API key is required.");
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `You are an expert instructional designer named Quanta. Your task is to create a personalized, comprehensive learning path for a student. The student's knowledge level is '${level}'. Generate a structured course with a title, a short description, and a list of modules. Each module must have a title and a learning objective. The course must contain at least 10 detailed modules. Respond ONLY with a valid JSON object matching the provided schema.`;
  
  const promptParts: (string | { inlineData: { mimeType: string; data: string; } })[] = [
    `Create a learning path on the topic: "${topic}".`,
  ];
  
  if(fileContent) {
      if(fileContent.mimeType === 'text/plain') {
          promptParts.push(`The course should be based on the following document content:\n\n${fileContent.data}`);
      } else {
          promptParts.push({ inlineData: { mimeType: fileContent.mimeType, data: fileContent.data } });
          promptParts.push("The course should be based on the provided document.");
      }
  }

  const contents = { parts: promptParts.map(p => typeof p === 'string' ? { text: p } : p) };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: courseSchema,
      },
    });
    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error generating course outline:", error);
    throw new Error("Failed to generate course outline. Please check your API key and connection.");
  }
};

export const generateLearningPathOutline = async (apiKey: string, goal: string, level: string) => {
    if (!apiKey) throw new Error("A valid Gemini API key is required.");
    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = `You are an expert curriculum designer named Quanta. Your task is to deconstruct a major, ambitious learning goal into a structured "Learning Path". This path should consist of a series of logically sequenced, self-contained courses. For each course, you must provide a title, a short description, and a list of modules with their titles and objectives. The student's current knowledge level is '${level}'. The path must contain at least 10 comprehensive courses, and each of those courses must contain at least 10 detailed modules. Respond ONLY with a valid JSON object matching the provided schema.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create a comprehensive learning path for the goal: "${goal}".`,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: learningPathSchema,
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating learning path outline:", error);
        throw new Error("Failed to generate learning path outline. Please check your API key and connection.");
    }
};

export const generateModuleContentAndQuiz = async (apiKey: string, courseTitle: string, moduleTitle: string) => {
    if (!apiKey) throw new Error("A valid Gemini API key is required.");
    const ai = new GoogleGenAI({ apiKey });
    
    const systemInstruction = `You are a world-class educator and expert in technical writing and assessment design. Your task is to generate the detailed content for a specific module AND a quiz to test understanding of that content.
    
    You must respond with a single, valid JSON object that contains two keys: "content" and "quiz".
    
    **CONTENT REQUIREMENTS:**
    - The "content" value must be a single markdown string.
    - The content MUST be broken down into at least 10 distinct sub-modules.
    - Structure the content into logical sub-modules. Precede each sub-module's title with '## '. Do not use '## ' for anything else.
    - **CRITICAL: For all mathematical formulas, equations, vectors, matrices, and symbols, you MUST use LaTeX syntax.**
      - Inline math: $y = mx + b$
      - Block math: $$ \int_a^b f(x) \, dx $$
    - Use rich markdown for formatting: headings, lists, bold text, blockquotes, and external links.

    **FORMATTING RULES (VERY IMPORTANT):**
    - **DO NOT** add newlines before or after an inline LaTeX formula ($...$). It must flow naturally within the sentence.
      - Correct: "The formula for a line is $y=mx+b$ and it is linear."
      - Incorrect: "The formula for a line is\\n$y=mx+b$\\nand it is linear."
    - **DO NOT** split related inline formulas onto separate lines or list items. They must be on the same line, separated by commas or text as appropriate.
      - Correct Example: "Symbolic representations include boldface letters like $\\mathbf{A}$, $\\mathbf{v}$, $\\mathbf{F}$ (common in textbooks)."
      - Incorrect Example (this will break the layout):
        * $\\mathbf{A}$
        * $\\mathbf{v}$
        * $\\mathbf{F}$
        (common in textbooks)
    - Avoid using multiple consecutive newlines. Use single newlines to separate paragraphs.
  
    **QUIZ REQUIREMENTS:**
    - The "quiz" value must be a JSON object matching the provided quiz schema.
    - Create a quiz with 5-7 questions based *only* on the content you have just generated.
    - The quiz must include a mix of question types: Multiple Choice (MCQ) and Multiple Select (MSQ).
    - **CRITICAL: DO NOT generate any "fill-in-the-blank" or open-ended questions. Every question must have a list of options.**
    `;
    
    const prompt = `Generate the content and a quiz for the module "${moduleTitle}" which is part of the course "${courseTitle}".`;
  
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: moduleContentAndQuizSchema,
        },
      });
      const jsonText = response.text.trim();
      return JSON.parse(jsonText);
    } catch (error) {
      console.error("Error generating module content and quiz:", error);
      throw new Error("Failed to generate module content and quiz. Please check your API key.");
    }
};

export const generateMockTest = async (apiKey: string, courseTitle: string, modules: { title: string; objective: string }[]) => {
    if (!apiKey) throw new Error("A valid Gemini API key is required.");
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are an expert examiner. Your task is to create a single, comprehensive final "Mock Test" for a course. The test should cover all the modules provided.
    
    You must respond ONLY with a valid JSON object matching the provided quiz schema.
    
    **MOCK TEST REQUIREMENTS:**
    - The test should have a minimum of 10 questions to be comprehensive.
    - The questions must be based on the collective titles and objectives of ALL modules in the course.
    - The quiz must include a mix of question types: Multiple Choice (MCQ) and Multiple Select (MSQ).
    - **CRITICAL: DO NOT generate any "fill-in-the-blank" or open-ended questions. Every question must have a list of options.**
    - Ensure all mathematical notations in questions and options are formatted using LaTeX.
    - The difficulty should be appropriate for a final assessment to test mastery.
    `;

    const moduleSummaries = modules.map(m => `- ${m.title}: ${m.objective}`).join('\n');
    const prompt = `Generate a comprehensive mock test for the course "${courseTitle}". The course covers the following modules:\n\n${moduleSummaries}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: quizSchema,
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating mock test:", error);
        throw new Error("Failed to generate the mock test. Please check your API key.");
    }
};

export const clarifyDoubt = async (apiKey: string, question: string, context: string) => {
    if (!apiKey) throw new Error("A valid Gemini API key is required.");
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are Quanta, a friendly and exceptionally helpful AI tutor. Your primary goal is to help the student understand the provided material. The student has asked a question. Your task is to provide a clear, encouraging, and detailed explanation based on the provided "Context".
- If the question is a direct query about the text, answer it using the text.
- If the question is a request for clarification (e.g., "explain this clearly," "what does this mean?"), re-explain the relevant part of the context in simpler terms. Use analogies if it helps.
- Do not refuse to answer because the question isn't "specific." Interpret the student's intent and provide the most helpful explanation possible.
- Always be polite and encouraging. Your response should be grounded in the provided context.
    
Context:
${context}

Student's Question:
${question}

Your Answer:`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text;
    } catch (error) {
        console.error("Error clarifying doubt:", error);
        throw new Error("I'm sorry, I couldn't process your question right now. Please check your API key.");
    }
};