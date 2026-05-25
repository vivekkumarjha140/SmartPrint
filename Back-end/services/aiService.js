const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const generateDesignRecommendations = async ({
  businessType,
  audience,
  colorPreference,
  garmentType,
  occasion
}) => {
  const prompt = `
You are a senior apparel brand designer.
Generate premium custom T-shirt printing recommendations.

Business type: ${businessType || "custom brand"}
Audience: ${audience || "general"}
Color preference: ${colorPreference || "modern neutral"}
Garment type: ${garmentType || "t-shirt"}
Occasion: ${occasion || "brand merchandise"}

Return JSON with:
- title
- concept
- recommendedColors
- typographyStyle
- printPlacement
- productionMethod
- upsellIdeas
`;

  const response = await openai.chat.completions.create({
    model: process.env.AI_MODEL || "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Return valid JSON only. No markdown."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7
  });

  return JSON.parse(response.choices[0].message.content);
};

const generatePreviewPrompt = async ({ designText, garmentColor, style }) => {
  const prompt = `
Create a professional AI image generation prompt for a custom garment mockup.

Text/logo idea: ${designText}
Garment color: ${garmentColor}
Style: ${style}

Return only a detailed image prompt.
`;

  const response = await openai.chat.completions.create({
    model: process.env.AI_MODEL || "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.8
  });

  return response.choices[0].message.content;
};

module.exports = {
  generateDesignRecommendations,
  generatePreviewPrompt
};