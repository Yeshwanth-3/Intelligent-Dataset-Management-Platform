import React, { useState } from 'react';
import { Card, Form, Button, Table, Badge, Spinner } from 'react-bootstrap';
import { BsSearch, BsCheckCircle, BsExclamationTriangle } from 'react-icons/bs';
import api from '../api';

const LabelErrorDetector = ({ version, columns }) => {
    const [targetCol, setTargetCol] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleScan = async () => {
        if (!targetCol) return;
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const res = await api.post(`/datasets/version/${version.id}/detect-labels`, { target_column: targetCol });
            if (res.data.error) {
                setError(res.data.error);
            } else {
                setResult(res.data);
            }
        } catch (err) {
            console.error("Scan Error:", err);
            const errMsg = err.response?.data?.error || err.message || "Scan failed. Check console.";
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="glass-card mb-4 border-0">
            <Card.Body>
                <div className="d-flex align-items-center justify-content-between mb-3">
                    <div>
                        <h6 className="text-white fw-bold mb-1 d-flex align-items-center gap-2">
                            <BsSearch className="text-primary" /> Advanced Label Audit (Cleanlab AI)
                        </h6>
                        <p className="text-muted small mb-0">
                            Supervised consistency check. Select a target column (e.g. 'Class') to find potential labeling errors (X does not match Y).
                        </p>
                    </div>
                </div>

                <div className="d-flex gap-3 align-items-center mb-3">
                    <Form.Select
                        value={targetCol}
                        onChange={(e) => setTargetCol(e.target.value)}
                        className="input-modern border-secondary text-white"
                        style={{ maxWidth: '300px', background: 'rgba(0,0,0,0.3)' }}
                    >
                        <option value="">-- Select Target/Label Column --</option>
                        {columns && columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </Form.Select>
                    <Button
                        onClick={handleScan}
                        disabled={!targetCol || loading}
                        className="btn-glow"
                    >
                        {loading ? <><Spinner size="sm" animation="border" className="me-2" /> Scanning...</> : "Run AI Scan"}
                    </Button>
                </div>

                {error && (
                    <div className="alert alert-danger d-flex align-items-center gap-2 p-2 small">
                        <BsExclamationTriangle /> {error}
                    </div>
                )}

                {result && (
                    <div className="fade-in-up mt-3">
                        <div className="d-flex align-items-center gap-2 mb-3">
                            <span className="text-white fw-bold small text-uppercase">Analysis Result:</span>
                            {result.count > 0 ?
                                <Badge bg="warning" text="dark" className="px-3 py-2">⚠️ Found {result.count} Potential Label Errors</Badge> :
                                <Badge bg="success" className="px-3 py-2"><BsCheckCircle className="me-1" /> No Obvious Issues Detected</Badge>
                            }
                        </div>

                        {result.samples && result.samples.length > 0 && (
                            <>
                                <h6 className="text-muted small fw-bold mb-2">Top Suspicious Samples (Review Recommended)</h6>
                                <div className="table-responsive rounded border border-secondary" style={{ maxHeight: '250px' }}>
                                    <Table size="sm" variant="dark" hover className="mb-0 small">
                                        <thead className="sticky-top bg-dark">
                                            <tr>
                                                <th className="text-muted">#</th>
                                                {Object.keys(result.samples[0] || {}).filter(k => k !== '_violation_tags').map(k => (
                                                    <th key={k} className={k === targetCol ? "text-primary" : ""}>{k}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.samples.map((row, i) => (
                                                <tr key={i}>
                                                    <td className="text-muted text-center">{i + 1}</td>
                                                    {Object.keys(row).filter(k => k !== '_violation_tags').map(k => (
                                                        <td key={k} className={k === targetCol ? "text-warning fw-bold border-start border-secondary" : ""}>
                                                            {String(row[k])}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default LabelErrorDetector;
