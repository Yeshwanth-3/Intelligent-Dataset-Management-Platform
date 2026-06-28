import React from 'react';

const UserProfile = ({ user, openSettings }) => {
    // Determine user initial (defaults to 'U' for User)
    const userInitial = user?.username ? user.username.charAt(0).toUpperCase() : "U";
    const userName = user?.username || "Guest";

    return (
        <div
            onClick={() => openSettings('profile')}
            className="d-flex align-items-center gap-3 cursor-pointer py-1 px-2 pe-3 rounded-pill transition-all"
            role="button"
            title="My Account"
            style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}
        >
            {/* AVATAR */}
            <div
                className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm"
                style={{
                    width: '32px',
                    height: '32px',
                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
                    fontSize: '0.9rem',
                    border: '2px solid rgba(255,255,255,0.1)'
                }}
            >
                {userInitial}
            </div>

            {/* INFO & VISUALIZER */}
            <div className="d-none d-md-flex align-items-center gap-3">
                <span className="text-white small fw-bold" style={{ letterSpacing: '0.3px' }}>{userName}</span>

                {/* EQ Visualizer */}
                <div className="d-flex align-items-center gap-1" style={{ height: '12px' }}>
                    <div className="eq-bar"></div>
                    <div className="eq-bar"></div>
                    <div className="eq-bar"></div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
