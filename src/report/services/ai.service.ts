import { ReportCalculatedData } from "../utils/reportCalculations";

export interface AiReportContent {
  executiveSummary: string;
  financialAnalysis: string;
  careerOutlook: string;
  recommendation: string;
  keyFindings: string[];
}

export async function generateReportAiContent(
  data: ReportCalculatedData
): Promise<AiReportContent> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("⚠️ GEMINI_API_KEY environment variable is not defined. Falling back to structured mock AI content.");
    return getFallbackMockContent(data);
  }

  const prompt = `
You are a senior educational strategist, institutional research analyst, and college financial advisor.
Analyze the following student profile, major details, college metrics, and calculations:

STUDENT PROFILE:
- Student Name: ${data.student.name}
- GPA: ${data.student.gpa}
- SAT Score: ${data.student.sat}
- Income Tier: ${data.student.income}
- Preferred States: ${data.student.preferredStates.join(", ") || "None specified"}

MAJOR / PROGRAM:
- Major: ${data.program.title}
- Degree Level: ${data.program.level}
- CIP Code: ${data.program.cipCode}

COLLEGES COMPARISON METRICS:
${data.colleges
  .map(
    (c) => `
- ${c.name} (${c.city}, ${c.state}):
  * Sticker Price: $${c.stickerPrice?.toLocaleString() || "N/A"}
  * Average Net Price: $${c.netPrice?.toLocaleString() || "N/A"}
  * Graduation Rate: ${c.graduationRate ? (c.graduationRate * 100).toFixed(1) + "%" : "N/A"}
  * Admission Rate: ${c.admissionRate ? (c.admissionRate * 100).toFixed(1) + "%" : "N/A"}
  * Academic Fit: ${c.admissionFit.category} (Score: ${c.admissionFit.score}/100)
  * Median 5-Year Salary: $${c.median5YrEarnings?.toLocaleString() || "N/A"}
  * 20-Year ROI: $${c.roi20Yr?.toLocaleString() || "N/A"}
  * Total 20-Year Cost: $${c.totalCost20Yr?.toLocaleString() || "N/A"}
  * Average Student Debt: $${c.averageDebt?.toLocaleString() || "N/A"}
  * Debt-to-Income Ratio: ${c.debtIncomeRatioFormatted}
`
  )
  .join("\n")}

CALCULATED RANKINGS:
- Best Value (ROI): ${data.rankings.bestValue}
- Lowest Cost: ${data.rankings.lowestCost}
- Highest Salary: ${data.rankings.highestSalary}
- Highest Graduation Rate: ${data.rankings.highestGradRate}
- Biggest Financial Risk: ${data.rankings.biggestRisk}

Based on this data, provide a professional, corporate-level strategic analysis matching the tone of McKinsey, Deloitte, or a university research office.
Write in a clear, authoritative, and sophisticated tone. Avoid generic templates, buzzwords, or conversational remarks.

Provide your output in strict JSON conforming to the following structure:
{
  "executiveSummary": "A 3-4 sentence strategic overview of the decision context, comparing the options.",
  "financialAnalysis": "A 3-4 sentence detailed comparison of Net Price vs. long-term ROI/NPV. Highlight which option is the most financially efficient.",
  "careerOutlook": "A 3-4 sentence analysis of salary projections, debt burdens, and repayment risk for the chosen major.",
  "recommendation": "A detailed 4-5 sentence strategic recommendation. Make a clear, decisive choice on which college the student should select, and explain exactly WHY based on fit, cost, and ROI.",
  "keyFindings": [
    "A concise, high-impact bullet point summarizing a major data finding.",
    "A second concise, high-impact bullet point summarizing a finding.",
    "A third concise, high-impact bullet point summarizing a finding.",
    "A fourth concise, high-impact bullet point summarizing a finding."
  ]
}

DO NOT return any HTML, Markdown code blocks, backticks, or trailing explanations. Return only the raw JSON.
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              executiveSummary: { type: "STRING" },
              financialAnalysis: { type: "STRING" },
              careerOutlook: { type: "STRING" },
              recommendation: { type: "STRING" },
              keyFindings: {
                type: "ARRAY",
                items: { type: "STRING" },
              },
            },
            required: [
              "executiveSummary",
              "financialAnalysis",
              "careerOutlook",
              "recommendation",
              "keyFindings",
            ],
          },
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errText}`);
    }

    const resJson = await response.json();
    const textContent = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      throw new Error("Empty response from Gemini API");
    }

    return JSON.parse(textContent) as AiReportContent;
  } catch (error) {
    console.error("Error generating AI content via Gemini API:", error);
    return getFallbackMockContent(data);
  }
}

