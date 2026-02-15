import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Minus, Info } from 'lucide-react';

interface SpeechGraphMetricsProps {
  metrics: {
    full_metrics: {
      nodes: number;
      edges: number;
      lsc: number;
      lcc: number;
      loops: {
        L1: number;
        L2: number;
        L3: number;
      };
      parallel_edges: number;
      density: number;
      avg_degree: number;
    };
    lexical_diversity: number;
    word_count: number;
    unique_words: number;
  };
  baseline?: any; // Optional healthy baseline for comparison
}

export const SpeechGraphMetrics: React.FC<SpeechGraphMetricsProps> = ({
  metrics,
  baseline,
}) => {
  const { full_metrics } = metrics;

  // Interpretation helper
  const interpretLSC = (lsc: number, totalNodes: number) => {
    const ratio = totalNodes > 0 ? lsc / totalNodes : 0;
    if (ratio > 0.5) return { status: 'good', color: 'text-green-600', icon: ArrowUp };
    if (ratio > 0.3) return { status: 'moderate', color: 'text-yellow-600', icon: Minus };
    return { status: 'concern', color: 'text-red-600', icon: ArrowDown };
  };

  const lscInterp = interpretLSC(full_metrics.lsc, full_metrics.nodes);
  const StatusIcon = lscInterp.icon;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-4">
          {/* LSC - Most Important Metric (Full Width) */}
          <Tooltip content="Key dementia detection metric. Measures word recurrence patterns requiring working memory. Ratio >50% is healthy, 30-50% moderate, <30% concerning.">
            <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200 cursor-help hover:bg-gray-100 transition-colors h-[160px] flex items-center">
              <div className="flex items-center justify-between w-full">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      Largest Strongly Connected Component (LSC)
                    </p>
                    <Info size={14} className="text-gray-400" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {full_metrics.lsc}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    out of {full_metrics.nodes} unique words
                  </p>
                </div>
                <div className={`flex flex-col items-center ${lscInterp.color} ml-8`}>
                  <StatusIcon size={32} />
                  <span className="text-xs font-medium mt-1 capitalize">{lscInterp.status}</span>
                </div>
              </div>
            </div>
          </Tooltip>

          {/* Other Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-4">
            <MetricCard
              label="LCC"
              value={full_metrics.lcc}
              description="Largest Connected Component"
              tooltip="Largest set of interconnected words. Higher values indicate more cohesive speech."
            />

            <MetricCard
              label="Graph Density"
              value={(full_metrics.density * 100).toFixed(1) + '%'}
              description="Edge density"
              tooltip="Ratio of word connections to possible connections. Healthy range: 5-20%."
            />

            <MetricCard
              label="Avg Degree"
              value={full_metrics.avg_degree.toFixed(2)}
              description="Connections per word"
              tooltip="Average connections per word. Higher values indicate richer, varied speech."
            />

            <MetricCard
              label="Lexical Diversity"
              value={(metrics.lexical_diversity * 100).toFixed(1) + '%'}
              description="Type-token ratio"
              tooltip="Unique words / total words. Higher percentages show richer vocabulary."
            />

            <MetricCard
              label="Total Words"
              value={metrics.word_count}
              description="Words analyzed"
              tooltip="Total words after preprocessing. More words lead to more reliable metrics."
            />

            <MetricCard
              label="Unique Words"
              value={metrics.unique_words}
              description="Vocabulary size"
              tooltip="Number of distinct words used. Larger vocabulary indicates richer language."
            />
          </div>

          {/* Loop Counts (Full Width) */}
          <Tooltip content="Cyclic speech patterns: L1 (word repeats), L2 (two-word cycles), L3 (three-word cycles). Higher counts indicate repetitive speech.">
            <div className="bg-gray-50 rounded-lg p-4 cursor-help hover:bg-gray-100 transition-colors h-[140px] flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Repetition Loops
                </p>
                <Info size={14} className="text-gray-400" />
              </div>
              <div className="grid grid-cols-3 gap-3 mb-2">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{full_metrics.loops.L1}</p>
                  <p className="text-xs text-gray-500">L1 (self-loops)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{full_metrics.loops.L2}</p>
                  <p className="text-xs text-gray-500">L2 (2-cycles)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{full_metrics.loops.L3}</p>
                  <p className="text-xs text-gray-500">L3 (3-cycles)</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 italic text-center">
                Higher loop counts indicate repetitive speech patterns common in dementia.
              </p>
            </div>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

// Tooltip component
const Tooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <div
        className={`absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-100 text-gray-900 text-xs rounded-lg shadow-xl whitespace-normal w-56 pointer-events-none transition-all duration-200 ease-in-out ${
          show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'
        }`}
        style={{ border: '1px solid #e5e7eb' }}
      >
        <div className="italic leading-relaxed">{content}</div>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
          <div className="border-4 border-transparent border-t-gray-100"></div>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{
  label: string;
  value: string | number;
  description: string;
  tooltip: string;
}> = ({ label, value, description, tooltip }) => (
  <Tooltip content={tooltip}>
    <div className="bg-gray-50 rounded-lg p-4 cursor-help hover:bg-gray-100 transition-colors h-[120px] flex flex-col justify-center">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
        <Info size={14} className="text-gray-400 ml-2 mt-1 flex-shrink-0" />
      </div>
    </div>
  </Tooltip>
);
