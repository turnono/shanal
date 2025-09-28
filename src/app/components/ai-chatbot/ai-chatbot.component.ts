import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AiService, ChatMessage } from "../../services/ai.service";

@Component({
  selector: "app-ai-chatbot",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <button class="ai-chat-toggle" (click)="toggle()">💬 Chat</button>

    <div class="ai-chat" *ngIf="open">
      <div class="ai-chat__header">
        <div class="ai-chat__title">Travel Assistant</div>
        <button class="ai-chat__close" (click)="toggle()">×</button>
      </div>

      <div class="ai-chat__body" #scrollContainer>
        <div
          *ngFor="let m of messages"
          class="ai-chat__msg"
          [class.ai-chat__msg--user]="m.role === 'user'"
        >
          <div class="ai-chat__bubble">{{ m.text }}</div>
        </div>
        <div *ngIf="loading" class="ai-chat__msg">
          <div class="ai-chat__bubble">Typing…</div>
        </div>
      </div>

      <form class="ai-chat__input" (ngSubmit)="send()">
        <input
          type="text"
          [(ngModel)]="draft"
          name="draft"
          [disabled]="loading"
          placeholder="Ask about cars, tours, transfers…"
          required
        />
        <button type="submit" [disabled]="loading || !draft.trim()">
          Send
        </button>
      </form>
    </div>
  `,
  styleUrls: ["./ai-chatbot.component.scss"],
})
export class AiChatbotComponent {
  open = false;
  draft = "";
  loading = false;
  messages: ChatMessage[] = [
    {
      role: "assistant",
      text: "Hi! I can help you plan your Mauritius trip—car rental, tours, and transfers.",
    },
  ];

  constructor(private ai: AiService) {}

  toggle() {
    this.open = !this.open;
  }

  async send() {
    const text = this.draft.trim();
    if (!text) return;
    this.messages.push({ role: "user", text });
    this.draft = "";
    this.loading = true;
    try {
      const reply = await this.ai.generateReply(text, this.messages);
      this.messages.push({ role: "assistant", text: reply });
    } catch (e) {
      this.messages.push({
        role: "assistant",
        text: "Sorry, something went wrong. Please try again.",
      });
    } finally {
      this.loading = false;
    }
  }
}
