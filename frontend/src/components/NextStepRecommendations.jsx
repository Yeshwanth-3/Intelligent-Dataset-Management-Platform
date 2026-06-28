import React, { useState, useEffect } from 'react';
import { Card, Button, Placeholder, Row, Col } from 'react-bootstrap';
import { BsLightbulb, BsArrowRight, BsGraphUp, BsMap, BsPersonCheck, BsEye, BsCpu } from 'react-icons/bs';
import api from '../api';

const NextStepRecommendations = ({ versionId, onAction }) => {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [clickedIndices, setClickedIndices] = useState([]);

    useEffect(() => {
        const fetchRecs = async () => {
            try {
                const res = await api.get(`/datasets/version/${versionId}/recommendations`);
                setRecommendations(res.data);
            } catch (err) {
                console.error("Failed to fetch recommendations", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRecs();
    }, [versionId]);

    const getIcon = (type) => {
        const t = type.toLowerCase();
        if (t.includes('time') || t.includes('predict')) return <BsGraphUp className="text-primary" />;
        if (t.includes('geo') || t.includes('map')) return <BsMap className="text-success" />;
        if (t.includes('segment') || t.includes('customer')) return <BsPersonCheck className="text-warning" />;
        if (t.includes('outlier')) return <BsEye className="text-info" />;
        return <BsCpu className="text-secondary" />;
    };

    const handleButtonClick = (rec, index) => {
        if (clickedIndices.includes(index)) return;

        setClickedIndices(prev => [...prev, index]);
        onAction(rec);

        // Reset after 3 seconds to allow re-interaction
        setTimeout(() => {
            setClickedIndices(prev => prev.filter(i => i !== index));
        }, 3000);
    };

    if (loading) {
        return (
            <div className="mt-5">
                <h5 className="text-white mb-4 fw-bold d-flex align-items-center gap-2">
                    <BsLightbulb className="text-warning" /> Analyzing clean possibilities...
                </h5>
                <Row className="g-4">
                    {[1, 2, 3].map(i => (
                        <Col md={4} key={i}>
                            <Card className="glass-card border-0 p-4 h-100 opacity-50">
                                <Placeholder as={Card.Title} animation="glow">
                                    <Placeholder xs={6} />
                                </Placeholder>
                                <Placeholder as={Card.Text} animation="glow">
                                    <Placeholder xs={7} /> <Placeholder xs={4} /> <Placeholder xs={4} /> <Placeholder xs={6} />
                                </Placeholder>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </div>
        );
    }

    if (recommendations.length === 0) return null;

    return (
        <div className="mt-5 fade-in-up">
            <h5 className="text-white mb-4 fw-bold d-flex align-items-center gap-2">
                <BsLightbulb className="text-warning pulse-slow" /> What's Next? (AI Recommendations)
            </h5>
            <Row className="g-4">
                {recommendations.map((rec, index) => (
                    <Col md={4} key={index} className="staggered-entry" style={{ animationDelay: `${index * 0.15}s` }}>
                        <Card className="glass-card recommendation-card border-0 h-100 overflow-hidden">
                            {/* Animated Background Decorative Element */}
                            <div className="card-accent-gradient"></div>

                            <Card.Body className="p-4 d-flex flex-column position-relative z-1">
                                <div className="d-flex align-items-center gap-3 mb-4">
                                    <div className="icon-container-premium">
                                        {getIcon(rec.type)}
                                    </div>
                                    <h6 className="text-white fw-bold mb-0 letter-spacing-1">{rec.title}</h6>
                                </div>
                                <p className="text-white-50 small mb-3 flex-grow-1 line-height-relaxed">
                                    <strong className="text-white opacity-75">Scope:</strong> {rec.reason}
                                </p>
                                <div className="benefit-badge mb-4">
                                    <p className="small mb-0 fw-medium d-flex align-items-center gap-2">
                                        <div className="benefit-dot"></div> {rec.benefit}
                                    </p>
                                </div>
                                <Button
                                    className={`btn-premium-action w-100 d-flex align-items-center justify-content-center gap-2 py-2 fw-bold ${clickedIndices.includes(index) ? 'btn-coming-soon' : ''}`}
                                    onClick={() => handleButtonClick(rec, index)}
                                    disabled={clickedIndices.includes(index)}
                                >
                                    {clickedIndices.includes(index) ? (
                                        <>Coming Soon...</>
                                    ) : (
                                        <>Proceed to Explore <BsArrowRight className="arrow-animate" /></>
                                    )}
                                </Button>
                            </Card.Body>

                            {/* Shimmer Overlay */}
                            <div className="shimmer-sweep"></div>
                        </Card>
                    </Col>
                ))}
            </Row>

            <style jsx="true">{`
                .staggered-entry {
                    opacity: 0;
                    transform: translateY(20px);
                    animation: slideUpFade 0.6s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
                }

                @keyframes slideUpFade {
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .recommendation-card {
                    background: rgba(255, 255, 255, 0.03) !important;
                    transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1) !important;
                    border: 1px solid rgba(255, 255, 255, 0.05) !important;
                }

                .card-accent-gradient {
                    position: absolute;
                    top: 0;
                    right: 0;
                    width: 150px;
                    height: 150px;
                    background: radial-gradient(circle at top right, rgba(var(--primary-rgb), 0.15), transparent 70%);
                    pointer-events: none;
                }

                .recommendation-card:hover {
                    transform: translateY(-12px) scale(1.02);
                    background: rgba(255, 255, 255, 0.07) !important;
                    border-color: rgba(var(--primary-rgb), 0.3) !important;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(var(--primary-rgb), 0.05) !important;
                }

                .icon-container-premium {
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    font-size: 1.4rem;
                    transition: all 0.3s ease;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .recommendation-card:hover .icon-container-premium {
                    background: var(--primary);
                    color: white;
                    transform: rotate(10deg) scale(1.1);
                    box-shadow: 0 0 15px rgba(var(--primary-rgb), 0.4);
                }

                .recommendation-card:hover .icon-container-premium svg {
                    color: white !important;
                    animation: iconPulse 1.5s infinite ease-in-out;
                }

                @keyframes iconPulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }

                .benefit-badge {
                    background: rgba(74, 222, 128, 0.06);
                    border: 1px solid rgba(74, 222, 128, 0.1);
                    padding: 0.75rem 1rem;
                    border-radius: 10px;
                    color: #4ade80;
                }

                .benefit-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #4ade80;
                    box-shadow: 0 0 8px #4ade80;
                }

                .btn-premium-action {
                    background: transparent;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 8px;
                    color: white;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    position: relative;
                    overflow: hidden;
                }

                .btn-premium-action:hover {
                    background: var(--primary);
                    border-color: var(--primary);
                    transform: scale(1.02);
                    box-shadow: 0 8px 20px rgba(var(--primary-rgb), 0.4);
                }

                .btn-coming-soon {
                    background: rgba(var(--primary-rgb), 0.2) !important;
                    border-color: rgba(var(--primary-rgb), 0.4) !important;
                    color: rgba(255, 255, 255, 0.7) !important;
                    cursor: not-allowed;
                }

                .recommendation-card:hover .arrow-animate {
                    transform: translateX(5px);
                }

                .arrow-animate {
                    transition: transform 0.3s ease;
                }

                .shimmer-sweep {
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 50%;
                    height: 100%;
                    background: linear-gradient(
                        90deg,
                        transparent,
                        rgba(255, 255, 255, 0.05),
                        transparent
                    );
                    transition: none;
                    pointer-events: none;
                }

                .recommendation-card:hover .shimmer-sweep {
                    left: 200%;
                    transition: left 1s ease-in-out;
                }

                .pulse-slow {
                    animation: pulse 3s infinite ease-in-out;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.1); }
                }

                .line-height-relaxed {
                    line-height: 1.6;
                }
            `}</style>
        </div>
    );
};

export default NextStepRecommendations;
