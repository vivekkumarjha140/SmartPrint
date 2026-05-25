const asyncHandler = require("../utils/asyncHandler");
const {
  generateDesignRecommendations,
  generatePreviewPrompt
} = require("../services/aiService");

/**
 * @desc    AI design recommendation
 * @route   POST /api/ai/recommend
 * @access  Public or protected based on your choice
 */
const recommendDesign = asyncHandler(async (req, res) => {
  const recommendation = await generateDesignRecommendations(req.body);

  res.status(200).json({
    success: true,
    data: recommendation
  });
});

/**
 * @desc    AI preview prompt
 * @route   POST /api/ai/preview-prompt
 * @access  Public or protected
 */
const generateDesignPreview = asyncHandler(async (req, res) => {
  const prompt = await generatePreviewPrompt(req.body);

  res.status(200).json({
    success: true,
    data: {
      prompt
    }
  });
});

module.exports = {
  recommendDesign,
  generateDesignPreview
};