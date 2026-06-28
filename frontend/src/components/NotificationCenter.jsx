import React, { useState } from 'react';
import { Dropdown, Badge } from 'react-bootstrap';
import { BsBell, BsCheckCircleFill, BsExclamationTriangleFill, BsInfoCircleFill, BsX } from 'react-icons/bs';

const NotificationCenter = ({ notifications, onClear, onDismiss }) => {
    // Icons based on type
    const getIcon = (type) => {
        switch (type) {
            case 'success': return <BsCheckCircleFill className="text-success" />;
            case 'warning': return <BsExclamationTriangleFill className="text-warning" />;
            case 'error': return <BsExclamationTriangleFill className="text-danger" />;
            default: return <BsInfoCircleFill className="text-info" />;
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <Dropdown align="end">
            <Dropdown.Toggle variant="link" className="text-muted p-0 border-0 position-relative no-arrow" id="dropdown-notifications">
                <BsBell size={20} className="hover-white transition-all" />
                {unreadCount > 0 && (
                    <Badge
                        bg="danger"
                        pill
                        className="position-absolute top-0 start-100 translate-middle border border-dark"
                        style={{ fontSize: '0.6rem', padding: '0.25em 0.5em' }}
                    >
                        {unreadCount}
                    </Badge>
                )}
            </Dropdown.Toggle>

            <Dropdown.Menu className="shadow-2xl border-secondary glass-card p-0" style={{ width: '320px', background: 'rgba(23, 23, 23, 0.95)', backdropFilter: 'blur(10px)' }}>
                <div className="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary">
                    <h6 className="text-white fw-bold mb-0">Notifications</h6>
                    {notifications.length > 0 && (
                        <button className="btn btn-link btn-sm text-muted text-decoration-none small p-0" onClick={onClear}>
                            Clear All
                        </button>
                    )}
                </div>

                <div className="custom-scrollbar" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                        <div className="text-center p-4 text-muted small">
                            <BsBell size={24} className="mb-2 opacity-50" />
                            <p className="mb-0">No new notifications</p>
                        </div>
                    ) : (
                        notifications.map((n, idx) => (
                            <div key={n.id} className="p-3 border-bottom border-secondary position-relative hover-bg-dark transition-all">
                                <div className="d-flex gap-3">
                                    <div className="mt-1">{getIcon(n.type)}</div>
                                    <div className="flex-grow-1">
                                        <div className="d-flex justify-content-between align-items-start">
                                            <strong className="text-white small mb-1 d-block">{n.title}</strong>
                                            <span className="text-muted" style={{ fontSize: '0.65rem' }}>{n.time}</span>
                                        </div>
                                        <p className="text-muted small mb-0 lh-sm" style={{ fontSize: '0.8rem' }}>{n.message}</p>
                                    </div>
                                    <button
                                        className="btn btn-link text-secondary p-0 align-self-start hover-white"
                                        style={{ lineHeight: 1 }}
                                        onClick={(e) => { e.stopPropagation(); onDismiss(n.id); }}
                                    >
                                        <BsX size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Dropdown.Menu>
        </Dropdown>
    );
};

export default NotificationCenter;
