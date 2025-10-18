'use client';

import { useState, useEffect } from 'react';
import { getSessionUserId } from '@/lib/userId';

export default function UserId() {
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    // Generate user ID on component mount
    const id = getSessionUserId();
    setUserId(id);
  }, []);

  if (!userId) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600">
      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
      <span className="font-mono font-medium">{userId}</span>
    </div>
  );
}
