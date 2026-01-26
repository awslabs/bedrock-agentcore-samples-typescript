import { getAgentCoreUrl } from "@/lib/agentCoreClient";
export default function TestPage() {

  const testUrl = getAgentCoreUrl("mcpServerAgentArn")

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Test Page</h1>
      <p className="text-muted-foreground mt-2">This is a placeholder test page.</p>
      {testUrl}
    </div>
  );
}
