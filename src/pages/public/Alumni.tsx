import { DEPARTMENT_DEFS } from "@/shared/config/constants";
import { db } from "@/shared/config/firebase";
import type { AlumniProfile } from "@/features/alumni";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Row,
  Spinner,
} from "react-bootstrap";
import { Link } from "react-router-dom";

type AlumniRow = AlumniProfile & { id: string };

const Alumni: React.FC = () => {
  const [profiles, setProfiles] = useState<AlumniRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [divisionFilter, setDivisionFilter] = useState<"ALL" | "SD" | "SW">(
    "ALL",
  );
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [yearFilter, setYearFilter] = useState("ALL");

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "alumniProfiles"),
            where("status", "==", "active"),
            where("visible", "==", true),
          ),
        );
        const docs = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as AlumniProfile) }))
          .sort((a, b) => {
            const toDate = (val: unknown): Date => {
              if (
                val &&
                typeof val === "object" &&
                "toDate" in val &&
                typeof (val as any).toDate === "function"
              ) {
                return (val as any).toDate();
              }
              return new Date((val as string) || 0);
            };
            return (
              toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime()
            );
          });
        setProfiles(docs);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const academicYears = useMemo(() => {
    const years = new Set(
      profiles.map((p) => p.academicYear).filter(Boolean) as string[],
    );
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [profiles]);

  const filtered = useMemo(() => {
    let list = [...profiles];
    if (divisionFilter !== "ALL")
      list = list.filter((p) => p.division === divisionFilter);
    if (departmentFilter !== "ALL")
      list = list.filter((p) => p.department === departmentFilter);
    if (yearFilter !== "ALL")
      list = list.filter((p) => p.academicYear === yearFilter);
    return list;
  }, [profiles, divisionFilter, departmentFilter, yearFilter]);

  return (
    <Container className="py-5">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <h1 className="mb-2">Alumni Directory</h1>
          <p className="lead mb-0">
            Celebrating the achievements of our former cadets.
          </p>
        </div>
        <Button as={Link} to="/alumni/submit" variant="primary">
          <i className="bi bi-person-plus me-1"></i> Submit Your Profile
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col md={3}>
          <Form.Select
            value={divisionFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setDivisionFilter(e.target.value as typeof divisionFilter)
            }
          >
            <option value="ALL">All Divisions</option>
            <option value="SD">SD</option>
            <option value="SW">SW</option>
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select
            value={departmentFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setDepartmentFilter(e.target.value)
            }
          >
            <option value="ALL">All Departments</option>
            {DEPARTMENT_DEFS.map((d) => (
              <option key={d.code} value={d.code}>
                {d.code}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select
            value={yearFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setYearFilter(e.target.value)
            }
          >
            <option value="ALL">All Academic Years</option>
            {academicYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Form.Select>
        </Col>
      </Row>

      {loading ? (
        <div className="text-center py-5">
          <Spinner as="span" animation="border" size="sm" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="text-center p-5 text-muted">
          <p className="mb-3">
            No alumni profiles yet. Be the first to share your story!
          </p>
          <Button as={Link} to="/alumni/submit" variant="outline-primary">
            Submit Your Profile
          </Button>
        </Card>
      ) : (
        <Row className="g-3">
          {filtered.map((p) => (
            <Col key={p.id} xs={12} md={6} lg={4}>
              <Card className="shadow-sm h-100">
                <Card.Body>
                  <Card.Title>{p.name}</Card.Title>
                  <div className="mb-2">
                    {p.division && (
                      <Badge
                        bg={p.division === "SD" ? "info" : "warning"}
                        className="me-1"
                      >
                        {p.division}
                      </Badge>
                    )}
                    {p.department && (
                      <Badge bg="secondary" className="me-1">
                        {p.department}
                      </Badge>
                    )}
                    {p.academicYear && (
                      <Badge bg="light" text="dark">
                        {p.academicYear}
                      </Badge>
                    )}
                  </div>
                  {p.rank && (
                    <p className="small mb-1">
                      <strong>Rank:</strong> {p.rank}
                    </p>
                  )}
                  {p.batchYears && (
                    <p className="small mb-1">
                      <strong>Batch:</strong> {p.batchYears}
                    </p>
                  )}
                  {p.achievements && (
                    <Card.Text className="small text-muted">
                      {p.achievements}
                    </Card.Text>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default Alumni;
