"use client";
import { useState } from "react";

export function CopyCommand({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="cmd">
      <code className="cmdtext">{text}</code>
      <button
        className="copybtn"
        onClick={() => {
          navigator.clipboard?.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}
