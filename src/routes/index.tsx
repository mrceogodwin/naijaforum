import { createFileRoute } from "@tanstack/react-router";
import { QonvoApp } from "@/components/qonvo-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <QonvoApp />;
}
