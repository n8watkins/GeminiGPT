export interface Attachment {
  id: string;
  type: 'image' | 'file';
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
}

/**
 * A cross-chat memory citation: where a retrieved snippet came from.
 * Delivered by the `retrieval-info` socket event before the assistant
 * response streams in.
 */
export interface RetrievalSource {
  chatId: string;
  chatTitle: string;
  snippet: string;
  score: number;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  attachments?: Attachment[];
  isStreaming?: boolean;
  /** Cross-chat memory sources used to generate this assistant message */
  sources?: RetrievalSource[];
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
