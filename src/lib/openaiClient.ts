import { OPENAI_API_KEY } from "@/lib/config";

export type OpenAIChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OpenAIChatCompletionRequest = {
  model: string;
  messages: OpenAIChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  n?: number;
  response_format?: { type: "json_object" };
};

export type OpenAIChatCompletionChoice = {
  index: number;
  finish_reason: string | null;
  message: OpenAIChatMessage;
};

export type OpenAIChatCompletionResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  choices: OpenAIChatCompletionChoice[];
};

const OPENAI_CHAT_ENDPOINT = "https://api.openai.com/v1/chat/completions";

export async function callOpenAIChatCompletion(
  payload: OpenAIChatCompletionRequest
): Promise<OpenAIChatCompletionResponse> {
  const response = await fetch(OPENAI_CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `OpenAI API request failed (${response.status} ${response.statusText}): ${message}`
    );
  }

  return response.json();
}
