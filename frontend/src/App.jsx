import { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Form, ProgressBar, Table, Navbar, Nav, Badge, Modal } from 'react-bootstrap';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import AiInsights from './components/AiInsights';

import RuleManager from './components/RuleManager';
import AnalyticsHub from './components/AnalyticsHub';
import AuditLogBoard from './components/AuditLogBoard';
import ChatAssistant from './components/ChatAssistant';
import NotificationCenter from './components/NotificationCenter';
import UserProfile from './components/UserProfile';
import UserSettingsModal from './components/UserSettingsModal';
import GuidedWizard from './components/GuidedWizard';
import NextStepRecommendations from './components/NextStepRecommendations';
import ResidualRiskMonitor from './components/ResidualRiskMonitor';
import LabelErrorDetector from './components/LabelErrorDetector';
import DatasetHistoryModal from './components/DatasetHistoryModal';
import api from './api';


import { BsCloudUpload, BsShieldCheck, BsExclamationTriangle, BsLightningCharge, BsBoxArrowRight, BsStars, BsCpu, BsGlobe, BsCodeSlash, BsGrid1X2, BsLayers, BsFileEarmarkPdf, BsBarChart, BsPerson, BsEnvelope, BsShieldLock, BsChevronLeft, BsChevronRight, BsEye, BsEyeSlash, BsXLg, BsArrowLeft } from 'react-icons/bs';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// --- Modern Chart Config ---
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom',
            labels: {
                color: '#94a3b8',
                font: { family: "'Inter', sans-serif", size: 12 },
                usePointStyle: true,
                padding: 20,
            }
        }
    },
    scales: {
        y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8', font: { family: "'Inter', sans-serif" } },
            border: { display: false }
        },
        x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { family: "'Inter', sans-serif" } },
            border: { display: false }
        }
    }
};

const miniChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, title: { display: true, color: '#fff', font: { size: 14 } } },
    scales: {
        y: { ticks: { display: false }, grid: { display: false }, border: { display: false } },
        x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false }, border: { display: false } }
    },
    layout: { padding: 10 }
};

const comparisonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { position: 'top', labels: { color: '#fff' } },
        title: { display: true, color: '#fff', font: { size: 16 } }
    },
    scales: {
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#cbd5e1' } },
        x: { grid: { display: false }, ticks: { color: '#cbd5e1' } }
    }
};

function App() {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });

    // --- THEME MANAGEMENT ---
    const [themeColor, setThemeColor] = useState(localStorage.getItem('themeColor') || '#E50914');

    useEffect(() => {
        document.documentElement.style.setProperty('--primary', themeColor);
        // Create a hover variant (darker)
        // Simple logic: if red, darken it. For hex, it's complex, so for now we'll just set it same or rely on CSS filter
        // Better: Let's just set the variable.
        document.documentElement.style.setProperty('--primary-hover', themeColor);
    }, [themeColor]);

    // Restore user session if missing
    useEffect(() => {
        if (token && !user) {
            api.get('/auth/me')
                .then(res => {
                    setUser(res.data.user);
                    localStorage.setItem('user', JSON.stringify(res.data.user));
                })
                .catch(() => {
                    // Token invalid? Logout.
                    localStorage.removeItem('token');
                    setToken(null);
                });
        }
    }, [token, user]);

    if (!token) return <Login setToken={setToken} setUser={setUser} />;

    return <Dashboard token={token} user={user} logout={() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    }} themeColor={themeColor} setThemeColor={setThemeColor} />;
}

// --- Background Component ---
const Aurora = () => (
    <div className="aurora-container">
        <div className="aurora-blob blob-1"></div>
        <div className="aurora-blob blob-2"></div>
        <div className="aurora-blob blob-3"></div>
    </div>
);

function ForgotPasswordModal({ show, onHide }) {
    const [resetEmail, setResetEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const handleReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        setError(null);
        try {
            const res = await api.post('/auth/forgot-password', { email: resetEmail });
            setMessage(res.data.message);
            setResetEmail('');
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered contentClassName="border-0 bg-transparent">
            <div className="p-4 rounded-4" style={{ background: 'rgba(23, 23, 23, 0.95)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 0 40px rgba(0,0,0,0.5)' }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4 className="text-white fw-bold mb-0">Reset Password</h4>
                    <BsXLg className="text-muted cursor-pointer" onClick={onHide} />
                </div>

                {message ? (
                    <div className="text-center py-4">
                        <BsShieldCheck size={48} className="text-success mb-3" />
                        <p className="text-white mb-4">{message}</p>
                        <Button className="w-100 btn-glow" onClick={onHide}>Back to Login</Button>
                    </div>
                ) : (
                    <Form onSubmit={handleReset}>
                        <p className="text-white-50 small mb-4">Enter your email address to receive a secure password reset link.</p>

                        {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

                        <Form.Group className="mb-4">
                            <label className="input-label" style={{ color: '#e5e5e5' }}>EMAIL ADDRESS</label>
                            <Form.Control
                                type="email"
                                value={resetEmail}
                                onChange={e => setResetEmail(e.target.value)}
                                required
                                className="input-modern"
                                placeholder="name@example.com"
                                style={{ background: 'rgba(0,0,0,0.6)', borderColor: 'rgba(255,255,255,0.2)' }}
                            />
                        </Form.Group>

                        <Button type="submit" className="btn-glow w-100 py-3" disabled={loading}>
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </Button>
                    </Form>
                )}
            </div>
        </Modal>
    );
}

function Login({ setToken, setUser }) {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [profession, setProfession] = useState('');
    const [isExiting, setIsExiting] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [showForgotModal, setShowForgotModal] = useState(false);

    // --- RESTORE REMEMBERED USER ---
    useEffect(() => {
        const savedUser = localStorage.getItem('rememberedUsername');
        if (savedUser) {
            setUsername(savedUser);
            setRememberMe(true);
        }
    }, []);



    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isRegister) {
                await api.post('/auth/register', { username, email, password, profession });
                setIsRegister(false);
                alert('Account Created! Please Login.');
            } else {
                const res = await api.post('/auth/login', { username, password });

                // --- TRIGGER EXIT ANIMATION ---
                setIsExiting(true);

                // Wait for animation to finish before switching state
                setTimeout(() => {
                    localStorage.setItem('token', res.data.token);
                    localStorage.setItem('user', JSON.stringify(res.data.user));

                    // --- HANDLE REMEMBER ME ---
                    if (rememberMe) {
                        localStorage.setItem('rememberedUsername', username);
                    } else {
                        localStorage.removeItem('rememberedUsername');
                    }

                    setToken(res.data.token);
                    setUser(res.data.user);
                }, 800);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Error');
        }
    };

    return (
        <div className="min-vh-100 d-flex position-relative" style={{ background: '#000000', overflow: 'hidden' }}>
            {/* Background Image Layer */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundImage: 'url("https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.4,
                zIndex: 0
            }}></div>

            {/* Gradient Overlay */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0.4) 100%)',
                zIndex: 1
            }}></div>

            <Container fluid className="position-relative" style={{ zIndex: 2 }}>
                <Row className="min-vh-100">
                    {/* Left Side: Welcome Text */}
                    <Col lg={7} className="d-flex flex-column justify-content-center text-white px-5">
                        <div className="ps-lg-5">
                            <h1 className="display-2 fw-bold mb-3" style={{ lineHeight: 1.1 }}>
                                Welcome
                            </h1>

                            <p className="lead text-white-50 mb-5" style={{ maxWidth: '450px' }}>
                                Access the next generation of intelligent data cleaning and management.
                                Secure, fast, and automated.
                            </p>

                            <div className="d-flex gap-3 mb-5">
                                <BsGlobe size={20} className="text-white-50" />
                                <BsShieldCheck size={20} className="text-white-50" />
                                <BsCpu size={20} className="text-white-50" />
                            </div>

                            <div className="mt-auto">
                                <h3 className="fw-bold d-flex align-items-center gap-2">
                                    <BsLayers style={{ color: 'var(--primary)' }} /> Data Refine
                                </h3>
                            </div>
                        </div>
                    </Col>

                    {/* Right Side: Form */}
                    <Col lg={5} className="d-flex flex-column justify-content-center p-5">
                        <div className={`position-relative ${isExiting ? 'login-exit-anim' : 'fade-in-up'}`} style={{ maxWidth: '400px', margin: '0 auto', width: '100%' }}>



                            <h2 className="fw-bold mb-4 text-white text-center text-lg-start">
                                {isRegister ? 'Create Account' : 'Login'}
                            </h2>

                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-4">
                                    <label className="input-label" style={{ color: '#e5e5e5' }}>USERNAME</label>
                                    <Form.Control
                                        type="text"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        required
                                        className="input-modern"
                                        placeholder="Enter ID..."
                                        style={{ background: 'rgba(0,0,0,0.6)', borderColor: 'rgba(255,255,255,0.2)' }}
                                    />
                                </Form.Group>

                                {isRegister && (
                                    <>
                                        <Form.Group className="mb-4">
                                            <label className="input-label" style={{ color: '#e5e5e5' }}>EMAIL ADDRESS</label>
                                            <Form.Control
                                                type="email"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                required
                                                className="input-modern"
                                                placeholder="name@example.com"
                                                style={{ background: 'rgba(0,0,0,0.6)', borderColor: 'rgba(255,255,255,0.2)' }}
                                            />
                                        </Form.Group>
                                        <Form.Group className="mb-4">
                                            <label className="input-label" style={{ color: '#e5e5e5' }}>PROFESSION</label>
                                            <Form.Control
                                                type="text"
                                                value={profession}
                                                onChange={e => setProfession(e.target.value)}
                                                required
                                                className="input-modern"
                                                placeholder="e.g. Data Scientist"
                                                style={{ background: 'rgba(0,0,0,0.6)', borderColor: 'rgba(255,255,255,0.2)' }}
                                            />
                                        </Form.Group>
                                    </>
                                )}

                                <Form.Group className="mb-5 position-relative">
                                    <label className="input-label" style={{ color: '#e5e5e5' }}>PASSWORD</label>
                                    <div className="position-relative">
                                        <Form.Control
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            required
                                            className="input-modern pe-5" // Added padding-right to prevent text overlap with icon
                                            placeholder="••••••••"
                                            style={{ background: 'rgba(0,0,0,0.6)', borderColor: 'rgba(255,255,255,0.2)' }}
                                        />
                                        <div
                                            className="position-absolute top-50 end-0 translate-middle-y me-3 password-toggle-premium"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <BsEyeSlash size={20} /> : <BsEye size={20} />}
                                        </div>
                                    </div>
                                </Form.Group>

                                <div className="d-flex justify-content-between align-items-center mb-5">
                                    <Form.Check
                                        type="checkbox"
                                        id="remember-me"
                                        label="Remember Me"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="custom-checkbox-premium mb-0"
                                        style={{ fontSize: '0.85rem' }}
                                    />
                                    <span
                                        className="small text-white-50"
                                        style={{ cursor: 'pointer', opacity: 0.7 }}
                                        onClick={() => setShowForgotModal(true)}
                                    >
                                        Forgot Password?
                                    </span>
                                </div>

                                <Button type="submit" className="btn-glow w-100 mb-4 py-3">
                                    {isRegister ? 'Register Now' : 'Sign in now'}
                                </Button>

                                <div className="text-center text-lg-start">
                                    <p className="text-white-50 small mb-0">
                                        {isRegister ? 'Already have access?' : 'New to Data Refine?'}
                                        <span
                                            className="ms-2 fw-bold text-white"
                                            style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                            onClick={() => setIsRegister(!isRegister)}
                                        >
                                            {isRegister ? 'Login' : 'Register'}
                                        </span>
                                    </p>
                                </div>
                            </Form>
                        </div>
                    </Col>
                </Row>
                <ForgotPasswordModal show={showForgotModal} onHide={() => setShowForgotModal(false)} />
            </Container >
        </div >
    );
}

