import React, { useEffect, useState } from 'react';
import { Alert, Container, Spinner } from 'react-bootstrap';
import { Markdown } from '../../components';

const Resources: React.FC = () => {
  const [study, setStudy] = useState<string | null>(null);
  const [manuals, setManuals] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const mods = import.meta.glob('../../../content/resources/*.md?raw');
        const studyKey = '../../../content/resources/study-material.md?raw';
        const manualsKey = '../../../content/resources/manuals.md?raw';
        const studyLoader = mods[studyKey] as undefined | (() => Promise<{ default: string }>);
        const manualsLoader = mods[manualsKey] as undefined | (() => Promise<{ default: string }>);
        const [studyMod, manualsMod] = await Promise.all([
          studyLoader ? studyLoader() : Promise.resolve<{ default: string } | null>(null),
          manualsLoader ? manualsLoader() : Promise.resolve<{ default: string } | null>(null),
        ]);
        if (!isMounted) return;
        setStudy((studyMod as any)?.default ?? null);
        setManuals((manualsMod as any)?.default ?? null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  return (
    <Container className="py-5">
      <h1 className="mb-4">Resources</h1>
      {loading ? (
        <div className="d-flex align-items-center">
          <Spinner animation="border" size="sm" className="me-2" />
          <span>Loading resources…</span>
        </div>
      ) : (
        <>
          {study ? <Markdown content={study} /> : (
            <Alert variant="secondary">Study materials will be published soon.</Alert>
          )}
          <hr className="my-4" />
          {manuals ? <Markdown content={manuals} /> : (
            <Alert variant="secondary">Manuals will be published soon.</Alert>
          )}
        </>
      )}
    </Container>
  );
};

export default Resources;
