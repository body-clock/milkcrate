import React from "react";

import { SkipToContent } from "./milkcrate_shell_skip_link";

export interface MilkcrateShellProps {
  header: React.ReactNode;
  afterHeader?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentWidth?: string;
  contentPadding?: string;
}

export default function MilkcrateShell(props: MilkcrateShellProps) {
  const p = props;
  return (
    <div className="min-h-screen flex flex-col">
      <SkipToContent />
      {p.header}
      {p.afterHeader}
      <main className="flex-1" id="main-content">
        <div
          className={`mx-auto w-full ${p.contentWidth ?? "max-w-6xl"} ${p.contentPadding ?? "px-4 sm:px-6 lg:px-8 py-6 sm:py-12"}`}
        >
          {p.children}
        </div>
      </main>
      {p.footer}
    </div>
  );
}
