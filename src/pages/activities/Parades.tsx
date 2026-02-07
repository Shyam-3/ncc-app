import React, { useEffect, useState } from 'react';
import { Alert, Container, Spinner } from 'react-bootstrap';
import { Markdown } from '../../components';

const Parades: React.FC = () => {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const mods = import.meta.glob('../../../content/activities/parades.md?raw');
        const key = '../../../content/activities/parades.md?raw';
        const loader = mods[key] as undefined | (() => Promise<{ default: string }>);
        if (loader) {
          const mod = await loader();
          if (alive) setContent(mod.default);
        } else {
          if (alive) setContent(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <Container className="py-5">
      <h1 className="mb-4">Parades & Drills</h1>
      {loading ? (
        <div className="d-flex align-items-center"><Spinner size="sm" animation="border" className="me-2"/> Loading…</div>
      ) : content ? (
        <Markdown content={content} />
      ) : (
        <Alert variant="secondary">Parades content will be published soon.</Alert>
      )}
    </Container>
  );
};

export default Parades;
