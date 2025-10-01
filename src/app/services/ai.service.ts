import { Injectable } from "@angular/core";
import { environment } from "../../environments/environment";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

@Injectable({ providedIn: "root" })
export class AiService {
  /**
   * Generate a reply using Firebase AI Logic (Gemini) when available.
   * Falls back to a canned reply if the SDK or model isn't available.
   * Scope: General Mauritius travel Q&A only (no pricing/booking quotes).
   */
  async generateReply(
    userText: string,
    history: ChatMessage[] = []
  ): Promise<string> {
    const systemInstruction =
      "You are a helpful Mauritius travel assistant. Answer only general Mauritius-related questions (attractions, culture, weather, safety, transport). If asked about pricing or bookings, reply: 'Use the booking form or WhatsApp for quotes.' Keep answers concise, friendly, and factual. Avoid medical/financial/legal advice.";
    const aiText = await this.tryFirebaseAi(
      userText,
      history,
      systemInstruction
    );
    if (aiText && aiText.trim().length > 0) {
      return aiText.trim();
    }
    throw new Error("AI response unavailable");
  }

  private async tryFirebaseAi(
    userText: string,
    history: ChatMessage[],
    systemInstruction: string
  ): Promise<string | null> {
    // Helper to avoid build-time resolution of optional SDK subpaths
    const dynamicImport = async (specifier: string) => {
      try {
        const importer: any = new Function("p", "return import(p)");
        return await importer(specifier);
      } catch {
        return null;
      }
    };

    // Build a compact conversation prompt to keep requests small
    const prior = history
      .slice(-6)
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
      .join("\n");

    const prompt = `${systemInstruction}\n\nConversation so far:\n${prior}\n\nUser: ${userText}\nAssistant:`;

    // Lazily import Firebase app to avoid coupling to AngularFire
    let app: any;
    try {
      const appMod: any = await dynamicImport("firebase/app");
      if (!appMod) return null;
      const apps = appMod.getApps();
      app =
        apps && apps.length
          ? appMod.getApp()
          : appMod.initializeApp(environment.firebase);
    } catch {
      return null;
    }

    // Prefer new Firebase AI Logic SDK if available, otherwise try legacy Vertex AI in Firebase
    // Model note: Gemini 1.0/1.5 are retired; use a current lightweight default.
    const modelName = "gemini-2.5-flash-lite";

    // 1) New SDK path: firebase/ai (renamed from Vertex AI in Firebase)
    try {
      const aiMod: any = await dynamicImport("firebase/ai");
      if (aiMod && typeof aiMod.getGenerativeModel === "function") {
        // Some SDK variants expose getGenerativeModel(app, opts), others expose getGenerativeModel(opts) with implicit app
        let model: any;
        try {
          model = aiMod.getGenerativeModel(app, { model: modelName });
        } catch {
          model = aiMod.getGenerativeModel({ model: modelName });
        }

        if (model && typeof model.generateContent === "function") {
          const resp: any = await model.generateContent(prompt as any);
          const text = await this.extractText(resp);
          return text ?? null;
        }
      }
    } catch {
      // continue to try legacy path below
    }

    // 2) Legacy SDK path: firebase/vertexai
    try {
      const vMod: any = await dynamicImport("firebase/vertexai");
      const getVertexAI = vMod?.getVertexAI;
      const getGenerativeModel = vMod?.getGenerativeModel;
      if (
        typeof getVertexAI === "function" &&
        typeof getGenerativeModel === "function"
      ) {
        const vertexAi = getVertexAI(app);
        const model = getGenerativeModel(vertexAi, { model: modelName });
        if (model && typeof model.generateContent === "function") {
          const resp: any = await model.generateContent(prompt as any);
          const text = await this.extractText(resp);
          return text ?? null;
        }
      }
    } catch {
      // No supported SDK available
    }

    return null;
  }

  private async extractText(response: any): Promise<string | null> {
    try {
      // Several SDK shapes exist; try common ones defensively
      if (
        response?.response?.text &&
        typeof response.response.text === "function"
      ) {
        return (await response.response.text()) as string;
      }
      if (response?.text && typeof response.text === "function") {
        return (await response.text()) as string;
      }
      const parts = response?.response?.candidates?.[0]?.content?.parts;
      if (Array.isArray(parts)) {
        const combined = parts
          .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
          .filter((t: string) => t)
          .join(" ");
        return combined || null;
      }
    } catch {
      // swallow
    }
    return null;
  }
}
