import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Tab, Nav } from 'react-bootstrap';
import { BsPerson, BsGear, BsShieldLock, BsPalette, BsBell, BsHddNetwork, BsCheckCircleFill, BsBoxArrowRight, BsController, BsSoundwave, BsXLg, BsShieldCheck, BsCalendar3, BsCpu } from 'react-icons/bs';

const UserSettingsModal = ({ show, onHide, defaultTab = 'profile', user, logout, themeColor, setThemeColor }) => {
    // We use the global themeColor as the initial value
    const [localTheme, setLocalTheme] = useState(themeColor || '#E50914');

    // Other settings
    const [autoDismiss, setAutoDismiss] = useState(true);
    const [enableSounds, setEnableSounds] = useState(false);
    const [privacyShield, setPrivacyShield] = useState(false);

    // Edit Profile State
    const [editMode, setEditMode] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [formData, setFormData] = useState({
        username: user?.username || '',
        email: user?.email || '',
        newPassword: ''
    });

    // Update local state when modal opens or prop changes
    useEffect(() => {
        if (themeColor) setLocalTheme(themeColor);
    }, [themeColor]);

    const handleThemeChange = (color) => {
        setLocalTheme(color);
        if (setThemeColor) setThemeColor(color); // LIVE PREVIEW
    };

    const handleSave = () => {
        // Persist Theme
        localStorage.setItem('themeColor', localTheme);

        // TODO: Persist other settings and profile info to backend

        onHide();
    };

    return (
        <Modal
            show={show}
            onHide={onHide}
            centered
            size="lg"
            contentClassName="border-0 bg-transparent"
            backdropClassName="blur-backdrop"
        >
            <div className="glass-card overflow-hidden" style={{ background: 'rgba(23, 23, 23, 0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Modal.Header className="border-bottom border-secondary px-4 py-3 d-flex align-items-center justify-content-between">
                    <Modal.Title className="fw-bold text-white d-flex align-items-center gap-2">
                        <BsPerson style={{ color: 'var(--primary)' }} /> User Account
                    </Modal.Title>
                    <button className="btn-close-premium" onClick={onHide} aria-label="Close Settings">
                        <BsXLg />
                    </button>
                </Modal.Header>

                <Modal.Body className="p-0">
                    <Tab.Container defaultActiveKey={defaultTab}>
                        <Row className="g-0">
                            {/* Sidebar Navigation */}
                            <Col md={3} className="border-end border-secondary bg-black bg-opacity-25 d-flex flex-column" style={{ minHeight: '450px' }}>
                                <Nav variant="pills" className="flex-column p-3 gap-2 flex-grow-1">
                                    <Nav.Item>
                                        <Nav.Link eventKey="profile" className="text-white d-flex align-items-center gap-2 py-2 px-3 rounded-3" style={{ fontSize: '0.9rem' }}>
                                            <BsPerson size={16} /> Profile
                                        </Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item>
                                        <Nav.Link eventKey="settings" className="text-white d-flex align-items-center gap-2 py-2 px-3 rounded-3" style={{ fontSize: '0.9rem' }}>
                                            <BsGear size={16} /> Settings
                                        </Nav.Link>
                                    </Nav.Item>

                                </Nav>
                                <div className="p-3 border-top border-secondary">
                                    <Button
                                        variant="outline-danger"
                                        className="w-100 d-flex align-items-center justify-content-center gap-2"
                                        onClick={() => setShowLogoutConfirm(true)}
                                    >
                                        <BsBoxArrowRight /> Sign Out
                                    </Button>
                                </div>
                            </Col>

                            {/* Content Area */}
                            <Col md={9}>
                                <Tab.Content className="p-4 custom-scrollbar" style={{ height: '450px', overflowY: 'auto' }}>

                                    {/* --- PROFILE TAB --- */}
                                    <Tab.Pane eventKey="profile">
                                        <div className="d-flex align-items-start gap-4 mb-5">
                                            <div
                                                className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-lg flex-shrink-0"
                                                style={{
                                                    width: '80px',
                                                    height: '80px',
                                                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
                                                    fontSize: '2rem',
                                                    border: '4px solid rgba(255,255,255,0.1)'
                                                }}
                                            >
                                                {user?.username ? user.username.charAt(0).toUpperCase() : "U"}
                                            </div>
                                            <div className="flex-grow-1">
                                                <div className="d-flex justify-content-between align-items-start">
                                                    <div>
                                                        <h4 className="text-white fw-bold mb-1">{user?.username || "User"}</h4>
                                                        <p className="text-muted mb-2">{user?.email || "user@datarefine.ai"}</p>
                                                        <div className="d-flex gap-2">
                                                            <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-3 py-2 rounded-pill">{user?.profession || "Data Analyst"}</span>
                                                            <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-2 rounded-pill">Active</span>
                                                        </div>
                                                    </div>
                                                    <Button variant="link" className="text-primary text-decoration-none small" onClick={() => setEditMode(!editMode)}>
                                                        {editMode ? 'Cancel Editing' : 'Edit Details'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {editMode && (
                                            <div className="mb-5 p-3 rounded-3 bg-dark border border-secondary fade-in-up">
                                                <Row className="g-3">
                                                    <Col md={6}>
                                                        <label className="text-muted small fw-bold mb-1">USERNAME</label>
                                                        <Form.Control type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="input-modern bg-black border-secondary" />
                                                    </Col>
                                                    <Col md={6}>
                                                        <label className="text-muted small fw-bold mb-1">EMAIL</label>
                                                        <Form.Control type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-modern bg-black border-secondary" />
                                                    </Col>
                                                    <Col md={12}>
                                                        <label className="text-muted small fw-bold mb-1">NEW PASSWORD (OPTIONAL)</label>
                                                        <Form.Control type="password" placeholder="Leave blank to keep current" value={formData.newPassword} onChange={e => setFormData({ ...formData, newPassword: e.target.value })} className="input-modern bg-black border-secondary" />
                                                    </Col>
                                                </Row>
                                            </div>
                                        )}

                                        <h6 className="text-white fw-bold mb-3 border-bottom border-secondary pb-2" style={{ fontSize: '0.9rem', letterSpacing: '1px' }}>SYSTEM INTELLIGENCE</h6>
                                        <Row className="g-2">
                                            <Col sm={4}>
                                                <div className="p-3 rounded-4 bg-dark border border-secondary text-center hover-premium h-100" style={{ background: 'linear-gradient(145deg, #111, #1a1a1a)' }}>
                                                    <BsCalendar3 className="text-primary mb-2" size={18} />
                                                    <small className="text-muted d-block mb-1" style={{ fontSize: '0.65rem', fontWeight: 'bold' }}>MEMBER SINCE</small>
                                                    <h6 className="text-white mb-0" style={{ fontSize: '0.85rem' }}>
                                                        {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Jan 2026'}
                                                    </h6>
                                                </div>
                                            </Col>
                                            <Col sm={4}>
                                                <div className="p-3 rounded-4 bg-dark border border-secondary text-center hover-premium h-100" style={{ background: 'linear-gradient(145deg, #111, #1a1a1a)' }}>
                                                    <BsShieldCheck className="text-success mb-2" size={18} />
                                                    <small className="text-muted d-block mb-1" style={{ fontSize: '0.65rem', fontWeight: 'bold' }}>ACCOUNT TRUST</small>
                                                    <h6 className="text-white mb-0" style={{ fontSize: '0.85rem' }}>Verified Node</h6>
                                                </div>
                                            </Col>
                                            <Col sm={4}>
                                                <div className="p-3 rounded-4 bg-dark border border-secondary text-center hover-premium h-100" style={{ background: 'linear-gradient(145deg, #111, #1a1a1a)' }}>
                                                    <BsCpu className="text-info mb-2" size={18} />
                                                    <small className="text-muted d-block mb-1" style={{ fontSize: '0.65rem', fontWeight: 'bold' }}>ENVIRONMENT</small>
                                                    <h6 className="text-white mb-0" style={{ fontSize: '0.75rem' }}>
                                                        {/Windows/.test(navigator.userAgent) ? 'Windows' : /Mac/.test(navigator.userAgent) ? 'macOS' : 'Linux'} • {/Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent) ? 'Chrome' : /Edg/.test(navigator.userAgent) ? 'Edge' : 'Safari'}
                                                    </h6>
                                                </div>
                                            </Col>
                                        </Row>
                                    </Tab.Pane>

                                    {/* --- SETTINGS TAB --- */}
                                    <Tab.Pane eventKey="settings">
                                        <h5 className="fw-bold text-white mb-4">Preferences & Experiments</h5>

                                        <div className="mb-4">
                                            <label className="text-white fw-bold mb-3 d-flex align-items-center gap-2">
                                                <BsPalette /> Theme Accent
                                            </label>
                                            <div className="d-flex gap-3">
                                                {['#E50914', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b'].map(c => (
                                                    <div
                                                        key={c}
                                                        className={`rounded-circle cursor-pointer position-relative hover-scale`}
                                                        style={{ width: '32px', height: '32px', background: c, border: localTheme === c ? '2px solid white' : '2px solid transparent', boxShadow: '0 0 10px ' + c }}
                                                        onClick={() => handleThemeChange(c)}
                                                    >
                                                        {localTheme === c && <BsCheckCircleFill className="position-absolute top-50 start-50 translate-middle text-white" size={12} />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="mb-3 bg-dark border border-secondary rounded-3 p-3">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="p-2 rounded bg-primary bg-opacity-10 text-primary"><BsShieldLock size={20} /></div>
                                                    <div>
                                                        <span className="text-white d-block fw-bold">Privacy Shield</span>
                                                        <small className="text-muted">Auto-mask sensitive columns in previews.</small>
                                                    </div>
                                                </div>
                                                <Form.Check type="switch" checked={privacyShield} onChange={(e) => setPrivacyShield(e.target.checked)} className="custom-switch" />
                                            </div>
                                        </div>

                                        <div className="mb-3 bg-dark border border-secondary rounded-3 p-3">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="p-2 rounded bg-info bg-opacity-10 text-info"><BsSoundwave size={20} /></div>
                                                    <div>
                                                        <span className="text-white d-block fw-bold">UI Sound Effects</span>
                                                        <small className="text-muted">Play subtle sounds on interactions.</small>
                                                    </div>
                                                </div>
                                                <Form.Check type="switch" checked={enableSounds} onChange={(e) => setEnableSounds(e.target.checked)} className="custom-switch" />
                                            </div>
                                        </div>

                                        <div className="mb-3 bg-dark border border-secondary rounded-3 p-3">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="p-2 rounded bg-warning bg-opacity-10 text-warning"><BsBell size={20} /></div>
                                                    <div>
                                                        <span className="text-white d-block fw-bold">Auto-Dismiss Alerts</span>
                                                        <small className="text-muted">Clear notifications after 8 seconds.</small>
                                                    </div>
                                                </div>
                                                <Form.Check type="switch" checked={autoDismiss} onChange={(e) => setAutoDismiss(e.target.checked)} className="custom-switch" />
                                            </div>
                                        </div>

                                    </Tab.Pane>
                                </Tab.Content>
                            </Col>
                        </Row>
                    </Tab.Container>
                </Modal.Body>

                <Modal.Footer className="border-top border-secondary bg-black bg-opacity-25 justify-content-between px-4">
                    <div className="d-flex align-items-center gap-2">
                        <span className="text-muted small" style={{ letterSpacing: '0.5px' }}>NODE IDENTITY:</span>
                        <span className="badge bg-primary bg-opacity-25 text-primary border border-primary border-opacity-25 px-2 py-1" style={{ fontSize: '0.75rem', fontFamily: 'monospace', boxShadow: '0 0 10px rgba(var(--primary-rgb), 0.2)' }}>
                            #{user?.id ? user.id.toString().padStart(4, '0') : '0000'}
                        </span>
                    </div>
                    <Button
                        variant="danger"
                        onClick={handleSave}
                        className="px-4 fw-bold"
                        style={{ background: 'var(--primary)', borderColor: 'var(--primary)' }}
                    >
                        Save Changes
                    </Button>
                </Modal.Footer>
            </div>

            {/* --- LOGOUT CONFIRMATION MODAL --- */}
            <Modal
                show={showLogoutConfirm}
                onHide={() => setShowLogoutConfirm(false)}
                centered
                size="sm"
                contentClassName="border-0 bg-transparent"
                backdropClassName="blur-backdrop"
                style={{ zIndex: 1100 }}
            >
                <div className="p-4 rounded-4" style={{ background: 'rgba(23, 23, 23, 0.98)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 0 50px rgba(0,0,0,0.8)' }}>
                    <div className="text-center mb-4">
                        <div className="d-inline-flex p-3 rounded-circle bg-danger bg-opacity-10 text-danger mb-3">
                            <BsBoxArrowRight size={32} />
                        </div>
                        <h5 className="text-white fw-bold">Sign Out?</h5>
                        <p className="text-muted small">Are you sure you want to terminate your current session?</p>
                    </div>
                    <div className="d-flex gap-2">
                        <Button
                            variant="secondary"
                            className="flex-grow-1 py-2 border-0"
                            style={{ background: 'rgba(255,255,255,0.05)' }}
                            onClick={() => setShowLogoutConfirm(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            className="flex-grow-1 py-2 btn-glow"
                            onClick={() => {
                                setShowLogoutConfirm(false);
                                onHide();
                                logout();
                            }}
                        >
                            Sign Out
                        </Button>
                    </div>
                </div>
            </Modal>
        </Modal>
    );
};

export default UserSettingsModal;
