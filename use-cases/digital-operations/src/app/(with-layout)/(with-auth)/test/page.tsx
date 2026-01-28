import { getAgentCoreUrl } from "@/lib/agentCoreClient";

export default function TestPage() {
  let testUrl: string;
  let error: string | null = null;

  try {
    testUrl = getAgentCoreUrl("mcpServerAgentArn");
  } catch (e) {
    testUrl = "";
    error = e instanceof Error ? e.message : "Unknown error";
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Test Page</h1>
      <p className="text-muted-foreground mt-2">This is a placeholder test page.</p>
      {error ? (
        <p className="text-red-500 mt-4">Error: {error}</p>
      ) : (
        <p className="mt-4">{testUrl}</p>
      )}
    </div>
  );
}
