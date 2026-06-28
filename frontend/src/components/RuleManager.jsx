import React, { useState, useEffect } from 'react';
import { Card, Button, Modal, Form, Row, Col, Badge, ListGroup } from 'react-bootstrap';
import { BsPlusLg, BsTrash, BsCheckCircleFill, BsXCircleFill, BsGear, BsInfoCircle } from 'react-icons/bs';
import { getRules, createRule, updateRule, deleteRule } from '../api';

const RuleManager = ({ datasetId, columns, onRulesChange }) => {
    const [rules, setRules] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);

    const [newRule, setNewRule] = useState({
        name: '',
        column_name: columns[0] || '',
        operator: 'greater_than',
        value: '',
        severity: 'error',
        action: 'flag_only',
        priority: 0,
        condition_column: '',
        condition_operator: 'equals',
        condition_value: ''
    });

    useEffect(() => {
        fetchRules();
    }, [datasetId]);

    const fetchRules = async () => {
        try {
            const data = await getRules(datasetId);
            setRules(data);
        } catch (err) {
            console.error("Failed to fetch rules", err);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Handle range value if needed (future polish)
            const processedValue = (newRule.operator === 'range')
                ? newRule.value.split(',').map(v => v.trim())
                : newRule.value;

            await createRule(datasetId, { ...newRule, value: processedValue });
            fetchRules();
            setShowModal(false);
            if (onRulesChange) onRulesChange();
        } catch (err) {
            alert("Failed to create rule: " + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (rule) => {
        try {
            await updateRule(rule.id, { is_active: !rule.is_active });
            fetchRules();
            if (onRulesChange) onRulesChange();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this rule?")) return;
        try {
            await deleteRule(id);
            fetchRules();
            if (onRulesChange) onRulesChange();
        } catch (err) {
            console.error(err);
        }
    };

    const getSeverityBadge = (sev) => {
        const colors = { info: 'info', warning: 'warning', error: 'danger', critical: 'dark' };
        return <Badge bg={colors[sev] || 'secondary'} className="text-uppercase" style={{ fontSize: '0.6rem' }}>{sev}</Badge>;
    };

    return (
        <Card className="glass-card mb-4 border-0 overflow-hidden">
            <Card.Header className="bg-transparent border-bottom border-light px-4 py-3 d-flex justify-content-between align-items-center">
                <div>
                    <h6 className="text-white fw-bold mb-0">Custom Validation Rules</h6>
                    <p className="text-muted small mb-0">Define business logic constraints for this dataset.</p>
                </div>
                <Button variant="outline-primary" size="sm" className="btn-outline-glow d-flex align-items-center gap-2" onClick={() => setShowModal(true)}>
                    <BsPlusLg /> Add Rule
                </Button>
            </Card.Header>
            <Card.Body className="p-0">
                <ListGroup variant="flush">
                    {rules.length === 0 ? (
                        <div className="p-4 text-center text-muted small">No custom rules defined yet.</div>
                    ) : (
                        rules.map(rule => (
                            <ListGroup.Item key={rule.id} className="bg-transparent border-bottom border-light px-4 py-3 text-white">
                                <Row className="align-items-center">
                                    <Col>
                                        <div className="d-flex align-items-center gap-2 mb-1">
                                            <span className="fw-bold">{rule.name}</span>
                                            {getSeverityBadge(rule.severity)}
                                            {!rule.is_active && <Badge bg="secondary">Disabled</Badge>}
                                        </div>
                                        <div className="small text-muted">
                                            <code>{rule.column_name}</code> {rule.operator.replace('_', ' ')} <code>{JSON.stringify(rule.value)}</code>
                                            {rule.condition_column && (
                                                <span className="ms-2">
                                                    (IF <code>{rule.condition_column}</code> {rule.condition_operator} <code>{rule.condition_value}</code>)
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-2">
                                            <Badge pill bg="outline-secondary" className="border text-muted fw-normal" style={{ fontSize: '0.7rem' }}>
                                                Action: {rule.action.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                    </Col>
                                    <Col xs="auto" className="d-flex gap-2">
                                        <Button variant="link" className="p-0 text-muted" onClick={() => handleToggle(rule)}>
                                            {rule.is_active ? <BsCheckCircleFill className="text-success" /> : <BsXCircleFill />}
                                        </Button>
                                        <Button variant="link" className="p-0 text-danger" onClick={() => handleDelete(rule.id)}>
                                            <BsTrash />
                                        </Button>
                                    </Col>
                                </Row>
                            </ListGroup.Item>
                        ))
                    )}
                </ListGroup>
            </Card.Body>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg" contentClassName="bg-dark text-white border-0">
                <Modal.Header closeButton closeVariant="white">
                    <Modal.Title className="fw-bold">Create Validation Rule</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4 bg-black">
                    <Form onSubmit={handleCreate}>
                        <Form.Group className="mb-4">
                            <Form.Label>Rule Name</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="e.g., Age must be adult"
                                value={newRule.name}
                                onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                                required
                                className="input-modern"
                            />
                        </Form.Group>

                        <Row className="g-3 mb-4">
                            <Col md={4}>
                                <Form.Label>Column</Form.Label>
                                <Form.Select
                                    value={newRule.column_name}
                                    onChange={e => setNewRule({ ...newRule, column_name: e.target.value })}
                                    className="input-modern"
                                >
                                    {columns.map(c => <option key={c} value={c}>{c}</option>)}
                                </Form.Select>
                            </Col>
                            <Col md={4}>
                                <Form.Label>Operator</Form.Label>
                                <Form.Select
                                    value={newRule.operator}
                                    onChange={e => setNewRule({ ...newRule, operator: e.target.value })}
                                    className="input-modern"
                                >
                                    <option value="greater_than">Greater Than (&gt;)</option>
                                    <option value="less_than">Less Than (&lt;)</option>
                                    <option value="range">Between (Range)</option>
                                    <option value="equals">Equals (==)</option>
                                    <option value="contains">Contains</option>
                                    <option value="regex">Regex Match</option>
                                </Form.Select>
                            </Col>
                            <Col md={4}>
                                <Form.Label>Value</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder={newRule.operator === 'range' ? "min, max" : "Value..."}
                                    value={newRule.value}
                                    onChange={e => setNewRule({ ...newRule, value: e.target.value })}
                                    required
                                    className="input-modern"
                                />
                            </Col>
                        </Row>

                        <div className="p-3 mb-4 rounded-3 border border-secondary" style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <div className="d-flex align-items-center gap-2 mb-3">
                                <BsInfoCircle className="text-primary" />
                                <span className="fw-bold small">Conditional Logic (Optional)</span>
                            </div>
                            <Row className="g-3">
                                <Col md={4}>
                                    <Form.Select
                                        value={newRule.condition_column}
                                        onChange={e => setNewRule({ ...newRule, condition_column: e.target.value })}
                                        className="input-modern"
                                    >
                                        <option value="">No Condition</option>
                                        {columns.map(c => <option key={c} value={c}>IF {c}</option>)}
                                    </Form.Select>
                                </Col>
                                <Col md={4}>
                                    <Form.Select
                                        value={newRule.condition_operator}
                                        onChange={e => setNewRule({ ...newRule, condition_operator: e.target.value })}
                                        className="input-modern"
                                        disabled={!newRule.condition_column}
                                    >
                                        <option value="equals">Equals (==)</option>
                                        <option value="contains">Contains</option>
                                        <option value="greater_than">&gt;</option>
                                        <option value="less_than">&lt;</option>
                                    </Form.Select>
                                </Col>
                                <Col md={4}>
                                    <Form.Control
                                        type="text"
                                        placeholder="Condition Value"
                                        value={newRule.condition_value}
                                        onChange={e => setNewRule({ ...newRule, condition_value: e.target.value })}
                                        className="input-modern"
                                        disabled={!newRule.condition_column}
                                    />
                                </Col>
                            </Row>
                        </div>

                        <Row className="g-3 mb-4">
                            <Col md={4}>
                                <Form.Label>Action on Violation</Form.Label>
                                <Form.Select
                                    value={newRule.action}
                                    onChange={e => setNewRule({ ...newRule, action: e.target.value })}
                                    className="input-modern"
                                >
                                    <option value="flag_only">Flag Only</option>
                                    <option value="hard_drop">Hard Drop Row</option>
                                    <option value="nullify">Nullify (Smart Fix)</option>
                                </Form.Select>
                            </Col>
                            <Col md={4}>
                                <Form.Label>Severity</Form.Label>
                                <Form.Select
                                    value={newRule.severity}
                                    onChange={e => setNewRule({ ...newRule, severity: e.target.value })}
                                    className="input-modern"
                                >
                                    <option value="info">Info</option>
                                    <option value="warning">Warning</option>
                                    <option value="error">Error</option>
                                    <option value="critical">Critical</option>
                                </Form.Select>
                            </Col>
                            <Col md={4}>
                                <Form.Label>Priority</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={newRule.priority}
                                    onChange={e => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
                                    className="input-modern"
                                />
                            </Col>
                        </Row>

                        <div className="d-flex justify-content-end gap-3 mt-5">
                            <Button variant="secondary" onClick={() => setShowModal(false)} className="px-4">Cancel</Button>
                            <Button type="submit" className="btn-glow px-5" disabled={loading}>
                                {loading ? 'Creating...' : 'Create Rule'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </Card>
    );
};

export default RuleManager;
