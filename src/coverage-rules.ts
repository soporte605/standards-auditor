import type { Rule } from './config.js';
import { metricNames } from './coverage-data.js';
import type { CoverageData, Metric } from './coverage-data.js';

export interface CoverageEvaluation {
  ruleId: string;
  severity: 'error' | 'warning';
  metric: Metric;
  status: 'pass' | 'fail' | 'not-evaluated';
  minimum: number;
  actual: number | null;
  message: string;
  evidence: {
    report: string;
    scope: 'report-total';
    sha256: string | null;
    modifiedAt: string | null;
    freshness: 'unverified';
  };
}
export function evaluateCoverage(
  rule: Extract<Rule, { detector: 'coverage-thresholds' }>,
  data: CoverageData,
): CoverageEvaluation[] {
  return metricNames.flatMap((metric) => {
    const minimum = rule.minimum[metric];
    if (minimum === undefined) return [];
    const actual = data.total?.[metric] ?? null;
    const status =
      actual === null ? 'not-evaluated' : actual < minimum ? 'fail' : 'pass';
    const message =
      status === 'not-evaluated'
        ? data.status !== 'available'
          ? data.message
          : `No hay porcentaje global disponible para ${metric}.`
        : `${metric}: ${actual}% ${status === 'pass' ? 'cumple' : 'incumple'} el mínimo de ${minimum}%.`;
    return [
      {
        ruleId: rule.id,
        severity: rule.severity,
        metric,
        status,
        minimum,
        actual,
        message,
        evidence: {
          report: rule.report,
          scope: 'report-total',
          sha256: data.sha256,
          modifiedAt: data.modifiedAt,
          freshness: 'unverified',
        },
      },
    ];
  });
}
