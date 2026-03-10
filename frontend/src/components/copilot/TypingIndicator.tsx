'use client';

import { useEffect, useState } from 'react';

const STAGES: { threshold: number; text: string }[] = [
  { threshold: 0, text: 'Thinking' },
  { threshold: 3000, text: 'Analyzing your data' },
  { threshold: 10000, text: 'Running a complex query' },
  { threshold: 25000, text: 'Almost there' },
];

export function TypingIndicator() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - start), 500);
    return () => clearInterval(id);
  }, []);

  let label = STAGES[0].text;
  for (const stage of STAGES) {
    if (elapsed >= stage.threshold) label = stage.text;
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
      <span className="inline-flex gap-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-[typing-bounce_1.4s_ease-in-out_infinite]" />
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-[typing-bounce_1.4s_ease-in-out_0.2s_infinite]" />
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-[typing-bounce_1.4s_ease-in-out_0.4s_infinite]" />
      </span>
      {label}...
    </span>
  );
}
