"use client";

import { FrameSelector } from "@/components/FrameSelector";
import { PhotoboothShell } from "@/components/PhotoboothShell";

export default function FrameSelectionPage() {
  return (
    <PhotoboothShell step="frame" title="Pilih Bingkai">
      <FrameSelector />
    </PhotoboothShell>
  );
}
