export interface GenerateContentRequest {
  systemInstruction?: string;
  prompt: string;
  outputFormat: 'markdown' | 'sections' | 'checklist';
  researchEnabled: boolean;
  maxOutputTokens?: number;
}

export interface GenerateContentResponse {
  content: string;
  sections?: { title: string; body: string }[];
  checklistItems?: { text: string; completed: boolean }[];
  sources?: { title: string; url: string; snippet?: string; publicationDate?: string }[];
  modelMetadata: {
    provider: string;
    model: string;
  };
  usageMetadata?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface AiModelProvider {
  generate(request: GenerateContentRequest): Promise<GenerateContentResponse>;
}
