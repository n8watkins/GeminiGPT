'use client';

/**
 * Self-contained share link viewer.
 *
 * The entire shared chat is encoded in the URL fragment:
 *   /share#<base64url(gzip(JSON))>
 * Nothing is stored on the server (Render's disk is ephemeral, so the old
 * disk-based /api/share links died on every restart). The fragment never
 * leaves the browser, so decoding happens fully client-side here.
 */

import React, { useState, useEffect } from 'react';
import { decodeShareData, SharePayload } from '@/lib/shareLink';
import { SharedChatView, SharedChatError, SharedChatLoading } from '@/components/SharedChatView';

export default function SharedChatPage() {
  const [chat, setChat] = useState<SharePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function decodeFromFragment() {
      try {
        const payload = await decodeShareData(window.location.hash);
        if (!cancelled) {
          setChat(payload);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }

    decodeFromFragment();

    // Support in-page fragment changes (e.g. pasting a new link over this one)
    const onHashChange = () => {
      setLoading(true);
      setError(false);
      setChat(null);
      decodeFromFragment();
    };
    window.addEventListener('hashchange', onHashChange);

    return () => {
      cancelled = true;
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  if (loading) {
    return <SharedChatLoading />;
  }

  if (error || !chat) {
    return (
      <SharedChatError
        title="Share Link Expired"
        message="This share link has expired or is invalid. Share links contain the whole conversation, so ask the sender for a fresh link."
      />
    );
  }

  return <SharedChatView title={chat.title} sharedAt={chat.sharedAt} messages={chat.messages} />;
}