function getFallbackMockContent(data: ReportCalculatedData): AiReportContent {
  const collegesStr = data.colleges.map((c) => c.name).join(", ");
  const recCollege = data.rankings.bestValue !== "N/A" ? data.rankings.bestValue : data.colleges[0]?.name || "selected institution";

  return {
    executiveSummary: `This decision report evaluates enrollment parameters for ${data.student.name} pursuing a ${data.program.level} in ${data.program.title} across ${data.colleges.length} selected institutions: ${collegesStr}. By aligning academic credentials (GPA: ${data.student.gpa}, SAT: ${data.student.sat}) against historical admission benchmarks, we assess institutional compatibility alongside long-term cost efficiency. The evaluation prioritizes graduation certainty, financial net exposure, and professional outcome metrics.`,
    financialAnalysis: `From a financial efficiency standpoint, the Net Price ranges from a low of ${
      data.colleges.find((c) => c.name === data.rankings.lowestCost)?.netPrice?.toLocaleString()
        ? "$" + data.colleges.find((c) => c.name === data.rankings.lowestCost)?.netPrice?.toLocaleString()
        : "N/A"
    } to a high of ${
      data.colleges.find((c) => c.name === data.rankings.biggestRisk)?.stickerPrice?.toLocaleString()
        ? "$" + data.colleges.find((c) => c.name === data.rankings.biggestRisk)?.stickerPrice?.toLocaleString()
        : "N/A"
    }. The 20-year ROI yields a substantial delta, with ${data.rankings.bestValue} leading at ${
      data.colleges.find((c) => c.name === data.rankings.bestValue)?.roi20YrFormatted || "N/A"
    }. Investing in institutions with robust aid programs and high graduation rates mitigates early tuition premium risks, establishing a superior financial foundation.`,
    careerOutlook: `Graduates entering the field of ${data.program.title} project starting salaries exceeding average parameters, with 5-year post-graduation salaries maximizing at ${
      data.colleges.find((c) => c.name === data.rankings.highestSalary)?.avgSalary?.toLocaleString()
        ? "$" + data.colleges.find((c) => c.name === data.rankings.highestSalary)?.avgSalary?.toLocaleString()
        : "N/A"
    }. Debt-to-income profiles remain manageable, averaging around ${
      data.colleges[0]?.debtIncomeRatioFormatted || "N/A"
    }, indicating a rapid path to capital amortization. The overall risk index is tempered by high graduation rates, supporting rapid debt liquidation.`,
    recommendation: `Based on a comprehensive review of academic placement, net expenditure, and salary outcomes, we recommend ${recCollege} as the primary choice. ${recCollege} offers a compelling combination of high academic compatibility, robust graduation rates, and a dominant 20-year ROI. Selecting this institution optimizes the balance between initial cost exposure and long-term professional yield, outperforming the alternatives in total value.`,
    keyFindings: [
      `${data.rankings.bestValue} represents the optimal financial investment, delivering the highest projected 20-year Return on Investment.`,
      `Net tuition discounts vary significantly, suggesting that sticker price is not representative of final student obligations.`,
      `Graduate salaries for ${data.program.title} across all options exhibit strong upward trajectories within five years of workforce entry.`,
      `Admissions selectivity corresponds directly with historical retention, reinforcing the link between institutional fit and student success.`,
    ],
  };
}
