import React, { useState, useEffect } from 'react';
import { Spinner } from 'react-bootstrap';
import { BsClockHistory, BsFileDiff, BsCheckCircleFill } from 'react-icons/bs';
import api from '../api';

const AuditLogBoard = ({ versionId }) => {
    const [auditData, setAuditData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!versionId) return;
        setLoading(true);
        api.get(`/datasets/version/${versionId}/audit`)
            .then(res => setAuditData(res.data))
            .catch(err => console.error("Audit load failed:", err))
            .finally(() => setLoading(false));
    }, [versionId]);

    if (loading) return (
        <div className="text-center p-5">
            <Spinner animation="border" variant="primary" />
            <p className="text-muted mt-3 small">Comparing datasets...</p>
        </div>
    );

    if (!auditData) return null;

    const { metrics, changes } = auditData;

    return (
        <div className="fade-in-up">
            {/* 1. METRICS TICKER */}
            <div className="d-flex justify-content-between align-items-center mb-4 p-3 rounded-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="d-flex align-items-center gap-3">
                    <div className={`icon-box ${metrics.rows_dropped > 0 ? 'bg-warning-subtle text-warning' : 'bg-success-subtle text-success'}`}>
                        <BsFileDiff size={20} />
                    </div>
                    <div>
                        <div className="text-uppercase small fw-bold text-muted letter-spacing-1">Row Impact</div>
                        <h5 className="mb-0 fw-bold text-white">
                            {metrics.rows_dropped > 0 ? `-${metrics.rows_dropped} Rows Removed` : "All Rows Preserved"}
                        </h5>
                    </div>
                </div>

                <div className="d-flex align-items-center gap-3">
                    <div className="icon-box bg-info-subtle text-info">
                        <BsClockHistory size={20} />
                    </div>
                    <div>
                        <div className="text-uppercase small fw-bold text-muted letter-spacing-1">Transformations</div>
                        <h5 className="mb-0 fw-bold text-white">{changes.length} Actions Applied</h5>
                    </div>
                </div>

                <div className="d-flex align-items-center gap-3">
                    <div className={`icon-box ${metrics.quality_improvement > 0 ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-white'}`}>
                        <BsCheckCircleFill size={20} />
                    </div>
                    <div>
                        <div className="text-uppercase small fw-bold text-muted letter-spacing-1">Quality Lift</div>
                        <h5 className={`mb-0 fw-bold ${metrics.quality_improvement > 0 ? "text-success" : "text-white"}`}>
                            {metrics.quality_improvement > 0 ? `+${metrics.quality_improvement}%` : "No Change"}
                        </h5>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuditLogBoard;
