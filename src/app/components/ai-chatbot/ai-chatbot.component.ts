import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { environment } from "../../../environments/environment";

@Component({
  selector: "app-ai-chatbot",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <button
      class="ai-chat-toggle"
      (click)="toggle()"
      aria-label="Open WhatsApp chat"
    >
      <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
        <path
          fill="#fff"
          d="M19.11 17.47c-.29-.15-1.7-.84-1.96-.94-.26-.1-.45-.15-.64.15-.19.29-.74.94-.91 1.13-.17.19-.34.22-.63.08-.29-.15-1.23-.45-2.34-1.45-.86-.77-1.45-1.72-1.62-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.43-.51.15-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.08-.15-.64-1.54-.88-2.12-.23-.56-.47-.49-.64-.5l-.55-.01c-.19 0-.51.07-.78.36-.26.29-1 1-1 2.43 0 1.43 1.03 2.81 1.18 3 .15.19 2.04 3.12 4.94 4.37.69.3 1.23.48 1.65.61.69.22 1.32.19 1.81.12.55-.08 1.7-.7 1.94-1.38.24-.68.24-1.26.17-1.38-.07-.12-.26-.19-.55-.34z"
        />
        <path
          fill="#fff"
          d="M16.06 3.02c-7.18 0-13.02 5.84-13.02 13.02 0 2.29.6 4.51 1.74 6.47L3 29l6.66-1.74a13.01 13.01 0 0 0 6.39 1.67c7.18 0 13.02-5.84 13.02-13.02s-5.84-12.89-13.02-12.89zm7.65 20.67c-.32.89-1.87 1.7-2.62 1.81-.7.1-1.6.15-2.6-.16-1.5-.49-3.41-1.27-5.84-3.72-2.16-2.18-3.62-4.86-4.05-5.67-.42-.81-1.04-2.65-1.04-4.06 0-1.41.86-2.67 1.22-3.04.32-.33.86-.47 1.14-.47h.81c.26 0 .61.09.93.72.32.62 1.09 2.68 1.19 2.87.1.19.16.42.03.68-.13.26-.19.42-.39.65-.19.23-.41.51-.58.68-.19.19-.39.39-.17.77.22.39.98 1.6 2.1 2.59 1.45 1.25 2.67 1.64 3.05 1.83.39.19.61.16.84-.1.23-.26.97-1.13 1.23-1.52.26-.39.52-.32.86-.19.32.13 2.06.97 2.41 1.15.36.19.58.26.67.42.08.16.08.94-.24 1.83z"
        />
      </svg>
      <span class="ai-chat-toggle__label">Chat</span>
    </button>

    <div class="ai-chat" *ngIf="open">
      <div class="ai-chat__header">
        <div class="ai-chat__title">WhatsApp Chat</div>
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
  messages: { role: "user" | "assistant"; text: string }[] = [
    {
      role: "assistant",
      text: "Hi! Chat with us directly on WhatsApp about cars, tours, and transfers.",
    },
  ];

  constructor() {}

  toggle() {
    this.open = !this.open;
  }

  async send() {
    const text = this.draft.trim();
    if (!text) return;
    this.messages.push({ role: "user", text });
    this.draft = "";
    const phone = environment.ownerWhatsAppNumber || "";
    const msg = encodeURIComponent(text);
    const url = phone
      ? `https://wa.me/${phone}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
    window.open(url, "_blank");
    this.messages.push({
      role: "assistant",
      text: "Opening WhatsApp… If nothing happens, tap the WhatsApp button on the site.",
    });
  }
}