function Dashboard({ logout, user, themeColor, setThemeColor }) {
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [activeDataset, setActiveDataset] = useState(null);
    const [showAbout, setShowAbout] = useState(false);
    const [showContact, setShowContact] = useState(false);
    const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });

    // User Settings Modal State
    const [showSettings, setShowSettings] = useState(false);
    const [settingsTab, setSettingsTab] = useState('profile');

    const openSettings = (tab) => {
        setSettingsTab(tab);
        setShowSettings(true);
    };

    // --- UPLOAD FLOW STATE ---
    const [uploadPreview, setUploadPreview] = useState(null); // { temp_id, preview, metadata, filename }
    const [isConfirmed, setIsConfirmed] = useState(false);

    const cancelUpload = () => {
        setFile(null);
        setUploadPreview(null);
        setIsConfirmed(false);
    };

    const confirmAndAnalyze = async () => {
        if (!uploadPreview?.temp_id) return;
        setUploading(true);
        try {
            const res = await api.post('/datasets/confirm', {
                temp_id: uploadPreview.temp_id,
                description: 'Uploaded via Web'
            });
            setActiveDataset(res.data.version);
            setUploadPreview(null);
            addNotification("Analysis Completed", "Dataset confirmed and analyzed.", "success");
        } catch (err) {
            console.error(err);
            addNotification("Analysis Failed", "Could not complete analysis.", "error");
        } finally {
            setUploading(false);
        }
    };

    // --- NOTIFICATION SYSTEM (LIFTED STATE) ---
    const [notifications, setNotifications] = useState([]);

    const addNotification = (title, message, type = 'info') => {
        const id = Date.now();
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setNotifications(prev => [{ id, title, message, type, time }, ...prev]);
        setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 8000);
    };
    // ------------------------------------------

    const handleContactSubmit = (e) => {
        e.preventDefault();

        // Construct Mailto Link for actual sending
        const recipient = "malesaketh@gmail.com";
        const subject = encodeURIComponent(`[Platform Support] ${contactForm.subject}`);
        const body = encodeURIComponent(
            `Hi Support Team,\n\nI have the following inquiry:\n\n${contactForm.message}\n\n--\nName: ${contactForm.name}\nEmail: ${contactForm.email}`
        );

        // Open Default Mail Client
        window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;

        alert(`Redirecting to your email client...`);
        setContactForm({ name: '', email: '', subject: '', message: '' });
        setShowContact(false);
    };

    // Validate file extension
    const validateFile = (file) => {
        const validExtensions = ['csv', 'json', 'xls', 'xlsx'];
        const fileExtension = file.name.split('.').pop().toLowerCase();

        // Explicit check for unsupported types to ensure alert is triggered
        const unsupportedTypes = ['pdf', 'docx', 'txt', 'png', 'jpeg', 'jpg'];

        if (!validExtensions.includes(fileExtension)) {
            // "File not compatible for analysis" as requested
            addNotification("Incompatible File", "File not compatible for analysis", "error");
            return false;
        }
        return true;
    };

    // --- DRAG AND DROP HANDLERS ---
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles && droppedFiles.length > 0) {
            const droppedFile = droppedFiles[0];
            if (validateFile(droppedFile)) {
                setFile(droppedFile);
            }
            // Optional: Auto-trigger upload here if you want
            // handleUpload(null, droppedFiles[0]); 
        }
    };

    const handleUpload = async (e) => {
        if (e) e.preventDefault();
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        setUploading(true);
        try {
            // STAGE 1: Upload & Preview (Power BI Style)
            const res = await api.post('/datasets/stage', formData);
            setUploadPreview(res.data); // { temp_id, preview, metadata, filename }
            addNotification("File Staged", "Please confirm data to proceed.", "info");
        } catch (err) {
            console.error(err);
            if (!err.response) {
                addNotification("Connection Failed", "Backend server unreachable.", "error");
            } else {
                console.error("Upload Error Details:", err.response);
                if (err.response.status === 422 || err.response.status === 401) {
                    addNotification("Session Expired", "Please login again.", "warning");
                    localStorage.removeItem('token');
                    window.location.reload();
                    return;
                }
                const msg = err.response.data?.error || err.response.data?.message || err.message;
                addNotification("Upload Failed", msg, "error");
            }
        }
        finally { setUploading(false); }
    };

    return (
        <>
            <Aurora />
            <div className="min-vh-100 fade-in-up">
                <Navbar className="py-3 px-4 glass-card rounded-0 border-top-0 border-start-0 border-end-0 mb-5" style={{ borderRadius: 0 }}>
                    <Container fluid>
                        <Navbar.Brand
                            className="fw-bold d-flex align-items-center gap-2 text-white"
                            style={{ cursor: 'pointer' }}
                            onClick={() => setActiveDataset(null)}
                        >
                            <BsLayers size={24} style={{ color: 'var(--primary)' }} />
                            <span style={{ fontFamily: 'Inter', fontWeight: 900, color: '#FFFFFF' }}>DATA REFINE</span>
                        </Navbar.Brand>
                        <Nav className="ms-auto align-items-center gap-4">
                            <Nav.Link onClick={() => setShowAbout(true)} className="text-white small fw-bold text-decoration-none">About Us</Nav.Link>
                            <Nav.Link onClick={() => setShowContact(true)} className="text-white small fw-bold text-decoration-none">Contact Us</Nav.Link>

                            {/* NOTIFICATION BELL */}
                            <NotificationCenter
                                notifications={notifications}
                                onClear={() => setNotifications([])}
                                onDismiss={(id) => setNotifications(prev => prev.filter(n => n.id !== id))}
                            />

                            <div className="d-none d-md-flex align-items-center gap-2 px-3 py-1 rounded-pill" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 10px #4ade80' }}></div>
                                <span className="small text-muted">System Active</span>
                            </div>
                            {/* USER PROFILE */}
                            <UserProfile logout={logout} user={user} openSettings={openSettings} />
                        </Nav>
                    </Container>
                </Navbar>

                <Container className="pb-5">
                    {!activeDataset ? (
                        <Row className="justify-content-center">
                            <Col md={10} lg={8} className="text-center">
                                <div className="mb-5">
                                    <h1 className="display-3 fw-bold mb-3">Data Ingestion</h1>
                                    <p className="text-muted lead mx-auto" style={{ maxWidth: '600px' }}>
                                        Upload your dataset to begin the automated structural analysis and rectification process.
                                        Supports CSV, JSON, and Excel formats up to 500MB.
                                    </p>
                                </div>

                                <div
                                    className={`glass-card mb-5 p-0 overflow-hidden ${isDragging ? 'drag-active' : ''}`}
                                    onClick={() => document.getElementById('fileInput').click()}
                                    onDragOver={handleDragOver}
                                    onDragEnter={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <div className={`upload-zone py-5 ${isDragging ? 'drag-active' : ''}`}>
                                        <div className="mb-4 d-inline-block p-4 rounded-circle" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                            <BsCloudUpload size={48} style={{ color: 'var(--primary)' }} />
                                        </div>
                                        <h3 className="fw-bold mb-2">Drop Dataset Here</h3>
                                        <p className="text-muted small mb-4">or click to browse local files</p>
                                        <Form onSubmit={handleUpload} className="d-inline-block w-100" style={{ maxWidth: '300px' }}>
                                            <Form.Control
                                                id="fileInput"
                                                type="file"
                                                className="d-none"
                                                onChange={e => {
                                                    const selectedFile = e.target.files[0];
                                                    if (selectedFile && validateFile(selectedFile)) {
                                                        setFile(selectedFile);
                                                    }
                                                }}
                                            />
                                            {file && (
                                                <div className="text-center p-3 rounded-3" style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                    <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
                                                        <BsCodeSlash size={16} className="text-muted" />
                                                        <span className="text-white fw-medium">{file.name}</span>
                                                    </div>
                                                    {uploading ?
                                                        <div>
                                                            <ProgressBar animated now={100} className="mb-2" style={{ height: '4px', backgroundColor: '#333' }} />
                                                            <span className="small text-white">Processing...</span>
                                                        </div> :
                                                        <Button onClick={(e) => { e.stopPropagation(); handleUpload(e); }} className="btn-glow w-100 py-2 text-uppercase" style={{ fontSize: '0.8rem' }}>
                                                            Analyze
                                                        </Button>
                                                    }
                                                </div>
                                            )}
                                        </Form>
                                    </div>
                                </div>

                                <Row className="g-4 justify-content-center">
                                    <Col md={4}>
                                        <div className="feature-card p-4 rounded-3 h-100">
                                            <BsShieldCheck size={28} className="mb-3" style={{ color: 'var(--primary)' }} />
                                            <h5 className="fw-bold mb-2">Secure</h5>
                                            <p className="small text-muted mb-0">End-to-end encryption for all uploaded data.</p>
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="feature-card p-4 rounded-3 h-100">
                                            <BsLightningCharge size={28} className="mb-3" style={{ color: 'var(--primary)' }} />
                                            <h5 className="fw-bold mb-2">Fast</h5>
                                            <p className="small text-muted mb-0">Processing engine optimized for speed.</p>
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="feature-card p-4 rounded-3 h-100">
                                            <BsCpu size={28} className="mb-3" style={{ color: 'var(--primary)' }} />
                                            <h5 className="fw-bold mb-2">Smart</h5>
                                            <p className="small text-muted mb-0">AI-driven anomaly detection algorithms.</p>
                                        </div>
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
                    ) : (
                        <DatasetView
                            version={activeDataset}
                            reset={() => setActiveDataset(null)}
                            onUpdate={setActiveDataset}
                            addNotification={addNotification}
                        />
                    )}
                </Container>
            </div>
            {/* About Us Modal */}
            <Modal show={showAbout} onHide={() => setShowAbout(false)} centered size="lg" contentClassName="bg-dark text-white border-0">
                <Modal.Header closeButton closeVariant="white" className="border-bottom border-secondary" style={{ borderColor: 'rgba(255,255,255,0.1) !important' }}>
                    <Modal.Title className="fw-bold">About Data Refine</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4" style={{ background: '#141414' }}>
                    <p style={{ color: '#e5e5e5', lineHeight: '1.7', marginBottom: '1rem', fontSize: '1rem' }}>
                        We are building an intelligent data management platform designed to simplify the process of identifying, correcting, and managing data quality issues.
                        In today’s data-driven environment, inaccurate or inconsistent datasets can lead to unreliable analysis and poor decision-making. Our platform addresses
                        this challenge by providing an automated, secure, and user-friendly solution for dataset error detection and rectification.
                    </p>
                    <p style={{ color: '#e5e5e5', lineHeight: '1.7', marginBottom: '1rem', fontSize: '1rem' }}>
                        The Intelligent Dataset Management Platform enables users to upload datasets and automatically detect common data issues such as missing values,
                        duplicates, type mismatches, and formatting errors. By combining rule-based validation with intelligent correction techniques, the system ensures
                        that data is cleaned responsibly and accurately. Users also have full control through manual editing, before-and-after comparisons, and detailed data quality insights.
                    </p>
                    <p className="mb-0" style={{ color: '#e5e5e5', lineHeight: '1.7', fontSize: '1rem' }}>
                        Designed for students, researchers, and professionals, our platform bridges the gap between technical complexity and usability.
                        It focuses on ethical data cleaning practices, scalability for large datasets, and transparency in every correction made.
                        Our goal is to help users build confidence in their data by transforming raw datasets into reliable, analysis-ready information.
                    </p>
                </Modal.Body>
                <Modal.Footer className="border-top-0" style={{ background: '#141414' }}>
                    <Button variant="secondary" onClick={() => setShowAbout(false)} className="rounded-1 text-white fw-bold px-4" style={{ background: 'var(--primary)', border: 'none' }}>Close</Button>
                </Modal.Footer>
            </Modal>

            {/* Contact Us Modal */}
            <Modal show={showContact} onHide={() => setShowContact(false)} centered size="lg" contentClassName="bg-dark text-white border-0">
                <Modal.Header closeButton closeVariant="white" className="border-bottom border-secondary" style={{ borderColor: 'rgba(255,255,255,0.1) !important' }}>
                    <Modal.Title className="fw-bold">Contact Us</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4" style={{ background: '#141414' }}>
                    <p style={{ color: '#e5e5e5', lineHeight: '1.7', marginBottom: '2rem' }}>
                        We’re here to help you with any questions, feedback, or support related to the Intelligent Dataset Management Platform. If you encounter issues, have suggestions for improvement.
                    </p>

                    <Row>
                        <Col md={6} className="mb-4">
                            <h5 className="fw-bold mb-3 text-white">Get in Touch</h5>
                            <ul className="list-unstyled" style={{ color: '#b3b3b3' }}>
                                <li className="mb-2">📧 malesaketh@gmail.com</li>
                                <li className="mb-2">📞 +91-6305934481</li>
                                <li className="mb-2">📍 MLR Institute of Technology, Hyderabad</li>
                                <li className="mb-2">🎓 Computer Science and Engineering – Data Science</li>
                            </ul>

                            <h5 className="fw-bold mb-3 mt-4 text-white">Why Contact Us?</h5>
                            <ul className="list-unstyled" style={{ color: '#b3b3b3', fontSize: '0.95rem' }}>
                                <li>• Technical support or bug reporting</li>
                                <li>• Feedback and feature suggestions</li>
                                <li>• Academic or project-related queries</li>
                                <li>• Collaboration or guidance requests</li>
                            </ul>
                        </Col>

                        <Col md={6}>
                            <div className="p-4 rounded-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                <h5 className="fw-bold mb-3 text-white">Send Us a Message</h5>
                                <Form onSubmit={handleContactSubmit}>
                                    <Form.Group className="mb-3">
                                        <Form.Control
                                            type="text"
                                            placeholder="Name"
                                            required
                                            value={contactForm.name}
                                            onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                                            className="input-modern"
                                            style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.1)' }}
                                        />
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Control
                                            type="email"
                                            placeholder="Email Address"
                                            required
                                            value={contactForm.email}
                                            onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                                            className="input-modern"
                                            style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.1)' }}
                                        />
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Control
                                            type="text"
                                            placeholder="Subject"
                                            required
                                            value={contactForm.subject}
                                            onChange={e => setContactForm({ ...contactForm, subject: e.target.value })}
                                            className="input-modern"
                                            style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.1)' }}
                                        />
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Control
                                            as="textarea"
                                            rows={4}
                                            placeholder="Message"
                                            required
                                            value={contactForm.message}
                                            onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                                            className="input-modern"
                                            style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.1)' }}
                                        />
                                    </Form.Group>
                                    <Button type="submit" className="btn-glow w-100">Send Message</Button>
                                </Form>
                            </div>
                        </Col>
                    </Row>

                    <div className="mt-4 pt-3 border-top border-secondary" style={{ borderColor: 'rgba(255,255,255,0.1) !important' }}>
                        <p className="small mb-0" style={{ color: '#888' }}>
                            <strong>Note:</strong> This platform is developed as part of an academic project. Feedback and suggestions are welcome to help improve functionality and usability.
                        </p>
                    </div>
                </Modal.Body>
                <Modal.Footer className="border-top-0" style={{ background: '#141414' }}>
                    <Button variant="secondary" onClick={() => setShowContact(false)} className="rounded-1 text-white fw-bold px-4" style={{ background: '#333', border: 'none' }}>Close</Button>
                </Modal.Footer>
            </Modal>

            {/* UPLOAD CONFIRMATION MODAL (Power BI Style) */}
            <Modal show={!!uploadPreview} onHide={cancelUpload} centered size="xl" contentClassName="bg-dark text-white border-0" backdrop="static">
                <Modal.Header closeButton closeVariant="white" className="border-bottom border-secondary" style={{ borderColor: 'rgba(255,255,255,0.1) !important' }}>
                    <Modal.Title className="fw-bold d-flex align-items-center gap-3">
                        <BsLayers style={{ color: 'var(--primary)' }} />
                        Review & Load Data
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0 d-flex flex-column" style={{ background: '#000000', minHeight: '600px' }}>
                    {uploadPreview && (
                        <>
                            {/* Metadata Header */}
                            <div className="p-4 border-bottom border-secondary" style={{ borderColor: 'rgba(255,255,255,0.1) !important', background: 'rgba(255,255,255,0.03)' }}>
                                <Row className="g-4">
                                    <Col md={3}>
                                        <div className="text-muted small text-uppercase fw-bold mb-1">Filename</div>
                                        <div className="fw-bold text-white text-truncate" title={uploadPreview.filename}>{uploadPreview.filename}</div>
                                    </Col>
                                    <Col md={2}>
                                        <div className="text-muted small text-uppercase fw-bold mb-1">Rows</div>
                                        <div className="fw-bold text-white">{uploadPreview.metadata.rows.toLocaleString()}</div>
                                    </Col>
                                    <Col md={2}>
                                        <div className="text-muted small text-uppercase fw-bold mb-1">Columns</div>
                                        <div className="fw-bold text-white">{uploadPreview.metadata.columns.length}</div>
                                    </Col>
                                    <Col md={5}>
                                        <div className="text-muted small text-uppercase fw-bold mb-1">Status</div>
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="spinner-grow spinner-grow-sm text-warning" role="status" style={{ width: '0.5rem', height: '0.5rem' }}></div>
                                            <span className="text-warning small fw-bold">Pending Confirmation - No Analysis Performed</span>
                                        </div>
                                    </Col>
                                </Row>
                            </div>

                            {/* Data Preview Table */}
                            <div className="flex-grow-1 overflow-auto p-4 custom-scrollbar" style={{ maxHeight: '500px' }}>
                                <Table responsive variant="dark" hover className="mb-0 border border-secondary" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                        <tr>
                                            {uploadPreview.metadata.columns.map((col, idx) => (
                                                <th key={idx} className="small text-uppercase py-3 px-3" style={{ background: '#111111', color: 'var(--primary)', borderBottom: '2px solid var(--primary)', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {uploadPreview.preview.map((row, rIdx) => (
                                            <tr key={rIdx}>
                                                {uploadPreview.metadata.columns.map((col, cIdx) => (
                                                    <td key={cIdx} className="small py-3 px-3 text-nowrap" style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.08)', background: rIdx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                                                        {row[col] !== null ? String(row[col]) : <em className="text-muted">null</em>}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>

                            {/* Confirmation Footer */}
                            <div className="p-4 border-top border-secondary mt-auto" style={{ borderColor: 'rgba(255,255,255,0.1) !important', background: '#000000' }}>
                                <div className="d-flex justify-content-between align-items-center">
                                    <Form.Check
                                        type="checkbox"
                                        id="confirm-data"
                                        label={<span className="text-white">I confirm that this data is correct and want to proceed with analysis.</span>}
                                        checked={isConfirmed}
                                        onChange={(e) => setIsConfirmed(e.target.checked)}
                                        className="custom-checkbox"
                                    />

                                    <div className="d-flex gap-3">
                                        <Button variant="outline-light" onClick={cancelUpload}>Cancel Upload</Button>
                                        <Button
                                            variant="primary"
                                            onClick={confirmAndAnalyze}
                                            disabled={!isConfirmed || uploading}
                                            className="px-4 fw-bold"
                                            style={{ background: isConfirmed ? 'var(--primary)' : '#475569', borderColor: 'transparent' }}
                                        >
                                            {uploading ? 'Analyzing...' : 'Load & Analyze'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </Modal.Body>
            </Modal>
            {/* User Settings Modal */}
            <UserSettingsModal
                show={showSettings}
                onHide={() => setShowSettings(false)}
                defaultTab={settingsTab}
                user={user}
                logout={logout}
                themeColor={themeColor}
                setThemeColor={setThemeColor}
            />
        </>
    );
}

// ... (previous imports)

function DatasetView({ version, reset, onUpdate, addNotification }) {
    const [chartPage, setChartPage] = useState(0);

    useEffect(() => {
        setChartPage(0);
        // Reset local overrides when switching versions to prevent stale data persistence
        setUpdatedData(null);
        setProblemRows([]);
        // setDistributions(null); // Keep distributions for comparison view, tagged by version ID handled in render
        setCleaning(false);
    }, [version.id]);
    const [preview, setPreview] = useState([]);
    const [refreshKey, setRefreshKey] = useState(0);
    const [updatedData, setUpdatedData] = useState(null);



    // Merge prop version with locally fetched updates (e.g. after rule creation)
    const currentVersion = { ...version, ...updatedData };
    const [problemRows, setProblemRows] = useState([]);
    const [problemCount, setProblemCount] = useState(0);
    const [metadata, setMetadata] = useState(null);
    const [distributions, setDistributions] = useState(null); // Comparison stats (Before/After)
    const [viewDistributions, setViewDistributions] = useState(null); // Current view stats
    const [selectedDistCol, setSelectedDistCol] = useState(null);
    const [showAnalytics, setShowAnalytics] = useState(false);

    const [cleaning, setCleaning] = useState(false);
    const [error, setError] = useState(null);
    const [showCorrelation, setShowCorrelation] = useState(false);
    const [isGuidedMode, setIsGuidedMode] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [isHybrid, setIsHybrid] = useState(false);
    const [aiPatches, setAiPatches] = useState({}); // Tracking proof of action

    const handleOpenHistory = async () => {
        try {
            // Get all versions for this dataset
            const res = await api.get(`/datasets/${version.dataset_id}/history`);
            setHistoryData(res.data);
            setShowHistory(true);
        } catch (err) {
            console.error("Failed to load history", err);
            addNotification("History Error", "Could not load version history.", "error");
        }
    };

    const handleRestoreVersion = (ver) => {
        // Switch to the selected version
        // onUpdate usually replaces the current viewing version
        if (onUpdate) onUpdate(ver);
        setShowHistory(false);
        addNotification("Version Restored", `Switched to Version ${ver.version_number}`, "success");
    };

    const isCleaned = currentVersion.change_log === "Auto Clean Applied";

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get(`/datasets/version/${version.id}/preview`);
                setPreview(res.data.preview);
                // Backend now returns { total_count, samples } for problems
                if (res.data.problem_rows && res.data.problem_rows.total_count !== undefined) {
                    setProblemRows(res.data.problem_rows.samples);
                    setProblemCount(res.data.problem_rows.total_count);
                } else {
                    // Fallback for older backend API
                    setProblemRows(res.data.problem_rows || []);
                    setProblemCount((res.data.problem_rows || []).length);
                }
                setMetadata(res.data.metadata);
                if (res.data.distributions) setViewDistributions(res.data.distributions);

                // Update local version stats
                if (res.data.health_score !== undefined) {
                    setUpdatedData({
                        health_score: res.data.health_score,
                        error_summary: res.data.errors
                    });
                }
            } catch (err) {
                console.error("Failed to load dataset data", err);
                setError(err.response?.data?.message || err.message || "Failed to load dataset analysis.");
            }
        };
        fetchData();
    }, [version, refreshKey]);

    // Show error if failed
    if (error) return (
        <div className="text-center py-5">
            <div className="text-danger mb-4">
                <BsExclamationTriangle size={48} />
            </div>
            <h3 className="text-white fw-bold">Analysis Failed</h3>
            <p className="text-white-50 mb-4">{error}</p>
            <Button variant="outline-light" className="btn-outline-glow" onClick={reset}>Go Back</Button>
        </div>
    );
    const handleApplyGuidedFix = async (strategies) => {
        try {
            const res = await api.post(`/datasets/version/${version.id}/clean`, {
                strategies,
                engine: isHybrid ? 'hybrid' : 'standard'
            });
            if (onUpdate) onUpdate(res.data.version);
            addNotification(
                isHybrid ? "Neural Audit Complete" : "Improvement Applied",
                isHybrid ? "AI successfully rectified semantic inconsistencies." : "Dataset health has increased.",
                "success"
            );
            return res.data;
        } catch (err) {
            addNotification("Fix Failed", err.response?.data?.error || err.message, "error");
            throw err;
        }
    };

    const handleClean = async () => {
        if (!metadata) return;
        setCleaning(true);
        try {
            // ... strict strategies ...
            const strategies = { global_duplicates: 'remove' };
            Object.keys(metadata.dtypes).forEach(col => {
                const dtype = metadata.dtypes[col].toLowerCase();
                if (dtype.includes('int') || dtype.includes('float')) {
                    strategies[col] = 'smart_numeric';
                } else {
                    strategies[col] = 'mode';
                }
            });

            const res = await api.post(`/datasets/version/${version.id}/clean`, {
                strategies,
                engine: isHybrid ? 'hybrid' : 'standard'
            });

            // Validate response 
            if (res.data.distributions) {
                // Tag with version ID to ensure we only show relevant comparison for this specific version
                setDistributions({ ...res.data.distributions, _versionId: res.data.version.id });
                // Auto-select first numeric column
                const numCols = Object.keys(res.data.distributions.before || {});
                if (numCols.length > 0) setSelectedDistCol(numCols[0]);
            }

            if (res.data.ai_patches) {
                setAiPatches(res.data.ai_patches);
            }

            if (onUpdate) onUpdate(res.data.version);
            addNotification(
                isHybrid ? "Neural Audit Complete" : "Cleaning Successful",
                isHybrid ? `AI successfully patched ${Object.keys(res.data.ai_patches || {}).length} semantic errors.` : "All selected strategies have been applied.",
                "success"
            );
        } catch (err) {
            // ... error handling ...
            console.error(err);
            addNotification("Cleaning Failed", err.response?.data?.error || err.message, "error");
        } finally {
            setCleaning(false);
        }
    };

    // ...

    // --- HELPERS ---
    const handleDownloadReport = () => {
        // Direct download (Bypassing Blob complexity to ensure reliability)
        // Endpoints are currently unprotected in routes.py, so direct link works.
        const url = `/api/datasets/version/${version.id}/report`;
        window.location.href = url;
    };

    const handleDownload = () => {
        const url = `/api/datasets/version/${version.id}/download`;
        window.location.href = url;
    };

    const handleBackToPhase1 = async () => {
        try {
            const res = await api.get(`/datasets/${version.dataset_id}/history`);
            const history = res.data;
            // Find current and navigate to the one immediately following it (older)
            const currentIndex = history.findIndex(v => v.id === version.id);
            if (currentIndex !== -1 && currentIndex < history.length - 1) {
                onUpdate(history[currentIndex + 1]);
                addNotification("Phase 1 Restored", "Navigated back to diagnosis view.", "success");
            } else {
                addNotification("No Earlier Version", "You are at the first version of this dataset.", "info");
            }
        } catch (err) {
            console.error("Back navigation error:", err);
            addNotification("Navigation Error", "Could not fetch dataset history.", "error");
        }
    };

    if (!metadata) return <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div><h5 className="mt-3 text-white fw-light">Analyzing Vector Space...</h5></div>;

    // If cleaned, we show the remaining errors (which should be near zero), 
    // or we show the original errors if we are in the 'Before' view.
    // SAFEGUARD: Ensure we default to {} if null to prevent crashes
    const activeErrors = currentVersion?.error_summary || {};

    const errorData = {
        labels: ['Missing', 'Duplicates', 'Outliers'],
        datasets: [{
            data: [
                (activeErrors.missing_percentage || 0) > 0 ? 1 : 0,
                activeErrors.duplicates || 0,
                Object.keys(activeErrors.outliers || {}).length
            ],
            backgroundColor: ['#E50914', '#B20710', '#FFFFFF'],
            borderWidth: 0,
        }]
    };

    const scoreColor = (currentVersion.health_score || 0) > 80 ? '#4ade80' : ((currentVersion.health_score || 0) > 50 ? '#facc15' : '#ef4444');

    // --- VIEW 2: ANALYSIS & DOWNLOAD ---
    if (isCleaned) {
        return (
            <div className="fade-in-up">
                <div className="mb-4">
                    <Button
                        variant="link"
                        className="p-0 text-white-50 text-decoration-none d-flex align-items-center gap-2 hover-primary transition-all"
                        onClick={handleBackToPhase1}
                        style={{ fontSize: '0.9rem', width: 'fit-content' }}
                    >
                        <BsArrowLeft className="mb-0" /> Back to Phase 1: Diagnosis
                    </Button>
                </div>
                <div className="d-flex align-items-end justify-content-between mb-5">
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-2 text-muted">
                            <BsShieldCheck className="text-success" /> <span>Phase 2: Correction</span>
                        </div>
                        <h1 className="fw-bold mb-0 display-5">Cleaned Results</h1>
                    </div>
                    <div className="d-flex gap-3">
                        <Button variant="outline-light" className="btn-outline-glow" onClick={reset}>New Upload</Button>
                    </div>
                </div>

                {/* --- IMPACT ANALYSIS SECTION --- */}
                {distributions && distributions._versionId === version.id && distributions.before && (
                    <div className="glass-card p-4 mb-4">
                        {(() => {
                            const allCols = Object.keys(distributions.before);
                            const pageSize = 3;
                            const totalPages = Math.ceil(allCols.length / pageSize);
                            const currentCols = allCols.slice(chartPage * pageSize, (chartPage + 1) * pageSize);

                            return (
                                <>
                                    <div className="d-flex align-items-center justify-content-between mb-4">
                                        <h5 className="text-white fw-bold mb-0 d-flex align-items-center gap-2">
                                            <BsLightningCharge className="text-warning" /> Transformation Analysis
                                        </h5>
                                        {totalPages > 1 && (
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="text-muted small me-2" style={{ fontFamily: 'monospace' }}>
                                                    {chartPage + 1} / {totalPages}
                                                </span>
                                                <Button
                                                    variant="outline-light"
                                                    size="sm"
                                                    className="btn-outline-glow rounded-circle p-0 d-flex align-items-center justify-content-center"
                                                    style={{ width: 32, height: 32 }}
                                                    onClick={() => setChartPage(Math.max(0, chartPage - 1))}
                                                    disabled={chartPage === 0}
                                                >
                                                    <BsChevronLeft size={12} />
                                                </Button>
                                                <Button
                                                    variant="outline-light"
                                                    size="sm"
                                                    className="btn-outline-glow rounded-circle p-0 d-flex align-items-center justify-content-center"
                                                    style={{ width: 32, height: 32 }}
                                                    onClick={() => setChartPage(Math.min(totalPages - 1, chartPage + 1))}
                                                    disabled={chartPage >= totalPages - 1}
                                                >
                                                    <BsChevronRight size={12} />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <Row className="g-4">
                                        {currentCols.map(col => {
                                            const before = distributions.before[col] || { labels: [], data: [] };
                                            const after = (distributions.after && distributions.after[col]) ? distributions.after[col] : { data: [] };
                                            const data = {
                                                labels: before.labels,
                                                datasets: [
                                                    { label: 'Original', data: before.data, backgroundColor: 'rgba(239, 68, 68, 0.5)', borderRadius: 4 },
                                                    { label: 'Cleaned', data: after.data, backgroundColor: 'rgba(74, 222, 128, 0.8)', borderRadius: 4 }
                                                ]
                                            };
                                            return (
                                                <Col lg={4} key={col}>
                                                    <div className="p-3 rounded-3" style={{ background: 'rgba(255,255,255,0.02)', height: '250px' }}>
                                                        <Bar data={data} options={{ ...comparisonChartOptions, plugins: { ...comparisonChartOptions.plugins, title: { ...comparisonChartOptions.plugins.title, text: col } } }} />
                                                    </div>
                                                </Col>
                                            );
                                        })}
                                    </Row>
                                </>
                            );
                        })()}
                    </div>
                )}





                {/* --- INTELLIGENT RESIDUAL RISK ADVISOR --- */}
                <ResidualRiskMonitor
                    errorSummary={currentVersion.error_summary || {}}
                    onAcceptRisk={() => addNotification("Risk Acceptance Logged", "The system has whitelisted these anomalies for downstream analysis.", "success")}
                />

                {/* Correlation Modal */}


                <Modal show={showCorrelation} onHide={() => setShowCorrelation(false)} centered size="xl" contentClassName="bg-dark text-white border-0">
                    <Modal.Header closeButton closeVariant="white">
                        <Modal.Title className="fw-bold">Correlation Heatmap</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-0 d-flex justify-content-center bg-black">
                        <img
                            src={`/api/datasets/version/${version.id}/correlation`}
                            alt="Correlation Heatmap"
                            style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "";
                                alert("Failed to load heatmap. Start the backend or ensure >2 numeric columns exist.");
                            }}
                        />
                    </Modal.Body>
                </Modal>

                <Row className="g-4 mb-4">
                    <Col lg={4}>
                        <div className="glass-card h-100 p-4 d-flex flex-column">
                            <h6 className="text-muted text-uppercase small fw-bold mb-4 d-flex align-items-center justify-content-between">
                                Final Error Distribution
                                {Object.values(currentVersion.error_summary?.missing_values || {}).reduce((a, b) => a + b, 0) + (currentVersion.error_summary?.duplicates || 0) === 0 &&
                                    <Badge bg="success" className="fw-normal">Clean</Badge>
                                }
                            </h6>
                            <div style={{ height: '220px', position: 'relative' }}>
                                <Doughnut
                                    data={errorData}
                                    options={{
                                        ...chartOptions,
                                        cutout: '75%',
                                        scales: {
                                            x: { display: false },
                                            y: { display: false }
                                        },
                                        plugins: {
                                            legend: { display: false },
                                            tooltip: {
                                                backgroundColor: 'rgba(0,0,0,0.8)',
                                                padding: 12,
                                                titleFont: { size: 13, family: "'Inter', sans-serif" },
                                                bodyFont: { size: 12, family: "'Inter', sans-serif" },
                                                cornerRadius: 8,
                                                displayColors: true
                                            }
                                        }
                                    }}
                                />
                                {/* Center Text Overlay */}
                                <div className="position-absolute top-50 start-50 translate-middle text-center pointer-events-none" style={{ zIndex: 10 }}>
                                    <h1 className="mb-0 fw-bold text-white display-4" style={{ fontSize: '2.5rem' }}>
                                        {(currentVersion.error_summary?.duplicates || 0) + Object.values(currentVersion.error_summary?.missing_values || {}).reduce((a, b) => a + b, 0)}
                                    </h1>
                                    <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.7rem', letterSpacing: '2px' }}>Issues</small>
                                </div>
                            </div>

                            {/* Custom Legend */}
                            <div className="mt-auto pt-3">
                                <div className="d-flex justify-content-center gap-3">
                                    <div className="d-flex align-items-center gap-2">
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E50914' }}></div>
                                        <span className="small text-muted">Missing</span>
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#B20710' }}></div>
                                        <span className="small text-muted">Duplicates</span>
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFFFFF' }}></div>
                                        <span className="small text-muted">Outliers</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Col>
                    <Col lg={8}>
                        <div className="glass-card h-100 d-flex flex-column align-items-center justify-content-center text-center p-5">
                            <div className="mb-4 d-inline-block p-4 rounded-circle" style={{ background: 'rgba(74, 222, 128, 0.1)' }}>
                                <BsShieldCheck size={64} style={{ color: '#4ade80' }} />
                            </div>
                            <h2 className="fw-bold text-white mb-3">Dataset Optimized</h2>
                            <p className="text-muted mb-5" style={{ maxWidth: '500px' }}>
                                All missing values have been imputed, type mismatches (e.g. string numbers) corrected, and outliers standardized.
                                Your dataset is now ready for production use.
                            </p>
                            <div className="d-flex gap-3 justify-content-center">
                                <Button className="btn-glow px-4 py-3 fw-bold d-flex align-items-center gap-2" onClick={handleDownloadReport} style={{ background: '#3b82f6', color: '#fff', boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)' }}>
                                    <BsFileEarmarkPdf size={20} /> Download Report
                                </Button>
                                <Button className="btn-glow px-4 py-3 fw-bold d-flex align-items-center gap-2" onClick={handleDownload} style={{ background: '#4ade80', color: '#000', boxShadow: '0 0 20px rgba(74,222,128,0.4)' }}>
                                    <BsCloudUpload size={20} className="rotate-180" /> Download Dataset
                                </Button>
                            </div>
                        </div>
                    </Col>
                </Row>

                <div className="glass-card p-0 overflow-hidden mt-4">
                    <div className="p-4 border-bottom border-light" style={{ borderColor: 'rgba(255,255,255,0.05) !important' }}>
                        <h6 className="text-white fw-bold mb-0">Cleaned Data Preview</h6>
                    </div>
                    <div className="table-responsive" style={{ maxHeight: '400px' }}>
                        <Table className="modern-table mb-0" hover variant="dark">
                            <thead>
                                <tr>{metadata.columns.map(col => <th key={col}>{col}</th>)}</tr>
                            </thead>
                            <tbody>
                                {preview.map((row, idx) => (
                                    <tr key={idx}>
                                        {metadata.columns.map(col => (
                                            <td key={col} className="position-relative">
                                                {row[col] !== null ? String(row[col]) : "MISSING"}
                                                {/* PROOF OF AI ACTION BADGE */}
                                                {aiPatches[idx] && aiPatches[idx][col] && (
                                                    <div
                                                        className="position-absolute top-0 end-0 p-1"
                                                        title={`AI Semantic Fix: ${aiPatches[idx][col]}`}
                                                        style={{ fontSize: '0.6rem', pointerEvents: 'none' }}
                                                    >
                                                        <Badge bg="primary" style={{ padding: '0.2rem 0.35rem', boxShadow: '0 0 8px var(--primary)' }}>AI</Badge>
                                                    </div>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                </div>

                {/* --- SEMANTIC NEXT STEPS (NEW FEATURE) --- */}
                <NextStepRecommendations
                    versionId={currentVersion.id}
                    onAction={(rec) => addNotification("Feature Launching Soon", `The ${rec.title} module is currently being finalized.`, "info")}
                />

                {/* --- CHAT ASSISTANT (FLOATING) --- */}
                <ChatAssistant versionId={currentVersion.id} />
            </div>
        );
    }


    // --- VIEW 1: DIAGNOSTIC & FIX ---
    if (!isCleaned) {
        // Prepare lists for Detailed Breakdown
        const missingList = Object.entries(currentVersion.error_summary?.missing_values || {})
            .filter(([_, count]) => count > 0)
            .map(([col, count]) => {
                const pct = ((count / currentVersion.rows_count) * 100).toFixed(1);
                return `${col}: ${count} missing (${pct}%)`;
            });

        const outlierList = Object.entries(currentVersion.error_summary?.outliers || {})
            .map(([col, count]) => `${col}: ${count} outliers`);

        const typeList = (currentVersion.error_summary?.type_mismatches || [])
            .map(col => `${col} (auto-converted to numeric)`);

        const formatList = [];
        const fErrors = currentVersion.error_summary?.format_errors || {};
        Object.entries(fErrors.special_chars || {}).forEach(([col, msg]) => formatList.push(`${col}: ${msg}`));
        Object.entries(fErrors.inconsistent_casing || {}).forEach(([col, msg]) => formatList.push(`${col}: ${msg}`));

        // --- CHART DATA PREPARATION ---
        const missingKeys = Object.keys(currentVersion.error_summary?.missing_values || {}).filter(k => currentVersion.error_summary.missing_values[k] > 0);
        const missingChartData = {
            labels: missingKeys,
            datasets: [{
                label: 'Missing Count',
                data: missingKeys.map(k => currentVersion.error_summary.missing_values[k]),
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                borderRadius: 4
            }]
        };

        const outlierKeys = Object.keys(currentVersion.error_summary?.outliers || {});
        const outlierChartData = {
            labels: outlierKeys,
            datasets: [{
                label: 'Outlier Count',
                data: Object.values(currentVersion.error_summary?.outliers || {}),
                backgroundColor: 'rgba(245, 158, 11, 0.8)',
                borderRadius: 4
            }]
        };

        const typeKeys = currentVersion.error_summary?.type_mismatches || [];
        const typeChartData = {
            labels: typeKeys,
            datasets: [{
                label: 'Rows Impacted',
                data: typeKeys.map(() => currentVersion.rows_count),
                backgroundColor: 'rgba(234, 179, 8, 0.8)',
                borderRadius: 4
            }]
        };

        const formatSpecials = fErrors.special_chars || {};
        const formatKeys = Object.keys(formatSpecials);
        const formatChartData = {
            labels: formatKeys,
            datasets: [{
                label: 'Format Issues',
                data: Object.values(formatSpecials).map(val => {
                    const match = String(val).match(/(\d+)/);
                    return match ? parseInt(match[1]) : 0;
                }),
                backgroundColor: 'rgba(139, 92, 246, 0.8)',
                borderRadius: 4
            }]
        };

        const dupCount = currentVersion.error_summary?.duplicates || 0;
        const uniqueCount = (currentVersion.rows_count || 0) - dupCount;
        const duplicateChartData = {
            labels: ['Unique', 'Duplicate'],
            datasets: [{
                data: [uniqueCount, dupCount],
                backgroundColor: ['#10b981', '#ef4444'],
                borderWidth: 0
            }]
        };

        const showMissingChart = missingKeys.length > 0;
        const showOutlierChart = outlierKeys.length > 0;
        const showTypeChart = typeKeys.length > 0;
        const showFormatChart = formatKeys.length > 0;
        const showDupChart = dupCount > 0;

        return (
            <div className="fade-in-up">
                <div className="mb-4">
                    <Button
                        variant="link"
                        className="p-0 text-white-50 text-decoration-none d-flex align-items-center gap-2 hover-primary transition-all"
                        onClick={reset}
                        style={{ fontSize: '0.9rem', width: 'fit-content' }}
                    >
                        <BsArrowLeft className="mb-0" /> Back to Upload
                    </Button>
                </div>
                <div className="d-flex align-items-end justify-content-between mb-5">
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-2 text-muted">
                            <BsExclamationTriangle className="text-warning" /> <span>Phase 1: Diagnosis</span>
                        </div>
                        <h1 className="fw-bold mb-0 display-5">Problem Identification</h1>
                    </div>
                    <div className="d-flex gap-3 align-items-center">
                        <div className="d-flex flex-column align-items-end me-3">
                            <Form.Check
                                type="switch"
                                id="hybrid-mode-toggle"
                                label={<span className={`small fw-bold text-uppercase letter-spacing-1 ${isHybrid ? 'text-primary' : 'text-white'}`} style={{ transition: 'color 0.3s', whiteSpace: 'nowrap' }}>Hybrid AI Mode</span>}
                                checked={isHybrid}
                                onChange={(e) => setIsHybrid(e.target.checked)}
                                className="custom-switch-premium m-0"
                            />
                            <span className="text-muted text-uppercase" style={{ fontSize: '0.6rem', opacity: 0.6, letterSpacing: '0.5px' }}>
                                {isHybrid ? 'Deep Neural Audit Engaged' : 'Algorithmic Engine Only'}
                            </span>
                        </div>
                        <div className="d-flex flex-column align-items-end">
                            <Form.Check
                                type="switch"
                                id="guided-mode-toggle"
                                label={<span className={`small fw-bold text-uppercase letter-spacing-1 ${isGuidedMode ? 'text-primary' : 'text-white'}`} style={{ transition: 'color 0.3s', whiteSpace: 'nowrap' }}>Guided Cleaning</span>}
                                checked={isGuidedMode}
                                onChange={(e) => setIsGuidedMode(e.target.checked)}
                                className="custom-switch-premium m-0"
                            />
                            <span className="text-muted text-uppercase" style={{ fontSize: '0.6rem', opacity: 0.6, letterSpacing: '0.5px' }}>
                                {isGuidedMode ? 'Interactive Wizard On' : 'Manual Dashboard'}
                            </span>
                        </div>
                        <div className="vr bg-secondary opacity-25 mx-2" style={{ height: '24px' }}></div>
                        <Button className="btn-glow d-flex align-items-center gap-2" onClick={() => setShowAnalytics(true)}>
                            <BsBarChart /> Launch Visual Analytics Hub
                        </Button>
                        <Button variant="outline-light" className="btn-outline-glow" onClick={reset}>New Upload</Button>
                        <Button variant="outline-secondary" className="btn-outline-glow" onClick={handleOpenHistory}>History</Button>
                    </div>
                </div>

                {/* --- HISTORY MODAL --- */}
                <DatasetHistoryModal
                    show={showHistory}
                    onHide={() => setShowHistory(false)}
                    history={historyData}
                    onRestore={handleRestoreVersion}
                />

                {/* --- ANALYTICS HUB MODAL --- */}
                <AnalyticsHub
                    show={showAnalytics}
                    onHide={() => setShowAnalytics(false)}
                    version={currentVersion}
                    distributions={viewDistributions}
                />

                {/* --- AI Section (Version 2) --- */}
                <div className="fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <LabelErrorDetector version={currentVersion} columns={metadata?.columns} />
                    <AiInsights versionId={version.id} />
                </div>

                {/* --- VISUAL HEALTH DIAGNOSTICS & DATA DNA REMOVED (Moved to Analytics Hub) --- */}

                {/* --- GUIDED WIZARD OVERLAY --- */}
                {isGuidedMode && (
                    <div className="mb-5">
                        <GuidedWizard
                            version={currentVersion}
                            metadata={metadata}
                            onApplyFix={handleApplyGuidedFix}
                            onComplete={() => setIsGuidedMode(false)}
                            onCancel={() => setIsGuidedMode(false)}
                        />
                    </div>
                )}

                {/* --- Custom Rules Engine (Enterprise) --- */}
                <div className="fade-in-up" style={{ animationDelay: '0.2s', opacity: isGuidedMode ? 0.3 : 1, transition: 'opacity 0.5s' }}>
                    <RuleManager
                        datasetId={version.dataset_id}
                        columns={metadata.columns}
                        onRulesChange={() => setRefreshKey(k => k + 1)}
                    />
                </div>




                <Row className="g-4 mb-4">

                    <Col lg={4}>
                        <Card className="glass-card h-100 border-0 overflow-hidden">
                            <div className="absolute-bg-glow" style={{ background: `radial-gradient(circle at top right, ${scoreColor}20, transparent 70%)` }}></div>
                            <Card.Body className="p-4 d-flex flex-column position-relative">

                                {/* HEALTH SCORE HEADER */}
                                <div className="text-center mb-5">
                                    <h6 className="text-muted text-uppercase fw-bold letter-spacing-2 mb-4">Dataset Health Score</h6>
                                    <div className="position-relative d-inline-flex justify-content-center align-items-center">
                                        {/* Radial Progress SVG */}
                                        <svg width="180" height="180" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                                            <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                                            <circle
                                                cx="80" cy="80" r="70" fill="none" stroke={scoreColor} strokeWidth="10" strokeLinecap="round"
                                                strokeDasharray="440" strokeDashoffset={`${440 - (440 * (currentVersion.health_score || 0)) / 100}`}
                                                style={{ transition: 'stroke-dashoffset 1.5s ease-out', filter: `drop-shadow(0 0 8px ${scoreColor})` }}
                                            />
                                        </svg>
                                        <div className="position-absolute text-center">
                                            <h1 className="display-3 fw-bold mb-0 text-white" style={{ textShadow: `0 0 20px ${scoreColor}60` }}>
                                                {Math.round(currentVersion.health_score || 0)}
                                            </h1>
                                            <div className="d-flex justify-content-center gap-1 mt-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <BsStars key={i} size={12} className={i < Math.round((currentVersion.health_score || 0) / 20) ? "text-warning" : "text-dark"} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-top border-secondary my-2 opacity-25"></div>

                                {/* DETECTED ISSUES LIST - STYLED */}
                                <h6 className="text-white fw-bold mt-3 mb-4 d-flex align-items-center gap-2">
                                    <BsExclamationTriangle className="text-danger" /> DETECTED ISSUES
                                </h6>

                                <div className="custom-scrollbar flex-grow-1" style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '5px' }}>

                                    {/* Missing Values */}
                                    <div className="mb-4">
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <span className="text-muted small fw-bold text-uppercase"><BsGrid1X2 className="me-2" />Missing Values</span>
                                            {missingList.length === 0 && <Badge bg="success" pill className="fw-normal">Clean</Badge>}
                                        </div>
                                        {missingList.length > 0 && (
                                            <div className="d-flex flex-wrap gap-2">
                                                {missingList.slice(0, 5).map((item, i) => (
                                                    <Badge key={i} bg="danger" className="fw-normal text-white px-3 py-2" style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                                                        {item.split(':')[0]} <span className="opacity-75 ms-1">({item.split(':')[1].trim().split(' ')[0]})</span>
                                                    </Badge>
                                                ))}
                                                {missingList.length > 5 && <Badge bg="secondary" className="px-3 py-2">+{missingList.length - 5} more</Badge>}
                                            </div>
                                        )}
                                    </div>

                                    {/* Outliers */}
                                    <div className="mb-4">
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <span className="text-muted small fw-bold text-uppercase"><BsBarChart className="me-2" />Outliers</span>
                                            {outlierList.length === 0 && <Badge bg="success" pill className="fw-normal">Clean</Badge>}
                                        </div>
                                        {outlierList.length > 0 && (
                                            <div className="d-flex flex-column gap-2">
                                                {outlierList.slice(0, 3).map((item, i) => (
                                                    <div key={i} className="rounded p-2 small d-flex justify-content-between" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                                                        <span className="text-warning-light">{item.split(':')[0]}</span>
                                                        <strong className="text-warning">{item.split(':')[1]}</strong>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Type Mismatches */}
                                    <div className="mb-4">
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <span className="text-muted small fw-bold text-uppercase"><BsLightningCharge className="me-2" />Type Mismatches</span>
                                            {typeList.length === 0 && <Badge bg="success" pill className="fw-normal">Clean</Badge>}
                                        </div>
                                        {typeList.length > 0 && (
                                            <div className="d-flex flex-wrap gap-2">
                                                {typeList.slice(0, 3).map((item, i) => (
                                                    <Badge key={i} bg="warning" text="dark" className="fw-normal px-2 py-1">
                                                        {item.split(' ')[0]}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Duplicates */}
                                    <div className="mt-auto pt-2">
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <span className="text-muted small fw-bold text-uppercase"><BsLayers className="me-2" />Duplicates</span>
                                        </div>
                                        <div className={`p-3 rounded border ${version.error_summary?.duplicates > 0 ? 'border-danger bg-danger-subtle' : 'border-success bg-success-subtle'}`}>
                                            <div className="d-flex align-items-center gap-3">
                                                {version.error_summary?.duplicates > 0 ? <BsExclamationTriangle className="text-danger" /> : <BsShieldCheck className="text-success" />}
                                                <span className={version.error_summary?.duplicates > 0 ? "text-danger fw-bold" : "text-success fw-bold"}>
                                                    {version.error_summary?.duplicates > 0 ? `${version.error_summary?.duplicates} Duplicate Rows Found` : "No Duplicates Detected"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col lg={8}>
                        <div className="glass-card h-100 p-0 overflow-hidden d-flex flex-column">
                            <div className="p-4 border-bottom border-light d-flex justify-content-between align-items-center" style={{ borderColor: 'rgba(255,255,255,0.05) !important' }}>
                                <div className="d-flex align-items-center gap-2">
                                    <div className="spinner-grow spinner-grow-sm text-danger" role="status"></div>
                                    <h6 className="text-white fw-bold mb-0">Problematic Rows Detected</h6>
                                </div>
                                <span className="badge bg-danger">Total: {problemCount} Rows</span>
                            </div>
                            <div className="table-responsive flex-grow-1" style={{ maxHeight: '600px' }}>
                                <Table className="modern-table mb-0" hover variant="dark">
                                    <thead>
                                        <tr>
                                            {metadata.columns.map(col => <th key={col}>{col}</th>)}
                                            <th className="text-end text-muted small">Violations</th>
                                        </tr>

                                    </thead>
                                    <tbody>
                                        {problemRows.length > 0 ? problemRows.map((row, idx) => (
                                            <tr key={idx} style={{ background: 'rgba(229, 9, 20, 0.1)' }}>
                                                {metadata.columns.map(col => (
                                                    <td key={col} className={(row[col] === null || row[col] === undefined) ? "text-danger fw-bold" : ""}>
                                                        {row[col] !== null ? String(row[col]) : "MISSING"}
                                                    </td>
                                                ))}
                                                <td className="text-end">
                                                    {row._violation_tags && row._violation_tags.map(tag => (
                                                        <Badge key={tag} bg="danger" className="ms-1" style={{ fontSize: '0.6rem' }}>{tag}</Badge>
                                                    ))}
                                                </td>
                                            </tr>
                                        )) : (

                                            <tr><td colSpan={metadata.columns.length} className="text-center py-4 text-muted">No specific problem rows preview available.</td></tr>
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                            <div className="p-4 border-top border-light text-center" style={{ borderColor: 'rgba(255,255,255,0.05) !important' }}>
                                <div className="mb-3">
                                    <span className="text-muted small">Ready to rectify? This action will apply {isHybrid ? 'Neural Audit' : 'Algorithmic'} fixes to all {problemCount} detected rows.</span>
                                </div>
                                <Button className="btn-glow py-3 px-5 fw-bold text-uppercase w-100" onClick={handleClean} disabled={cleaning} style={{ maxWidth: '400px' }}>
                                    {cleaning ? 'Applying High-Precision Fixes...' : 'Execute Fix & Resolve All'}
                                </Button>
                            </div>
                        </div>
                    </Col>
                </Row>

                {/* --- CHAT ASSISTANT (FLOATING) --- */}
                <ChatAssistant versionId={version.id} />
            </div>
        );

    }

    // --- FALLBACK RETURN ---
    return null;
}


export default App;
