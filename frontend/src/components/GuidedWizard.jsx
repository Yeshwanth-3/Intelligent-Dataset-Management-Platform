import React, { useState, useEffect } from 'react';
import { Card, Button, ProgressBar, Badge, ListGroup, Row, Col } from 'react-bootstrap';
import { BsStars, BsArrowRightShort, BsCheckCircleFill, BsLightningCharge, BsCpu, BsLightbulb, BsChevronLeft, BsChevronRight } from 'react-icons/bs';

const GuidedWizard = ({ version, metadata, onApplyFix, onComplete, onCancel }) => {
    const [step, setStep] = useState(0);
    const [isApplying, setIsApplying] = useState(false);
    const [completedSteps, setCompletedSteps] = useState([]);

    const errorSummary = version.error_summary || {};

    // Generate the issues list based on priority
    const issues = [];

    // 1. Missing Values
    const missingEntries = Object.entries(errorSummary.missing_values || {}).filter(([_, count]) => count > 0);
    if (missingEntries.length > 0) {
        issues.push({
            type: 'missing',
            title: 'Impute Missing Values',
            description: `We detected ${missingEntries.length} columns with empty rows. This can break your machine learning models or bias your results.`,
            columns: missingEntries.map(([col, count]) => col),
            suggestion: 'Fill numeric columns with Median and categorical with Mode.',
            icon: <BsLightningCharge className="text-warning" />,
            action: 'smart_impute'
        });
    }

    // 2. Duplicates
    if (errorSummary.duplicates > 0) {
        issues.push({
            type: 'duplicates',
            title: 'Resolve Duplicates',
            description: `There are ${errorSummary.duplicates} identical rows in your dataset. These add no value and can lead to overfitting.`,
            suggestion: 'Remove exact duplicate records while keeping the first occurrence.',
            icon: <BsCpu className="text-primary" />,
            action: 'remove_duplicates'
        });
    }

    // 3. Outliers
    const outlierCols = Object.keys(errorSummary.outliers || {});
    if (outlierCols.length > 0) {
        issues.push({
            type: 'outliers',
            title: 'Handle Extreme Outliers',
            description: `Columns like ${outlierCols.slice(0, 2).join(', ')} contain extreme values that might be noise or sensor errors.`,
            suggestion: 'Clamp values between the 5th and 95th percentile (Winsorization).',
            icon: <BsStars className="text-info" />,
            action: 'handle_outliers'
        });
    }

    const currentIssue = issues[step];
    const progress = ((step) / (issues.length || 1)) * 100;

    const handleNext = async () => {
        if (step < issues.length - 1) {
            setStep(step + 1);
        } else {
            onComplete();
        }
    };

    const handleApply = async () => {
        setIsApplying(true);
        try {
            // Build the strategy for this specific step
            const strategy = {};
            if (currentIssue.type === 'missing') {
                currentIssue.columns.forEach(col => {
                    const dtype = metadata.dtypes[col].toLowerCase();
                    strategy[col] = (dtype.includes('int') || dtype.includes('float')) ? 'smart_numeric' : 'mode';
                });
            } else if (currentIssue.type === 'duplicates') {
                strategy.global_duplicates = 'remove';
            } else if (currentIssue.type === 'outliers') {
                // Outlier strategy implementation (Assume backend handle_outliers logic)
                Object.keys(errorSummary.outliers).forEach(col => {
                    strategy[col] = 'handle_outliers';
                });
            }

            await onApplyFix(strategy);
            setCompletedSteps([...completedSteps, step]);
        } finally {
            setIsApplying(false);
        }
    };

    if (issues.length === 0) {
        return (
            <div className="glass-card p-5 text-center">
                <BsCheckCircleFill size={64} className="text-success mb-4" />
                <h2 className="fw-bold text-white">Your Dataset is Healthy!</h2>
                <p className="text-muted mb-4">No major issues were detected that require a guided flow.</p>
                <Button className="btn-glow px-5" onClick={onComplete}>Back to Dashboard</Button>
            </div>
        );
    }

    return (
        <div className="guided-wizard-container fade-in-up">
            <Card className="glass-card border-0 overflow-hidden shadow-2xl">
                <div
                    className="position-absolute top-0 start-0 w-100"
                    style={{ height: '4px', background: 'rgba(255,255,255,0.05)' }}
                >
                    <div
                        className="h-100 transition-all duration-700"
                        style={{ background: 'var(--primary)', width: `${progress}%` }}
                    ></div>
                </div>

                <Card.Body className="p-5">
                    <div className="d-flex justify-content-between align-items-center mb-5">
                        <div className="d-flex align-items-center gap-3">
                            <div className="p-3 rounded-circle" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                {currentIssue.icon}
                            </div>
                            <div>
                                <h6 className="text-muted small fw-bold text-uppercase mb-1">Issue {step + 1} of {issues.length}</h6>
                                <h3 className="text-white fw-bold mb-0">{currentIssue.title}</h3>
                            </div>
                        </div>
                        <Button variant="link" className="text-muted text-decoration-none small" onClick={onCancel}>
                            Exit Guide
                        </Button>
                    </div>

                    <Row className="g-5">
                        <Col lg={7}>
                            <p className="text-white opacity-75 lead mb-4" style={{ lineHeight: '1.8' }}>
                                {currentIssue.description}
                            </p>

                            <div className="p-4 rounded-3 mb-5" style={{ background: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid rgba(var(--primary-rgb), 0.1)' }}>
                                <div className="d-flex align-items-start gap-3">
                                    <BsLightbulb className="text-warning mt-1" size={20} />
                                    <div>
                                        <h6 className="text-white fw-bold mb-2">Smart Suggestion</h6>
                                        <p className="text-white-50 small mb-0">{currentIssue.suggestion}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="d-flex gap-3">
                                {completedSteps.includes(step) ? (
                                    <Button
                                        variant="success"
                                        className="py-3 px-5 fw-bold d-flex align-items-center gap-2"
                                        onClick={handleNext}
                                    >
                                        Step Completed <BsChevronRight />
                                    </Button>
                                ) : (
                                    <Button
                                        className="btn-glow py-3 px-5 fw-bold"
                                        onClick={handleApply}
                                        disabled={isApplying}
                                    >
                                        {isApplying ? 'Processing...' : 'Apply Suggested Fix'}
                                    </Button>
                                )}
                                {!completedSteps.includes(step) && (
                                    <Button variant="outline-light" className="btn-outline-glow px-4" onClick={handleNext}>
                                        Skip this issue
                                    </Button>
                                )}
                            </div>
                        </Col>

                        <Col lg={5}>
                            <div className="p-4 rounded-4 bg-black bg-opacity-30 border border-secondary border-opacity-20 h-100">
                                <h6 className="text-muted small fw-bold mb-4">TECHNICAL DETAILS</h6>
                                {currentIssue.columns && (
                                    <div className="mb-4">
                                        <label className="text-white-50 small mb-2 d-block">Impacted Columns</label>
                                        <div className="d-flex flex-wrap gap-2">
                                            {currentIssue.columns.map(c => <Badge key={c} bg="secondary" className="fw-normal">{c}</Badge>)}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-auto">
                                    <label className="text-white-50 small mb-2 d-block">System Confidence</label>
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="flex-grow-1">
                                            <ProgressBar now={92} variant="success" style={{ height: '6px' }} />
                                        </div>
                                        <span className="text-success small fw-bold">92%</span>
                                    </div>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
        </div>
    );
};

export default GuidedWizard;
