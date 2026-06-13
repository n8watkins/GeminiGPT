'use client';

/**
 * Legacy share link route (/share/<uuid>).
 *
 * These links pointed at JSON files the server wrote to `shared-chats/` on
 * disk - ephemeral on Render, so every restart deleted them. The disk-based
 * /api/share endpoint has been removed; new shares are self-contained URLs
 * (/share#<data>) that need no server storage. Any old-style link that still
 * exists in the wild lands here and gets a friendly explanation.
 */

import React from 'react';
import { SharedChatError } from '@/components/SharedChatView';

export default function LegacySharedChatPage() {
  return (
    <SharedChatError
      title="Share Link Expired"
      message="This share link has expired. Shares are now self-contained links that never expire - ask the sender to share the chat again to get one."
    />
  );
}
