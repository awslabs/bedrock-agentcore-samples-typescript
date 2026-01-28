import React from "react";
import Navigation from "@/components/Navigation";

export default function AuthRequiredLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen">
      <Navigation />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
