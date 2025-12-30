
import { GoogleGenAI } from "@google/genai";
import { Activity, User } from "../types";

export const getPerformanceInsights = async (employee: User, activities: Activity[]) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const stats = {
      farmer: activities.filter(a => a.type === 'farmer').length,
      dealer: activities.filter(a => a.type === 'dealer').length,
      approved: activities.filter(a => a.approved === true).length,
      pending: activities.filter(a => a.approved === null).length,
      rejected: activities.filter(a => a.approved === false).length,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the performance of employee ${employee.name} (Role: ${employee.role}).
      Activities Data:
      - Farmer Advisory visits: ${stats.farmer}
      - Dealer calls: ${stats.dealer}
      - Approval status: ${stats.approved} approved, ${stats.pending} pending, ${stats.rejected} rejected.
      Provide a concise summary of their productivity and any areas for improvement in Dragon LTD's agricultural field operations.`,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "Unable to generate insights at this moment.";
  }
};
