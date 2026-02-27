import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { ResearchStep } from './ResearchInterface';

interface ResearchProgressCardProps {
    steps: ResearchStep[];
}

function StepIcon({ status }: { status: ResearchStep['status'] }) {
    if (status === 'completed') {
        return (
            <div
                className="flex-shrink-0 flex items-center justify-center"
                style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'rgba(0, 201, 80, 0.1)',
                    border: '1.4px solid #00C950',
                }}
            >
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#00C950" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        );
    }
    if (status === 'active') {
        return (
            <div
                className="flex-shrink-0 flex items-center justify-center"
                style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'rgba(43, 127, 255, 0.10)',
                    border: '1.4px solid #2B7FFF',
                }}
            >
                <div
                    className="animate-pulse"
                    style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#2B7FFF',
                    }}
                />
            </div>
        );
    }
    if (status === 'error') {
        return (
            <div
                className="flex-shrink-0 flex items-center justify-center"
                style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1.4px solid #EF4444',
                }}
            >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2L8 8M8 2L2 8" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            </div>
        );
    }
    // pending
    return (
        <div
            className="flex-shrink-0"
            style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: 'var(--ri-step-pending-bg)',
                border: '1.4px solid var(--ri-step-pending-border)',
            }}
        />
    );
}

function StepRow({ step, isLast }: { step: ResearchStep; isLast: boolean }) {
    const [expanded, setExpanded] = useState(false);
    const hasDetail = !!step.expandedContent;

    return (
        <div className="relative flex gap-3">
            {/* Vertical connector line */}
            {!isLast && (
                <div
                    style={{
                        position: 'absolute',
                        left: 8,
                        top: 22,
                        width: 1,
                        bottom: -12,
                        background: 'var(--ri-step-connector)',
                    }}
                />
            )}

            {/* Icon */}
            <div style={{ paddingTop: 2 }}>
                <StepIcon status={step.status} />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0" style={{ paddingBottom: isLast ? 0 : 12 }}>
                <div
                    style={{
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 500,
                        fontSize: 12,
                        lineHeight: '14px',
                        letterSpacing: '-0.15px',
                        color: 'var(--ri-step-title)',
                        marginBottom: 4,
                    }}
                >
                    {step.title}
                </div>

                {/* Summary subtext + chevron */}
                {(step.summary || (step.status === 'active' && step.messages.length > 0)) && (
                    <div className="flex items-center gap-1">
                        <span
                            style={{
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 300,
                                fontSize: 10,
                                lineHeight: '20px',
                                color: 'var(--ri-step-subtext)',
                                flexShrink: 1,
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {step.status === 'active'
                                ? step.messages[step.messages.length - 1]?.content
                                : step.summary}
                        </span>

                        {hasDetail && (
                            <button
                                onClick={() => setExpanded(!expanded)}
                                style={{ flexShrink: 0, color: 'var(--ri-step-subtext)', display: 'flex', alignItems: 'center' }}
                            >
                                {expanded ? (
                                    <ChevronDown size={10} />
                                ) : (
                                    <ChevronRight size={10} />
                                )}
                            </button>
                        )}
                    </div>
                )}

                {/* Expanded detail */}
                {expanded && step.expandedContent && (
                    <div
                        style={{
                            marginTop: 6,
                            fontFamily: 'Inter, sans-serif',
                            fontWeight: 300,
                            fontSize: 10,
                            lineHeight: '17px',
                            color: 'var(--ri-step-subtext)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                        }}
                    >
                        {step.expandedContent}
                    </div>
                )}
            </div>
        </div>
    );
}

export function ResearchProgressCard({ steps }: ResearchProgressCardProps) {
    const completedCount = steps.filter(s => s.status === 'completed').length;
    const totalCount = steps.length;
    const isAllDone = completedCount === totalCount;

    return (
        <div
            style={{
                background: 'var(--ri-step-card-bg)',
                border: '1px solid var(--ri-step-card-border)',
                borderRadius: 10,
                boxShadow: '0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -4px rgba(0,0,0,0.1)',
                padding: '14px 16px 14px',
                width: '100%',
            }}
        >
            {/* Card header label */}
            <div
                className="flex items-center gap-2 mb-3"
                style={{ fontFamily: 'Inter, sans-serif' }}
            >
                <div
                    style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: isAllDone ? '#00C950' : '#2B7FFF',
                        opacity: 0.72,
                        flexShrink: 0,
                    }}
                />
                <span
                    style={{
                        fontWeight: 500,
                        fontSize: 10,
                        lineHeight: '16px',
                        letterSpacing: '0.6px',
                        textTransform: 'uppercase' as const,
                        color: 'var(--ri-step-subtext)',
                    }}
                >
                    {isAllDone
                        ? `Research complete · ${totalCount} steps`
                        : `Researching · ${completedCount}/${totalCount} steps`}
                </span>
            </div>

            {/* Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {steps.map((step, i) => (
                    <StepRow key={step.id} step={step} isLast={i === steps.length - 1} />
                ))}
            </div>
        </div>
    );
}
