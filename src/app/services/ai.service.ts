import { Injectable } from "@angular/core";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

@Injectable({ providedIn: "root" })
export class AiService {
  // Stub implementation. Replace with Firebase AI Logic Web SDK per docs:
  // https://firebase.google.com/docs/ai-logic?authuser=0
  async generateReply(
    userText: string,
    history: ChatMessage[] = []
  ): Promise<string> {
    const context = history
      .slice(-6)
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
      .join("\n");

    const prompt = `You are a helpful travel assistant for a Mauritius tourism site.\n\nRecent conversation:\n${context}\n\nUser: ${userText}\n\nReply with a concise, friendly answer.`;

    await new Promise((r) => setTimeout(r, 400));
    return "Thanks! I can help with car rentals, tours, and transfers in Mauritius. What dates are you considering?";
  }
}
