"use client";

import type { PredictEngineSnapshot } from "@/lib/predict";
import { Badge, Card } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

function formatRecommendation(value: string) {
  return value
    .split("_")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

export function PredictBoard({ snapshot }: { snapshot: PredictEngineSnapshot }) {
  return (
    <div className="space-y-8">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Predicted Opportunities</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.opportunitiesPredicted}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Average Win Probability</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.averageWinProbability}%</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Average Strategic Fit</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.averageStrategicFit}%</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Average Risk</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.averageRiskScore}%</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Strong Bid Count</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.strongBidCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Prediction Accuracy</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.averagePredictionAccuracy}%</p>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Win Probability Distribution</p>
          <div className="mt-5 space-y-4">
            {snapshot.distribution.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <Badge className="bg-white/8">{item.count}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Bid / No-Bid Recommendations</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {snapshot.recommendationBreakdown.map((item) => (
              <div key={item.recommendation} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-white">{formatRecommendation(item.recommendation)}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{item.count}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-semibold text-white">Learning Loop</p>
            <p className="mt-2 text-sm text-slate-300">
              Overall actual win rate {snapshot.accuracy.overall?.actualWinRate ?? 0}% against an average predicted probability of{" "}
              {snapshot.accuracy.overall?.averagePredictedWinProbability ?? 0}%.
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Average accuracy score is {snapshot.metrics.averagePredictionAccuracy}% across {snapshot.accuracy.overall?.sampleSize ?? 0} resolved pursuits.
            </p>
          </div>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {[
          {
            title: "Highest Probability Opportunities",
            opportunities: snapshot.highestProbabilityOpportunities,
            empty: "No opportunities have been predicted yet.",
          },
          {
            title: "Lowest Probability Opportunities",
            opportunities: snapshot.lowestProbabilityOpportunities,
            empty: "No low-probability opportunities have been predicted yet.",
          },
          {
            title: "Strategic Fit Rankings",
            opportunities: snapshot.strategicFitRankings,
            empty: "No strategic-fit rankings are available yet.",
          },
          {
            title: "Revenue Weighted Opportunities",
            opportunities: snapshot.revenueWeightedOpportunities,
            empty: "No revenue-weighted opportunities are available yet.",
          },
        ].map((section) => (
          <Card key={section.title} className="p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{section.title}</p>
            <div className="mt-5 space-y-4">
              {section.opportunities.length > 0 ? (
                section.opportunities.map((item) => (
                  <div key={`${section.title}-${item.projectId ?? item.opportunityId ?? item.title}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-400">{item.buyerName}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-emerald-500/10 text-emerald-200">{item.winProbability}% win</Badge>
                        <Badge className="bg-white/8">{formatRecommendation(item.recommendation)}</Badge>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-4 text-sm text-slate-300">
                      <p>Fit {item.strategicFitScore}%</p>
                      <p>Risk {item.riskScore}%</p>
                      <p>Confidence {item.confidenceScore}%</p>
                      <p>{formatCurrency(item.expectedRevenue)}</p>
                    </div>
                    <p className="mt-3 text-sm text-slate-300">{item.summary}</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <p className="text-xs text-slate-500">
                        Strengths: {item.strengths.length > 0 ? item.strengths.join(", ") : "No major strengths surfaced yet."}
                      </p>
                      <p className="text-xs text-slate-500">
                        Risks: {item.risks.length > 0 ? item.risks.join(", ") : "No major risks surfaced yet."}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-300">{section.empty}</p>
              )}
            </div>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Accuracy By Sector</p>
          <div className="mt-5 space-y-4">
            {snapshot.accuracy.bySector.length > 0 ? (
              snapshot.accuracy.bySector.map((item) => (
                <div key={item.dimensionKey} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{item.dimensionKey}</p>
                    <Badge className="bg-white/8">{item.sampleSize} bids</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    Actual win rate {item.actualWinRate}% • Predicted {item.averagePredictedWinProbability}% • Accuracy {item.averageAccuracyScore}%
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-300">Sector accuracy will appear once outcomes are recorded against predictions.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Accuracy By Buyer</p>
          <div className="mt-5 space-y-4">
            {snapshot.accuracy.byBuyer.length > 0 ? (
              snapshot.accuracy.byBuyer.map((item) => (
                <div key={item.dimensionKey} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{item.dimensionKey}</p>
                    <Badge className="bg-white/8">{item.sampleSize} bids</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    Actual win rate {item.actualWinRate}% • Predicted {item.averagePredictedWinProbability}% • Accuracy {item.averageAccuracyScore}%
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-300">Buyer accuracy will appear once outcomes are recorded against predictions.</p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
