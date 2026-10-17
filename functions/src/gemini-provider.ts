import { AiModelProvider, GenerateContentRequest, GenerateContentResponse } from './provider-interface';

export class GeminiModelProvider implements AiModelProvider {
  private apiKey: string;
  private modelName: string;

  constructor(apiKey?: string, modelName: string = 'gemini-2.0-flash') {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    this.modelName = modelName;
  }

  async generate(request: GenerateContentRequest): Promise<GenerateContentResponse> {
    if (!this.apiKey) {
      // Deterministic fallback response when API key is not yet configured in environment
      return this.generateMockFallback(request);
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;

    const tools: any[] = [];
    if (request.researchEnabled) {
      tools.push({ googleSearch: {} });
    }

    const systemInstruction = request.systemInstruction ||
      'You are a high-performance routine and habit execution assistant for the My Routine application. Provide clear, accurate, and actionable responses strictly formatted as requested.';

    const payload: any = {
      contents: [
        {
          role: 'user',
          parts: [{ text: request.prompt }],
        },
      ],
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: request.maxOutputTokens || 2048,
      },
    };

    if (tools.length > 0) {
      payload.tools = tools;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`Gemini API error [${resp.status}]: ${errorText}`);
      }

      const data: any = await resp.json();
      const candidate = data.candidates?.[0];
      const rawText = candidate?.content?.parts?.map((p: any) => p.text).join('') || '';

      // Extract Grounding Citations if web research was enabled
      const sources: { title: string; url: string; snippet?: string; publicationDate?: string }[] = [];
      const groundingChunks = candidate?.groundingMetadata?.groundingChunks;
      if (Array.isArray(groundingChunks)) {
        for (const chunk of groundingChunks) {
          if (chunk.web?.uri) {
            sources.push({
              title: chunk.web.title || chunk.web.uri,
              url: chunk.web.uri,
              snippet: chunk.web.snippet,
            });
          }
        }
      }

      // Structure sections or checklists if requested
      const { sections, checklistItems } = this.parseStructuredContent(rawText, request.outputFormat);

      return {
        content: rawText,
        sections,
        checklistItems,
        sources: sources.length > 0 ? sources : undefined,
        modelMetadata: {
          provider: 'google',
          model: this.modelName,
        },
        usageMetadata: {
          promptTokens: data.usageMetadata?.promptTokenCount,
          completionTokens: data.usageMetadata?.candidatesTokenCount,
          totalTokens: data.usageMetadata?.totalTokenCount,
        },
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('AI provider request timed out after 25 seconds.');
      }
      throw err;
    }
  }

  private parseStructuredContent(
    text: string,
    format: 'markdown' | 'sections' | 'checklist'
  ): { sections?: { title: string; body: string }[]; checklistItems?: { text: string; completed: boolean }[] } {
    if (format === 'checklist') {
      const lines = text.split('\n');
      const items: { text: string; completed: boolean }[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        const checkMatch = trimmed.match(/^[-*]\s*\[([ xX])\]\s*(.+)$/);
        if (checkMatch) {
          items.push({
            text: checkMatch[2].trim(),
            completed: checkMatch[1].toLowerCase() === 'x',
          });
        } else if (/^[-*]\s+(.+)$/.test(trimmed)) {
          items.push({
            text: trimmed.replace(/^[-*]\s+/, ''),
            completed: false,
          });
        } else if (/^\d+\.\s+(.+)$/.test(trimmed)) {
          items.push({
            text: trimmed.replace(/^\d+\.\s+/, ''),
            completed: false,
          });
        }
      }
      if (items.length > 0) return { checklistItems: items };
    }

    if (format === 'sections') {
      const lines = text.split('\n');
      const sections: { title: string; body: string }[] = [];
      let currentTitle = 'Overview';
      let currentBody: string[] = [];

      for (const line of lines) {
        const headerMatch = line.match(/^#{1,3}\s+(.+)$/);
        if (headerMatch) {
          if (currentBody.length > 0 || sections.length > 0) {
            sections.push({ title: currentTitle, body: currentBody.join('\n').trim() });
            currentBody = [];
          }
          currentTitle = headerMatch[1].trim();
        } else {
          currentBody.push(line);
        }
      }
      if (currentBody.length > 0 || currentTitle) {
        sections.push({ title: currentTitle, body: currentBody.join('\n').trim() });
      }
      if (sections.length > 1) return { sections };
    }

    return {};
  }

  private generateMockFallback(request: GenerateContentRequest): GenerateContentResponse {
    const rawContent = `### Executed: Routine AI Action\n\n**Briefing Overview**\n- Today is a key focus day for your schedule.\n- Maintain momentum and follow through on your time blocks.\n\n*Generated in offline/development mode.*`;
    return {
      content: rawContent,
      modelMetadata: {
        provider: 'google-mock',
        model: 'gemini-mock',
      },
    };
  }
}
