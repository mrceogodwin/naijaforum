import { createFileRoute } from "@tanstack/react-router";
import { QonvoScreen } from "@/components/qonvo-screens";
import { useQonvo } from "@/lib/use-qonvo";

export const Route = createFileRoute("/ops")({ component: Ops });

function Ops() {
  const store = useQonvo();
  return (
    <div className="h-dvh overflow-auto bg-bg text-fg">
      <div className="border-b border-line px-4 py-2 text-xs text-muted">Staff only</div>
      <QonvoScreen id="admin" store={store} onHome={() => { window.location.href = "/"; }} />
    </div>
  );
}
