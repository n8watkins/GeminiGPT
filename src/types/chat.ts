export interface Attachment {
  id: string;
  type: 'image' | 'file';
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  attachments?: Attachment[];
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
}
