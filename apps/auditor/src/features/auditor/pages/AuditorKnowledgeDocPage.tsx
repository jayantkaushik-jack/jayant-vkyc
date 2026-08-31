import { Navigate, useParams } from 'react-router-dom';
import { KnowledgeDocViewer } from '@vkyc/shared/components/knowledge/KnowledgeDocViewer';
import { getAuditorKnowledgeDoc } from '@vkyc/shared/data/auditorKnowledgeDocs';

export function AuditorKnowledgeDocPage() {
  const { docId } = useParams<{ docId: string }>();
  const doc = docId ? getAuditorKnowledgeDoc(docId) : undefined;

  if (!doc) return <Navigate to="/knowledge" replace />;

  return <KnowledgeDocViewer doc={doc} backHref="/knowledge" />;
}
