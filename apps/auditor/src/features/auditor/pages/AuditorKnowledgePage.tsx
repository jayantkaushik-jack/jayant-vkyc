import { KnowledgeCenterGrid } from '@vkyc/shared/components/knowledge/KnowledgeCenterGrid';
import { AUDITOR_KNOWLEDGE_DOCS } from '@vkyc/shared/data/auditorKnowledgeDocs';

export function AuditorKnowledgePage() {
  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Knowledge Center</h1>
        <p className="text-text-muted text-sm mt-1">Reference documents and guides for VKYC auditors</p>
      </div>

      <KnowledgeCenterGrid docs={AUDITOR_KNOWLEDGE_DOCS} basePath="/knowledge" />
    </div>
  );
}
