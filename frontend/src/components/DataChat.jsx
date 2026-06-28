import { useState, useRef, useEffect } from 'react';
import { Card, Form, Button, Spinner } from 'react-bootstrap';
import { MessageSquare, Send, Bot, User, X } from 'lucide-react';
import { chatWithData } from '../api';

const DataChat = ({ versionId, versionNumber }) => {
    const [messages, setMessages] = useState([
        { role: 'bot', text: `Hello! I'm your AI assistant for Version ${versionNumber}. Ask me anything about this data! e.g., "Show me rows where Sales > 500"` }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || !versionId) return;

        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setLoading(true);

        try {
            console.log("Chat API Response:", response);

            let botText = response?.message;
            if (!botText) {
                if (response?.error) botText = "Error: " + response.error;
                else botText = "Warning: Received empty response from server."; // Debugging
            }

            let previewTable = null;

            if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
                // Format a mini markdown table for the chat
                const cols = Object.keys(response.data[0]);
                const header = `| ${cols.join(' | ')} |`;
                const divider = `| ${cols.map(() => '---').join(' | ')} |`;
                const rows = response.data.slice(0, 3).map(row =>
                    `| ${cols.map(c => row[c]).join(' | ')} |`
                ).join('\n');

                previewTable = `\n\n**Preview (${response.data.length} results):**\n${header}\n${divider}\n${rows}${response.data.length > 3 ? '\n...and more' : ''}`;
            }

            setMessages(prev => [...prev, { role: 'bot', text: botText + (previewTable || "") }]);

        } catch (err) {
            setMessages(prev => [...prev, { role: 'bot', text: "Sorry, I encountered an error processing that query." }]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <div
                onClick={() => setIsOpen(true)}
                className="position-fixed bottom-0 end-0 m-4 shadow-lg d-flex align-items-center justify-content-center"
                style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '30px',
                    background: '#8b5cf6',
                    color: 'white',
                    cursor: 'pointer',
                    zIndex: 1000,
                    transition: 'transform 0.2s',
                    border: '1px solid rgba(255,255,255,0.2)'
                }}
            >
                <Bot size={28} />
            </div>
        );
    }

    return (
        <Card className="position-fixed bottom-0 end-0 m-4 shadow-lg glass-card" style={{ width: '380px', height: '550px', zIndex: 1000, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div className="p-3 border-bottom border-secondary d-flex justify-content-between align-items-center" style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                <div className="d-flex align-items-center">
                    <Bot size={20} className="me-2 text-white" />
                    <span className="fw-bold text-white">Chat with Data</span>
                </div>
                <X size={20} className="text-white custom-cursor" onClick={() => setIsOpen(false)} style={{ cursor: 'pointer' }} />
            </div>

            <div className="flex-grow-1 p-3" style={{ overflowY: 'auto', background: '#141414' }}>
                {messages.map((msg, idx) => (
                    <div key={idx} className={`d-flex mb-3 ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                        <div style={{
                            maxWidth: '85%',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            background: msg.role === 'user' ? '#8b5cf6' : '#262626',
                            color: 'white',
                            fontSize: '0.9rem',
                            borderTopRightRadius: msg.role === 'user' ? '2px' : '12px',
                            borderTopLeftRadius: msg.role === 'bot' ? '2px' : '12px',
                            whiteSpace: 'pre-wrap',
                            overflowX: 'auto'
                        }}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="d-flex justify-content-start mb-3">
                        <div style={{ background: '#262626', padding: '8px 12px', borderRadius: '12px' }}>
                            <Spinner animation="dots" variant="light" size="sm" style={{ width: '1rem', height: '1rem' }} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-top border-secondary bg-dark">
                <Form onSubmit={handleSend} className="d-flex">
                    <Form.Control
                        type="text"
                        placeholder="Ask e.g. 'Rows with missing email'..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        style={{ background: '#333', border: 'none', color: 'white', fontSize: '0.9rem' }}
                    />
                    <Button type="submit" variant="link" className="text-white p-2 ms-2" disabled={loading}>
                        <Send size={20} />
                    </Button>
                </Form>
            </div>
        </Card>
    );
};

export default DataChat;
