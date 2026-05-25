const express = require("express");
const {
  recommendDesign,
  generateDesignPreview
} = require("../controllers/aiController");

const router = express.Router();

router.post("/recommend", recommendDesign);
router.post("/preview-prompt", generateDesignPreview);

module.exports = router;