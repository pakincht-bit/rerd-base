import { GoogleGenAI } from "@google/genai";
import { Project, AIAnalysisResult } from "../types";

const getClient = () => {
    // Check if API key exists in process.env
    if (!process.env.API_KEY) {
        throw new Error("API Key is missing. Please set process.env.API_KEY.");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateMarketAnalysis = async (
    projects: Project[],
    lat: number,
    lng: number,
    radius: number
): Promise<AIAnalysisResult> => {
    const ai = getClient();
    
    // Prepare data summary to reduce token usage
    const dataSummary = projects.slice(0, 20).map(p => ({
        name: p.name,
        dev: p.developer,
        type: p.subUnits.map(u => u.type).join(', '),
        price: p.priceRange,
        sold: p.percentSold + '%',
        speed: p.saleSpeed
    }));

    const prompt = `
        Act as a professional Real Estate Analyst.
        Analyze the following competitor data for a new project located at [${lat.toFixed(4)}, ${lng.toFixed(4)}] within a ${radius} km radius.
        
        Competitor Data Summary (${projects.length} projects total, showing top ${dataSummary.length}):
        ${JSON.stringify(dataSummary)} 
        
        Please provide a strategic analysis in English (or Thai if the project names are Thai) covering:
        1. Market Overview: Briefly describe the supply and price range.
        2. Competitor Performance: Identify best sellers and reasons.
        3. Competitive Analysis: Gaps and recommendations.

        Return the response in strictly valid JSON format with keys: 'market_overview', 'competitor_performance', 'competitive_analysis'. 
        Values should be HTML strings (using <p>, <ul>, <li> tags, no markdown blocks).
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });
        
        const text = response.text;
        if (!text) throw new Error("No response from AI");
        
        return JSON.parse(text) as AIAnalysisResult;
    } catch (error) {
        console.error("Gemini AI Error:", error);
        throw error;
    }
};