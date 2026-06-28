import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { BsFileEarmarkArrowUp, BsStars, BsClockHistory, BsArrowCounterclockwise } from 'react-icons/bs';

export default function DatasetHistoryModal({ show, onHide, history = [], onRestore }) {

    // Helper to get icon based on log
    const getIcon = (log) => {
        if (log.includes("Upload")) return <BsFileEarmarkArrowUp size={20} className="text-primary" />;
        if (log.includes("Clean")) return <BsStars size={20} className="text-warning" />;
        return <BsClockHistory size={20} className="text-secondary" />;
    };

    return (
        <Modal show={show} onHide={onHide} centered size="lg" className="glass-modal">
            <Modal.Header closeButton className="border-secondary text-white" style={{ background: '#1a1a1a' }}>
                <Modal.Title className="fw-bold"><BsClockHistory className="me-2" /> Version Time Machine</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ background: '#121212', maxHeight: '60vh', overflowY: 'auto' }} className="custom-scrollbar p-4">
                {history.length > 0 ? (
                    <div className="d-flex flex-column gap-3">
                        {history.map((ver, idx) => (
                            <div key={idx} className="p-3 rounded border border-secondary d-flex justify-content-between align-items-center"
                                style={{ background: 'rgba(255, 255, 255, 0.05)', transition: 'all 0.2s', backdropFilter: 'blur(5px)' }}>

                                <div className="d-flex align-items-center gap-3">
                                    <div className="p-3 rounded-circle bg-dark border border-secondary d-flex align-items-center justify-content-center">
                                        {getIcon(ver.change_log || "")}
                                    </div>
                                    <div>
                                        <div className="d-flex align-items-center gap-2">
                                            <h5 className="mb-0 text-white fw-bold">Version {ver.version_number}</h5>
                                            {idx === 0 && <span className="badge bg-success small">Current</span>}
                                        </div>
                                        <div className="d-flex align-items-center gap-2 mt-1">
                                            <span className="text-muted small">{ver.created_at ? new Date(ver.created_at).toLocaleString() : 'Just now'}</span>
                                            <span className="text-secondary small">•</span>
                                            <span className={ver.health_score > 80 ? "text-success small fw-bold" : "text-warning small fw-bold"}>
                                                Health: {Math.round(ver.health_score || 0)}/100
                                            </span>
                                        </div>
                                        <p className="mb-0 mt-2 text-white-50 small fst-italic">"{ver.change_log || 'System Update'}"</p>
                                    </div>
                                </div>

                                {onRestore && (
                                    <Button
                                        variant="outline-light"
                                        size="sm"
                                        className="btn-outline-glow px-4 py-2"
                                        onClick={() => onRestore(ver)}
                                    >
                                        <BsArrowCounterclockwise className="me-2" /> Restore
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-5">
                        <BsClockHistory size={40} className="text-secondary mb-3 opacity-50" />
                        <p className="text-muted">No version history available yet.</p>
                    </div>
                )}
            </Modal.Body>
        </Modal>
    );
}
