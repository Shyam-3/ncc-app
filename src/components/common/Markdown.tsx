import { marked } from 'marked';
import React from 'react';

type MarkdownProps = {
  content: string;
  className?: string;
};

// Simple Markdown renderer using marked; sanitize disabled by default, only use with trusted content
const Markdown: React.FC<MarkdownProps> = ({ content, className }) => {
  const html = React.useMemo(() => marked.parse(content), [content]);
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: html as string }} />
  );
};

export default Markdown;
