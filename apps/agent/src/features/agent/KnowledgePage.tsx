import { KnowledgeCenterGrid } from '@agent/components/knowledge/KnowledgeCenterGrid';
import { KNOWLEDGE_DOCS } from '@vkyc/shared/data/knowledgeDocs';

export function KnowledgePage() {
  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Knowledge Center</h1>
        <p className="text-text-muted text-sm mt-1">Reference documents and guides for VKYC agents</p>
      </div>

      <KnowledgeCenterGrid docs={KNOWLEDGE_DOCS} basePath="/agent/knowledge" />
    </div>
  );
}
