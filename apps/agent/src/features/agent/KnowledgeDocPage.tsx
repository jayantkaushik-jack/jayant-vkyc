import { Navigate, useParams } from 'react-router-dom';
import { KnowledgeDocViewer } from '@agent/components/knowledge/KnowledgeDocViewer';
import { getKnowledgeDoc } from '@vkyc/shared/data/knowledgeDocs';

export function KnowledgeDocPage() {
  const { docId } = useParams<{ docId: string }>();
  const doc = docId ? getKnowledgeDoc(docId) : undefined;

  if (!doc) return <Navigate to="/agent/knowledge" replace />;

  return <KnowledgeDocViewer doc={doc} backHref="/agent/knowledge" />;
}
