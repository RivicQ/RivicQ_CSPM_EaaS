import React from 'react';
import { Link, useParams } from 'react-router-dom';
import legalMd from '../../../LEGAL.md?raw';
import privacyMd from '../../../PRIVACY.md?raw';
import securityMd from '../../../SECURITY.md?raw';
import MarkdownView from '../content/renderMarkdown';
import PublicBar from '../components/layout/PublicBar';

const DOCS = {
  legal: { title: 'LEGAL.md', source: legalMd },
  privacy: { title: 'PRIVACY.md', source: privacyMd },
  security: { title: 'SECURITY.md', source: securityMd },
} as const;

type DocId = keyof typeof DOCS;

function isDocId(value: string | undefined): value is DocId {
  return value === 'legal' || value === 'privacy' || value === 'security';
}

const DocPage: React.FC = () => {
  const { docId } = useParams();
  if (!isDocId(docId)) {
    return (
      <div className="doc-view">
        <PublicBar />
        <h1>Document not in this demo</h1>
        <p className="lede">Legal, privacy, and security notes for the labeled Graph demo are the documents linked from the legal page.</p>
        <Link className="btn" to="/legal">Back</Link>
      </div>
    );
  }
  const doc = DOCS[docId];
  return (
    <article className="doc-view">
      <PublicBar>
        <a className="btn" href={`/RivicQ_CSPM_EaaS/archify/site/index.html#types/${docId}`}>Open in Archify</a>
        <Link className="btn" to="/legal">Legal notes</Link>
        <Link className="btn" to="/">Back</Link>
      </PublicBar>
      <p className="lede">Rendered from {doc.title}. Control mappings are not certifications. This demo does not publish secret values.</p>
      <MarkdownView source={doc.source} />
    </article>
  );
};

export default DocPage;
