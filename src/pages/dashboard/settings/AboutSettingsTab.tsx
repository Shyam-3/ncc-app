import { useAuth } from "@/features/auth/AuthContext";
import { CmsDoc, fetchCms, saveCms } from "@/features/cms/service";
import { db } from "@/shared/config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Button, Card, Col, Form, Row, Spinner } from "react-bootstrap";
import toast from "react-hot-toast";

const STATIC_HEADINGS = [
  "About Our Unit",
  "ANO/CTO & Staff",
  "NCC Motto & Song",
  "Organizational Structure",
];

const SONG_LYRICS = `Hum Sab Bharatiya Hain, Hum Sab Bharatiya Hain
Apni Manzil Ek Hai,
Ha, Ha, Ha, Ek Hai,
Ho, Ho, Ho, Ek Hai.
Hum Sab Bharatiya Hain.

Kashmir Ki Dharti Rani Hai,
Sartaj Himalaya Hai,
Saadiyon Se Humne Isko Apne Khoon Se Pala Hai
Desh Ki Raksha Ki Khatir Hum Shamshir Utha Lenge,
Bikhre Bikhre Taare Hain Hum Lekin Jhilmil Ek Hai,
Ha, Ha, Ha, Ek Hai
Hum Sab Bharatiya Hain.

Mandir Gurudwaare Bhi Hain Yahan
Aur Masjid Bhi Hai Yahan
Girija Ka Hai Ghariyaal Kahin
Mullah ki Kaan Azaan
Ek Hee Apna Ram Hain, Ek hi Allah Taala Hai,
Ek Hee Allah Taala Hain, Raang Birange Deepak Hain Hum,
lekin Jagmag Ek Hai, Ha Ha Ha Ek Hai, Ho Ho Ho Ek Hai.
Hum Sab Bharatiya Hain, Hum Sab Bharatiya Hain.`;

const DEFAULT_BODIES: Record<string, string> = {
  "About Our Unit": "Information about our NCC unit will be displayed here.",
  "ANO/CTO & Staff": "Details about the ANO/CTO and staff members.",
  "NCC Motto & Song": SONG_LYRICS,
  "Organizational Structure": "The organizational structure of our unit.",
};

const AboutSettingsTab: React.FC = () => {
  const [doc, setDoc] = useState<CmsDoc>({
    title: "About Our NCC Unit",
    sections: [],
    anoUids: [],
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [anoUsers, setAnoUsers] = useState<any[]>([]);
  const { currentUser } = useAuth();

  useEffect(() => {
    (async () => {
      // Fetch CMS Doc
      const existing = await fetchCms("about");

      const enforcedSections = STATIC_HEADINGS.map((heading) => {
        const existingSection = existing?.sections?.find(
          (s) => s.heading.toLowerCase() === heading.toLowerCase(),
        );
        return {
          heading,
          body: existingSection?.body || DEFAULT_BODIES[heading],
        };
      });

      setDoc({
        title: existing?.title || "About Our NCC Unit",
        sections: enforcedSections,
        anoUids: existing?.anoUids || [],
      });

      // Fetch ANO Users
      try {
        const snap = await getDocs(
          query(
            collection(db, "users"),
            where("role", "==", "superadmin"),
            where("userType", "==", "ano"),
          ),
        );
        setAnoUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Failed to fetch ANO users", err);
      }
      setLoading(false);
    })();
  }, []);

  const updateSectionBody = (idx: number, newBody: string) => {
    setDoc((d) => ({
      ...d,
      sections: d.sections.map((s, i) =>
        i === idx ? { ...s, body: newBody } : s,
      ),
    }));
  };

  const handleAnoToggle = (uid: string) => {
    setDoc((d) => {
      const uids = d.anoUids || [];
      if (uids.includes(uid)) {
        return { ...d, anoUids: uids.filter((id) => id !== uid) };
      }
      if (uids.length >= 2) {
        toast.error("You can select a maximum of 2 ANOs.");
        return d;
      }
      return { ...d, anoUids: [...uids, uid] };
    });
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await saveCms("about", doc, currentUser?.uid);
      toast.success("About page settings saved!");
    } catch (e) {
      toast.error("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <Spinner as="span" animation="border" className="m-4" size="sm" />;

  return (
    <div className="mt-4">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-4">
        <div>
          <h4 className="mb-1">About Page Layout</h4>
          <p className="text-muted small mb-0">
            Configure the content shown on the public About page.
          </p>
        </div>
        <Button variant="primary" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      <Row className="g-3">
        {doc.sections.map((s, idx) => (
          <Col xs={12} key={idx}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <h5 className="mb-3 text-primary">{s.heading}</h5>

                {s.heading === "ANO/CTO & Staff" && (
                  <Form.Group className="mb-4 p-3 bg-light rounded border">
                    <Form.Label className="fw-bold d-block">
                      Feature ANO Profiles (Max 2)
                    </Form.Label>
                    <div className="d-flex flex-wrap gap-3 mt-2">
                      {anoUsers.map((u) => (
                        <Form.Check
                          key={u.id}
                          type="checkbox"
                          id={`ano-${u.id}`}
                          label={`${u.name} (${u.rank || "ANO"})`}
                          checked={(doc.anoUids || []).includes(u.id)}
                          onChange={() => handleAnoToggle(u.id)}
                        />
                      ))}
                      {anoUsers.length === 0 && (
                        <span className="text-muted small">
                          No ANO accounts found.
                        </span>
                      )}
                    </div>
                  </Form.Group>
                )}

                <Form.Group>
                  <Form.Label className="fw-semibold">Body Content</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={6}
                    value={s.body}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      updateSectionBody(idx, e.target.value)
                    }
                  />
                </Form.Group>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default AboutSettingsTab;
