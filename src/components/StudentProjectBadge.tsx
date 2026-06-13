'use client';

import { GraduationCap, ExternalLink } from 'lucide-react';

/**
 * Small "portfolio learning project" badge pinned to the top-left of the
 * chat column, linking to the GitHub repo. Sits in the strip above the
 * chat header so it never overlaps the sidebar toggle or header actions.
 */
export default function StudentProjectBadge() {
  return (
    <a
      href="https://github.com/n8watkins/GeminiGPT"
      target="_blank"
      rel="noopener noreferrer"
      data-testid="student-project-badge"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100/80 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-200/80 dark:hover:bg-blue-900/70 hover:border-blue-300 dark:hover:border-blue-700 transition-colors shadow-sm backdrop-blur-sm group"
      title="View the source on GitHub"
    >
      <GraduationCap className="w-3.5 h-3.5 flex-shrink-0" />
      <span>Portfolio learning project</span>
      <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}
