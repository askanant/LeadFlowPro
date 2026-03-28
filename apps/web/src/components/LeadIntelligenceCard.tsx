import { TrendingUp, Zap, AlertCircle, Clock, Flame, Thermometer, Snowflake, Trash2, Check, Mail } from 'lucide-react';
import type { DetailedLeadScore } from '../api/ai';

interface ConversionPredictionType {
  probability: number;
  confidence: number;
  estimatedDaysToConvert: number | null;
  suggestedFollowUpChannel: 'email' | 'phone' | 'sms' | 'linkedin';
  factors: {
    positive: string[];
    negative: string[];
  };
}

interface LeadIntelligenceCardProps {
  scoring?: DetailedLeadScore;
  prediction?: ConversionPredictionType;
  compact?: boolean;
}

const tierConfig = {
  hot: { color: 'bg-red-100', textColor: 'text-red-900', badgeColor: 'bg-red-600', Icon: Flame },
  warm: { color: 'bg-orange-100', textColor: 'text-orange-900', badgeColor: 'bg-orange-600', Icon: Thermometer },
  cold: { color: 'bg-blue-100', textColor: 'text-blue-900', badgeColor: 'bg-blue-600', Icon: Snowflake },
  junk: { color: 'bg-gray-100', textColor: 'text-gray-900', badgeColor: 'bg-gray-600', Icon: Trash2 },
};

export function LeadIntelligenceCard({ scoring, prediction, compact = false }: LeadIntelligenceCardProps) {
  if (!scoring) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <p className="text-gray-600">No intelligence data available</p>
      </div>
    );
  }

  const tier = scoring.tier;
  const config = tierConfig[tier];

  if (compact) {
    return (
      <div className={`${config.color} rounded-lg p-3 space-y-2`}>
        <div className="flex items-center justify-between">
          <span className={`text-sm font-bold ${config.textColor} flex items-center gap-1`}>
            <config.Icon size={14} /> {scoring.tier.toUpperCase()}
          </span>
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
              <span className="text-sm font-bold text-gray-900">{scoring.overallScore}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1 flex-wrap">
          {scoring.signals.slice(0, 2).map((signal, i) => (
            <span key={i} className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded">
              {signal}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${config.color} rounded-xl p-6 border border-gray-200 shadow-sm`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className={`text-lg font-bold ${config.textColor} flex items-center gap-1.5`}>
            <config.Icon size={18} /> {scoring.tier.toUpperCase()} Lead
          </h3>
          <p className="text-sm text-gray-600">Overall Score</p>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-white border-4 border-gray-300 flex items-center justify-center shadow-inner">
            <span className="text-3xl font-bold text-gray-900 tabular-nums">{scoring.overallScore}</span>
          </div>
          <span className="text-xs text-gray-600 mt-2">/ 100</span>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white bg-opacity-60 rounded-lg p-3 text-center card-hover">
          <p className="text-xs text-gray-600">Quality</p>
          <p className="text-lg font-bold text-gray-900 tabular-nums">{scoring.qualityScore}</p>
        </div>
        <div className="bg-white bg-opacity-60 rounded-lg p-3 text-center card-hover">
          <p className="text-xs text-gray-600">Engagement</p>
          <p className="text-lg font-bold text-gray-900 tabular-nums">{Math.round(scoring.engagementScore)}</p>
        </div>
        <div className="bg-white bg-opacity-60 rounded-lg p-3 text-center card-hover">
          <p className="text-xs text-gray-600">Intent</p>
          <p className="text-lg font-bold text-gray-900 tabular-nums">{Math.round(scoring.intentScore)}</p>
        </div>
        <div className="bg-white bg-opacity-60 rounded-lg p-3 text-center card-hover">
          <p className="text-xs text-gray-600">ICP Fit</p>
          <p className="text-lg font-bold text-gray-900 tabular-nums">{Math.round(scoring.firmographicScore)}</p>
        </div>
      </div>

      {/* Signals */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Key Signals</h4>
        <div className="flex flex-wrap gap-2">
          {scoring.signals.map((signal, i) => (
            <span key={i} className="text-xs bg-white bg-opacity-70 px-3 py-1.5 rounded-full text-gray-900 shadow-sm flex items-center gap-1">
              <Check size={10} /> {signal}
            </span>
          ))}
        </div>
      </div>

      {/* Predictions */}
      {prediction && (
        <div className="mb-6 bg-white bg-opacity-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Conversion Prediction
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600">Probability</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(prediction.probability * 100)}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Est. Days to Convert</p>
              <p className="text-2xl font-bold text-gray-900">
                {prediction.estimatedDaysToConvert ? `${prediction.estimatedDaysToConvert}d` : 'N/A'}
              </p>
            </div>
          </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-600 font-semibold mb-1">Suggested Follow-up</p>
            <p className="text-sm text-gray-900 font-medium capitalize flex items-center gap-1"><Mail size={14} /> {prediction.suggestedFollowUpChannel}</p>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {scoring.recommendations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Recommended Actions
          </h4>
          {scoring.recommendations.map((rec, i) => (
            <div
              key={i}
              className={`text-sm p-3 rounded-lg flex items-start gap-3 transition-all duration-150 ${
                rec.priority === 'high' ? 'bg-red-200 text-red-900 hover:bg-red-300' : 'bg-white bg-opacity-50 text-gray-900 hover:bg-white hover:bg-opacity-70'
              }`}
            >
              {rec.priority === 'high' ? (
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : (
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="font-semibold capitalize">{rec.action.replace(/_/g, ' ')}</p>
                <p className="text-xs opacity-80">{rec.reason}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Small inline badge for lead lists
 */
export function LeadScoreBadge({ score }: { score: number }) {
  let bgColor = 'bg-gray-200';
  let textColor = 'text-gray-900';

  if (score >= 80) {
    bgColor = 'bg-red-200';
    textColor = 'text-red-900';
  } else if (score >= 60) {
    bgColor = 'bg-orange-200';
    textColor = 'text-orange-900';
  } else if (score >= 40) {
    bgColor = 'bg-blue-200';
    textColor = 'text-blue-900';
  }

  return (
    <div className={`${bgColor} ${textColor} px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1`}>
      <div className="w-2 h-2 rounded-full bg-current opacity-60"></div>
      {score}
    </div>
  );
}
