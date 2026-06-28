import { useState, useEffect } from 'react';
import { Card, Spinner, Alert, Button } from 'react-bootstrap';
import { Sparkles, Lightbulb } from 'lucide-react';
import { getAiSuggestions } from '../api';

const AiInsights = ({ versionId }) => {
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [suggestion, setSuggestion] = useState(null);
    const [error, setError] = useState(null);


    const handleShow = () => {
        setVisible(true);
        // Fetch only if not already fetched
        if (!suggestion && !error) {
            fetchInsights();
        }
    };

    const fetchInsights = async () => {
        setLoading(true);
        try {
            const data = await getAiSuggestions(versionId);
            setSuggestion(data.suggestion);
        } catch (err) {
            console.error("AI Error:", err);
            setError("Could not load AI insights at this time.");
        } finally {
            setLoading(false);
        }
    };

    // Remove useEffect auto-fetch

    if (!visible) {
        return (
            <Card className="glass-card mb-4" style={{
                borderLeft: "4px solid #8b5cf6",
                background: "linear-gradient(145deg, rgba(24, 24, 24, 0.9) 0%, rgba(30, 20, 40, 0.8) 100%)",
                cursor: 'pointer'
            }} onClick={handleShow}>
                <Card.Body className="d-flex align-items-center justify-content-between p-3">
                    <div className="d-flex align-items-center">
                        <Sparkles size={24} className="text-white me-3" style={{ fill: "#8b5cf6" }} />
                        <div>
                            <h5 className="mb-0 text-white">AI Analyst Insights</h5>
                            <small className="text-muted">Click to generate specific suggestions for this dataset</small>
                        </div>
                    </div>
                    <Button variant="outline-light" size="sm" className="rounded-pill px-4" onClick={handleShow}>
                        Show Analysis
                    </Button>
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card className="glass-card mb-4" style={{
            borderLeft: "4px solid #8b5cf6", // Violet accent for AI
            background: "linear-gradient(145deg, rgba(24, 24, 24, 0.9) 0%, rgba(30, 20, 40, 0.8) 100%)"
        }}>
            <Card.Body>
                <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="d-flex align-items-center">
                        <Sparkles size={24} className="text-white me-2" style={{ fill: "#8b5cf6" }} />
                        <h4 className="mb-0 text-white">AI Analyst Insights</h4>
                    </div>
                    <Button variant="link" className="text-muted p-0" onClick={() => setVisible(false)}>Hide</Button>
                </div>

                {loading ? (
                    <div className="text-center py-3">
                        <Spinner animation="border" variant="light" size="sm" />
                        <span className="ms-2 text-muted">Analyzing data patterns...</span>
                    </div>
                ) : error ? (
                    <Alert variant="dark" className="bg-transparent border-0 text-muted p-0">{error}</Alert>
                ) : (
                    <div className="text-white" style={{ whiteSpace: 'pre-line', fontSize: '0.95rem', lineHeight: '1.6' }}>
                        {suggestion}
                    </div>
                )}
            </Card.Body>
        </Card>
    );

};

export default AiInsights;
