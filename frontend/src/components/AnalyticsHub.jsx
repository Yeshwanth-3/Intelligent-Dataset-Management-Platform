import React from 'react';
import { Modal, Container, Row, Col, Card, Badge, Button } from 'react-bootstrap';
import { Bar, Doughnut } from 'react-chartjs-2';
import { BsShieldCheck, BsGrid1X2, BsLightningCharge, BsPieChart, BsBarChart, BsExclamationTriangle, BsXLg, BsDownload } from 'react-icons/bs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: "'Inter', sans-serif", size: 12 }, usePointStyle: true, padding: 20 } }
    },
    scales: {
        y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8', font: { family: "'Inter', sans-serif" } },
            border: { display: false }
        },
        x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { family: "'Inter', sans-serif" } },
            border: { display: false }
        }
    }
};

const miniChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
        y: { display: false },
        x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false }, border: { display: false } }
    },
    layout: { padding: 10 }
};

const AnalyticsHub = ({ show, onHide, version, distributions }) => {
    if (!version) return null;

    const errorSummary = version.error_summary || {};
    const fErrors = errorSummary.format_errors || {};
    const reportRef = React.useRef(null);

    const handleDownloadPDF = async () => {
        if (!reportRef.current) return;

        // Visual feedback
        const btn = document.getElementById('download-pdf-btn');
        const originalText = btn.innerText;
        btn.innerText = "Generating PDF...";
        btn.disabled = true;

        try {
            const canvas = await html2canvas(reportRef.current, {
                scale: 2, // Higher quality
                backgroundColor: '#0a0a0a', // Match theme
                useCORS: true
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

            // If content is very long, a multi-page logic is better, but for this hub view, fitting to width is standard
            // For long dashboards, we calculate height:
            const imgProps = pdf.getImageProperties(imgData);
            const pdfImgHeight = (imgProps.height * pdfWidth) / imgProps.width;

            // Simple Logic: Add Image (scales to width)
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfImgHeight);
            pdf.save(`DataRefine_Report_v${version.version_number}.pdf`);

        } catch (err) {
            console.error("PDF Generation failed", err);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    };

    // --- CHART DATA PREPARATION ---

    // 1. Missing Values
    const missingKeys = Object.keys(errorSummary.missing_values || {}).filter(k => errorSummary.missing_values[k] > 0);
    const missingChartData = {
        labels: missingKeys,
        datasets: [{
            label: 'Missing Count',
            data: missingKeys.map(k => errorSummary.missing_values[k]),
            backgroundColor: '#ef4444',
            borderRadius: 6,
            barThickness: 'flex',
            maxBarThickness: 40
        }]
    };

    // 2. Outliers
    const outlierKeys = Object.keys(errorSummary.outliers || {}).filter(k => k !== 'Global_Isolation_Forest');
    const outlierChartData = {
        labels: outlierKeys,
        datasets: [{
            label: 'Outlier Count',
            data: outlierKeys.map(k => errorSummary.outliers[k]),
            backgroundColor: '#f59e0b',
            borderRadius: 6,
            barThickness: 'flex',
            maxBarThickness: 40
        }]
    };

    // 3. Type Mismatches
    const typeKeys = errorSummary.type_mismatches || [];
    const typeChartData = {
        labels: typeKeys,
        datasets: [{
            label: 'Rows Impacted',
            data: typeKeys.map(() => version.rows_count),
            backgroundColor: '#eab308',
            borderRadius: 6,
            barThickness: 'flex',
            maxBarThickness: 40
        }]
    };

    // 4. Format Inconsistencies
    const formatSpecials = fErrors.special_chars || {};
    const formatKeys = Object.keys(formatSpecials);
    const formatChartData = {
        labels: formatKeys,
        datasets: [{
            label: 'Format Issues',
            data: Object.values(formatSpecials).map(val => {
                const match = String(val).match(/(\d+)/);
                return match ? parseInt(match[1]) : 0;
            }),
            backgroundColor: '#8b5cf6',
            borderRadius: 6,
            barThickness: 'flex',
            maxBarThickness: 40
        }]
    };

    // 5. Duplicates
    const dupCount = errorSummary.duplicates || 0;
    const uniqueCount = (version.rows_count || 0) - dupCount;
    const duplicateChartData = {
        labels: ['Unique', 'Duplicate'],
        datasets: [{
            data: [uniqueCount, dupCount],
            backgroundColor: ['#10b981', '#ef4444'],
            borderWidth: 0
        }]
    };

    const hasMissing = missingKeys.length > 0;
    const hasOutliers = outlierKeys.length > 0;
    const hasTypes = typeKeys.length > 0;
    const hasFormat = formatKeys.length > 0;
    const hasDuplicates = dupCount > 0;

    return (
        <Modal show={show} onHide={onHide} fullscreen className="p-0" contentClassName="bg-black text-white">
            <div className="d-flex flex-column h-100" style={{ background: '#0a0a0a' }}>

                {/* --- HEADER --- */}
                <div className="d-flex align-items-center justify-content-between px-5 py-4 border-bottom border-dark" style={{ background: '#111' }}>
                    <div>
                        <h3 className="fw-bold mb-1 d-flex align-items-center gap-3">
                            <BsBarChart className="text-primary" /> Visual Analytics Hub
                        </h3>
                        <div className="text-muted small">
                            Health Score: <strong className={version.health_score > 80 ? "text-success" : "text-warning"}>{Math.round(version.health_score)}/100</strong>
                        </div>
                    </div>
                    <div className="d-flex align-items-center gap-3">
                        <Button
                            id="download-pdf-btn"
                            variant="outline-primary"
                            className="d-flex align-items-center gap-2 btn-outline-glow"
                            onClick={handleDownloadPDF}
                        >
                            <BsDownload /> Download Report
                        </Button>
                        <button className="btn-close-premium" onClick={onHide} aria-label="Close Analytics Hub">
                            <BsXLg />
                        </button>
                    </div>
                </div>

                {/* --- CONTENT SCROLLABLE --- */}
                <div className="flex-grow-1 overflow-auto p-5 custom-scrollbar" ref={reportRef}>

                    {/* ZONE A: THE VITALS */}
                    <div className="mb-5">
                        <h5 className="text-secondary fw-bold text-uppercase mb-4 small letter-spacing-1">Zone A: Dataset Vitals</h5>
                        <Row className="g-4">
                            {/* Missing */}
                            <Col md={hasMissing ? 4 : 3} xl={2}>
                                <div className="glass-card p-4 h-100 text-center">
                                    <h6 className="text-white fw-bold mb-3">Missing Values</h6>
                                    {hasMissing ? (
                                        <div style={{ height: '140px' }}><Bar data={missingChartData} options={miniChartOptions} /></div>
                                    ) : (
                                        <div className="h-100 d-flex flex-column justify-content-center text-success"><BsShieldCheck size={32} className="mb-2 mx-auto" />All Clear</div>
                                    )}
                                </div>
                            </Col>

                            {/* Outliers */}
                            <Col md={hasOutliers ? 4 : 3} xl={2}>
                                <div className="glass-card p-4 h-100 text-center">
                                    <h6 className="text-white fw-bold mb-3">Outliers</h6>
                                    {hasOutliers ? (
                                        <div style={{ height: '140px' }}><Bar data={outlierChartData} options={miniChartOptions} /></div>
                                    ) : (
                                        <div className="h-100 d-flex flex-column justify-content-center text-success"><BsShieldCheck size={32} className="mb-2 mx-auto" />Stable</div>
                                    )}
                                </div>
                            </Col>

                            {/* Type Mismatches */}
                            <Col md={hasTypes ? 4 : 3} xl={2}>
                                <div className="glass-card p-4 h-100 text-center">
                                    <h6 className="text-white fw-bold mb-3">Type Mismatches</h6>
                                    {hasTypes ? (
                                        <div style={{ height: '140px' }}>
                                            <Bar data={typeChartData} options={{
                                                ...miniChartOptions,
                                                plugins: {
                                                    ...miniChartOptions.plugins,
                                                    tooltip: {
                                                        callbacks: {
                                                            afterLabel: () => "Entire column detected with incorrect data type. All rows impacted."
                                                        }
                                                    }
                                                }
                                            }} />
                                        </div>
                                    ) : (
                                        <div className="h-100 d-flex flex-column justify-content-center text-success"><BsShieldCheck size={32} className="mb-2 mx-auto" />Valid</div>
                                    )}
                                </div>
                            </Col>

                            {/* Format Issues */}
                            <Col md={hasFormat ? 4 : 3} xl={2}>
                                <div className="glass-card p-4 h-100 text-center">
                                    <h6 className="text-white fw-bold mb-3">Formatting</h6>
                                    {hasFormat ? (
                                        <div style={{ height: '140px' }}><Bar data={formatChartData} options={miniChartOptions} /></div>
                                    ) : (
                                        <div className="h-100 d-flex flex-column justify-content-center text-success"><BsShieldCheck size={32} className="mb-2 mx-auto" />Consistent</div>
                                    )}
                                </div>
                            </Col>

                            {/* Duplicates */}
                            <Col md={4} xl={4}>
                                <div className="glass-card p-4 h-100">
                                    <Row className="h-100 align-items-center">
                                        <Col xs={6}>
                                            <h6 className="text-white fw-bold mb-1">Uniqueness</h6>
                                            <h2 className="display-6 fw-bold mb-0 text-white">
                                                {((uniqueCount / version.rows_count) * 100).toFixed(1)}%
                                            </h2>
                                            <span className="text-muted small">Unique Records</span>
                                        </Col>
                                        <Col xs={6}>
                                            <div style={{ height: '120px' }}>
                                                <Doughnut data={duplicateChartData} options={{
                                                    ...chartOptions,
                                                    plugins: { legend: { display: false } },
                                                    cutout: '70%'
                                                }} />
                                            </div>
                                        </Col>
                                    </Row>
                                </div>
                            </Col>
                        </Row>
                    </div>

                    {/* ZONE B: DATA DNA */}
                    <div className="mb-5">
                        <h5 className="text-secondary fw-bold text-uppercase mb-4 small letter-spacing-1">Zone B: Data DNA (Distribution Profiling)</h5>
                        <div className="glass-card p-4">
                            {distributions && Object.keys(distributions).length > 0 ? (
                                <Row className="flex-nowrap overflow-auto px-2 pb-3" style={{ gap: '20px' }}>
                                    {Object.entries(distributions).map(([col, data]) => (
                                        <Col key={col} style={{ minWidth: '300px', maxWidth: '300px' }}>
                                            <div className="p-3 rounded-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <h6 className="text-white fw-bold mb-3">{col}</h6>
                                                <div style={{ height: '150px' }}>
                                                    <Bar
                                                        data={{
                                                            labels: data.labels,
                                                            datasets: [{ data: data.data, backgroundColor: '#3b82f6', borderRadius: 4 }]
                                                        }}
                                                        options={{
                                                            ...miniChartOptions,
                                                            scales: { x: { display: false }, y: { display: false } }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </Col>
                                    ))}
                                </Row>
                            ) : (
                                <div className="text-center py-5 text-muted">No distribution data available.</div>
                            )}
                        </div>
                    </div>



                    {/* ZONE C: CORRELATION */}
                    <div className="mb-5">
                        <h5 className="text-secondary fw-bold text-uppercase mb-4 small letter-spacing-1">Zone C: Feature Correlation</h5>
                        <Card className="glass-card border-0 p-4">
                            <div className="d-flex justify-content-center bg-black rounded-3 p-4">
                                <img
                                    src={`/api/datasets/version/${version.id}/correlation`}
                                    alt="Correlation Heatmap"
                                    style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain' }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.parentElement.innerHTML = '<div class="text-muted p-5">Not enough numeric data for correlation analysis.</div>';
                                    }}
                                />
                            </div>
                        </Card>
                    </div>

                </div>
            </div>
        </Modal>
    );
};

export default AnalyticsHub;
