import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Form } from 'react-bootstrap';
import { BsChatDotsFill, BsX, BsSend, BsStars, BsLightningChargeFill } from 'react-icons/bs';
import api from '../api';

const ChatAssistant = ({ versionId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { sender: 'ai', text: "Hello! I'm your Data Assistant. I can explain your dataset's health, issues, and rules. What would you like to know?" }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || !versionId) return;

        const userMsg = input;
        setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
        setInput('');
        setLoading(true);

        try {
            const res = await api.post(`/datasets/version/${versionId}/chat`, { query: userMsg });
            setMessages(prev => [...prev, { sender: 'ai', text: res.data.answer }]);
        } catch (err) {
            setMessages(prev => [...prev, { sender: 'ai', text: "Sorry, I encountered an error connecting to the intelligence engine." }]);
        } finally {
            setLoading(false);
        }
    };

    const suggestions = [
        "Summarize the quality issues",
        "Why is the health score low?",
        "What rules are active?",
        "Which column has the most missing values?"
    ];

    return (
        <>
            <style>
                {`
                @keyframes float-pulse {
                    0% { transform: translateY(0px); box-shadow: 0 5px 15px rgba(0,0,0,0.4); }
                    50% { transform: translateY(-3px); box-shadow: 0 15px 30px rgba(0,0,0,0.6); }
                    100% { transform: translateY(0px); box-shadow: 0 5px 15px rgba(0,0,0,0.4); }
                }
                .ai-trigger {
                    animation: float-pulse 3s infinite ease-in-out;
                    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
                }
                .ai-trigger:hover {
                    animation: none;
                    transform: scale(1.05);
                }
                .chat-window {
                    background: rgba(20, 20, 20, 0.95);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
                }
                .chat-bubble-ai {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    color: #e2e8f0;
                }
                .chat-bubble-user {
                    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
                    color: white;
                    box-shadow: 0 4px 10px -1px rgba(0,0,0,0.3);
                }
                .suggestion-chip {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #94a3b8;
                    transition: all 0.2s;
                }
                .suggestion-chip:hover {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: var(--primary);
                    color: #fff;
                    transform: translateY(-1px);
                }
                .typing-loader span {
                    display: inline-block;
                    width: 4px;
                    height: 4px;
                    background-color: var(--primary);
                    border-radius: 50%;
                    animation: typing 1.4s infinite ease-in-out both;
                    margin: 0 1px;
                }
                .typing-loader span:nth-child(1) { animation-delay: -0.32s; }
                .typing-loader span:nth-child(2) { animation-delay: -0.16s; }
                @keyframes typing {
                    0%, 80%, 100% { transform: scale(0); opacity: 0.5 }
                    40% { transform: scale(1); opacity: 1 }
                }
                ::-webkit-scrollbar {
                    width: 6px;
                }
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 3px;
                }
                `}
            </style>

            {/* Trigger Button */}
            {!isOpen && (
                <div
                    className="position-fixed bottom-0 end-0 m-4 ai-trigger rounded-circle d-flex align-items-center justify-content-center cursor-pointer text-white"
                    style={{ width: '64px', height: '64px', zIndex: 1050, border: '2px solid rgba(255,255,255,0.1)' }}
                    onClick={() => setIsOpen(true)}
                >
                    <BsStars size={28} />
                    {/* Status Dot */}
                    <span className="position-absolute top-0 start-100 translate-middle p-1 bg-success border border-dark rounded-circle" style={{ width: '12px', height: '12px', top: '5px', right: '5px' }}>
                    </span>
                </div>
            )}

            {/* Chat Window */}
            {isOpen && (
                <Card
                    className="position-fixed bottom-0 end-0 m-4 border-0 fade-in-up chat-window"
                    style={{
                        width: '380px',
                        height: '650px',
                        zIndex: 1050,
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '24px',
                        overflow: 'hidden'
                    }}
                >
                    {/* Header */}
                    <div className="p-4 d-flex justify-content-between align-items-center border-bottom border-light border-opacity-10 position-relative">
                        <div className="d-flex align-items-center gap-3 position-relative" style={{ zIndex: 1 }}>
                            <div className="rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)', width: '40px', height: '40px', boxShadow: '0 0 15px rgba(0,0,0,0.4)' }}>
                                <BsStars className="text-white" size={20} />
                            </div>
                            <div>
                                <h6 className="fw-bold text-white mb-0" style={{ letterSpacing: '0.3px', fontFamily: 'Inter, sans-serif' }}>Data Assistant</h6>
                                <div className="d-flex align-items-center gap-1">
                                    <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%', boxShadow: '0 0 5px #4ade80' }}></span>
                                    <span className="text-white-50 small" style={{ fontSize: '0.7rem' }}>Powered by Gemini</span>
                                </div>
                            </div>
                        </div>
                        <Button variant="link" className="text-white p-0 opacity-50 hover-opacity-100 position-relative" style={{ zIndex: 1 }} onClick={() => setIsOpen(false)}>
                            <BsX size={28} />
                        </Button>
                    </div>

                    {/* Messages Body */}
                    <Card.Body className="flex-grow-1 overflow-auto p-4 custom-scrollbar d-flex flex-column gap-3">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`d-flex align-items-end gap-2 ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                                {msg.sender === 'ai' && (
                                    <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.05)' }}>
                                        <BsStars size={14} style={{ color: 'var(--primary)' }} />
                                    </div>
                                )}

                                <div
                                    className={`p-3 ${msg.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}
                                    style={{
                                        maxWidth: '85%',
                                        borderRadius: '18px',
                                        borderBottomRightRadius: msg.sender === 'user' ? '4px' : '18px',
                                        borderBottomLeftRadius: msg.sender === 'ai' ? '4px' : '18px',
                                        fontSize: '0.92rem',
                                        lineHeight: '1.5'
                                    }}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="d-flex align-items-end gap-2">
                                <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.05)' }}>
                                    <BsStars size={14} style={{ color: 'var(--primary)' }} />
                                </div>
                                <div className="chat-bubble-ai px-3 py-2 rounded-pill typing-loader">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </Card.Body>

                    {/* Footer Area */}
                    <div className="p-3 bg-black bg-opacity-50 border-top border-light border-opacity-10 backdrop-blur-md">
                        {/* Suggestions - Visible if few messages */}
                        {messages.length < 3 && (
                            <div className="d-flex gap-2 flex-wrap mb-3 px-1">
                                {suggestions.map((s, i) => (
                                    <div
                                        key={i}
                                        className="suggestion-chip px-3 py-2 rounded-pill cursor-pointer"
                                        style={{ fontSize: '0.75rem' }}
                                        onClick={() => setInput(s)}
                                    >
                                        <BsLightningChargeFill className="me-1 opacity-75" size={10} style={{ color: 'var(--primary)' }} />
                                        {s}
                                    </div>
                                ))}
                            </div>
                        )}

                        <Form onSubmit={handleSend} className="position-relative">
                            <Form.Control
                                type="text"
                                placeholder="Ask about your data..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                className="bg-dark border-0 text-white shadow-none pe-5"
                                disabled={loading}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '16px',
                                    height: '50px',
                                    paddingLeft: '1.25rem',
                                    fontSize: '0.95rem',
                                    color: '#fff'
                                }}
                            />
                            <Button
                                type="submit"
                                variant="link"
                                className="position-absolute end-0 top-50 translate-middle-y pe-3 opacity-75 hover-opacity-100"
                                disabled={loading || !input.trim()}
                                style={{ color: 'var(--primary)' }}
                            >
                                <BsSend size={20} className={input.trim() ? "" : "text-muted"} />
                            </Button>
                        </Form>
                    </div>
                </Card>
            )}
        </>
    );
};

export default ChatAssistant;
