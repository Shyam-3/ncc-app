import React, { useEffect, useRef, useState } from 'react';
import { Container, Nav, Navbar, NavDropdown } from 'react-bootstrap';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AppNavbar: React.FC = () => {
  const { currentUser, userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const navbarRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
    setExpanded(false);
  };

  const closeMenu = () => {
    setExpanded(false);
  };

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target as Node)) {
        setExpanded(false);
      }
    };

    if (expanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expanded]);

  return (
    <Navbar 
      bg="dark" 
      variant="dark" 
      expand="md" 
      sticky="top" 
      expanded={expanded}
      onToggle={(isExpanded: boolean) => setExpanded(isExpanded)}
      ref={navbarRef}
    >
      <Container className="position-relative">
        <Navbar.Brand as={Link} to="/" onClick={closeMenu}>
          <i className="bi bi-shield-fill me-2"></i>
          NCC Army Wing
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" className="ms-auto" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto text-md-end">
            <Nav.Link as={NavLink} to="/" onClick={closeMenu}>Home</Nav.Link>
            <Nav.Link as={NavLink} to="/about" onClick={closeMenu}>About</Nav.Link>
            <NavDropdown title="Activities" id="activities-dropdown">
              <NavDropdown.Item as={Link} to="/activities/camps" onClick={closeMenu}>Camps</NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/activities/social-service" onClick={closeMenu}>Social Service</NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/activities/parades" onClick={closeMenu}>Parades</NavDropdown.Item>
            </NavDropdown>
            <NavDropdown title="Events" id="events-dropdown">
              <NavDropdown.Item as={Link} to="/events/national-days" onClick={closeMenu}>National Days</NavDropdown.Item>
            </NavDropdown>
            <NavDropdown title="Gallery" id="gallery-dropdown">
              <NavDropdown.Item as={Link} to="/gallery/photos" onClick={closeMenu}>Photos</NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/gallery/videos" onClick={closeMenu}>Videos</NavDropdown.Item>
            </NavDropdown>
            <NavDropdown title="Cadets" id="cadets-dropdown">
              <NavDropdown.Item as={Link} to="/cadets/list" onClick={closeMenu}>List</NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/cadets/ranks" onClick={closeMenu}>Ranks</NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/cadets/achievements" onClick={closeMenu}>Achievements</NavDropdown.Item>
            </NavDropdown>
            {/* Removed Resources, Notifications, Alumni, Contact from top nav as requested */}
            
            {currentUser ? (
              <>
                <Nav.Link as={NavLink} to="/dashboard" onClick={closeMenu}>Dashboard</Nav.Link>
                <NavDropdown
                  title={
                    <span className="d-inline-flex align-items-center">
                      <i className="bi bi-person-circle me-1"></i>
                      <span className="truncate-name">{userProfile?.name || currentUser.email}</span>
                    </span>
                  }
                  id="user-dropdown"
                >
                  <NavDropdown.Item as={Link} to="/profile" onClick={closeMenu}>My Profile</NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right me-2"></i>
                    Logout
                  </NavDropdown.Item>
                </NavDropdown>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/login" onClick={closeMenu}>Login</Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;
