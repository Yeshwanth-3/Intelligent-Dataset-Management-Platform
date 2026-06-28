import React, { useState } from 'react';
import { Card, Button, Badge, Collapse, Table } from 'react-bootstrap';
import { BsShieldExclamation, BsCheckCircle, BsEye, BsArrowRight, BsExclamationTriangle, BsLightningCharge } from 'react-icons/bs';

const ResidualRiskMonitor = ({ errorSummary, onAcceptRisk }) => {
    const [status, setStatus] = useState('pending'); // 'pending', 'accepted', 'ignored'
    const [expanded, setExpanded] = useState(false);

    // Extract outlier info or simulate if empty for the feature demo
    const outliers = errorSummary?.outliers || {};
    const outlierCount = Object.values(outliers).reduce((acc, curr) => acc + (Array.isArray(curr) ? curr.length : 0), 0);

    // Logic to determine if we should show this card
    const hasRisks = outlierCount > 0;

    // For Demo Purposes: If no actual outliers, we might not render, 
    // BUT since the user wants to see the feature, we can simulate a "Low Confidence" anomaly if perfectly clean.
    // Let's strictly follow data for now, but handle the '0' case gracefully or return null.
    if (!hasRisks && status === 'pending') return null;

    const handleAccept = () => {
        setStatus('accepted');
        if (onAcceptRisk) onAcceptRisk();
    };

    if (status === 'accepted') {
        return (
            <div className="fade-in-up mb-4">
                <Card className="glass-card border-0 border-success border-opacity-25" style={{ background: 'rgba(20, 83, 45, 0.2)' }}>
                    <Card.Body className="d-flex align-items-center justify-content-between p-4">
                        <div className="d-flex align-items-center gap-3">
                            <div className="p-2 rounded-circle bg-success text-white">
                                <BsCheckCircle size={24} />
                            </div>
                            <div>
                                <h6 className="text-white fw-bold mb-0">Risks Mitigated</h6>
                                <p className="text-white-50 small mb-0">Anomalies accepted as valid business exceptions.</p>
                            </div>
                        </div>
                        <Badge bg="success" className="px-3 py-2">trust_level: MAX</Badge>
                    </Card.Body>
                </Card>
            </div>
        );
    }

    return (
        <div className="fade-in-up mb-4">
            <Card className="glass-card border-0 border-warning border-opacity-25 relative overflow-hidden">
                {/* Amber decorative glow */}
                <div style={{
                    position: 'absolute', top: -50, right: -50, width: 200, height: 200,
                    background: 'radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%)',
                    pointerEvents: 'none'
                }}></div>

                <Card.Body className="p-4">
                    <div className="d-flex align-items-start justify-content-between mb-3">
                        <div className="d-flex align-items-center gap-3">
                            <div className="p-3 rounded-3 bg-warning bg-opacity-10 text-warning">
                                <BsShieldExclamation size={24} />
                            </div>
                            <div>
                                <h5 className="text-white fw-bold mb-1">Post-Cleaning Analysis: Residual Anomalies</h5>
                                <p className="text-white-50 small mb-0">
                                    {Object.keys(outliers).length} columns contain <span className="text-warning fw-bold">{outlierCount} data points</span> that appear statistically unusual but were preserved to maintain data integrity.
                                </p>
                            </div>
                        </div>
                        <Badge bg="warning" text="dark" className="d-flex align-items-center gap-1 pulse-slow">
                            <BsLightningCharge /> Manual Review Recommended
                        </Badge>
                    </div>

                    <div className="d-flex gap-2 mt-4">
                        <Button
                            variant="outline-light"
                            className="btn-outline-glow btn-sm d-flex align-items-center gap-2"
                            onClick={() => setExpanded(!expanded)}
                        >
                            <BsEye /> {expanded ? 'Hide Details' : 'Manual Review'}
                        </Button>
                        <Button
                            className="btn-glow btn-sm border-0 d-flex align-items-center gap-2"
                            style={{ background: '#f59e0b', color: '#000' }}
                            onClick={handleAccept}
                        >
                            <BsCheckCircle /> Accept Risk & Finalize
                        </Button>
                    </div>

                    <Collapse in={expanded}>
                        <div className="mt-4 pt-3 border-top border-light border-opacity-10">
                            <h6 className="text-muted text-uppercase small fw-bold mb-3">Detected Anomalies</h6>
                            <Table size="sm" variant="dark" className="bg-transparent mb-0">
                                <thead>
                                    <tr>
                                        <th className="bg-transparent text-muted border-0">Column</th>
                                        <th className="bg-transparent text-muted border-0">Count</th>
                                        <th className="bg-transparent text-muted border-0">Recommendation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(outliers).map(([col, rows], idx) => (
                                        <tr key={idx}>
                                            <td className="bg-transparent text-white fw-bold">{col}</td>
                                            <td className="bg-transparent text-white-50">{rows.length}</td>
                                            <td className="bg-transparent text-warning small">
                                                Values deviate significanty from mean. Verify manually.
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </Collapse>
                </Card.Body>
            </Card>
        </div>
    );
};

export default ResidualRiskMonitor;
