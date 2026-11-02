export const WASTE_CATEGORIES = [
  { key: "waste_plastic_kg", label: "Plastic" },
  { key: "waste_food_wrapper_kg", label: "Food Wrapper" },
  { key: "waste_paper_cardboard_kg", label: "Paper / Cardboard" },
  { key: "waste_glass_kg", label: "Glass" },
  { key: "waste_organic_kg", label: "Organic" },
  { key: "waste_metal_kg", label: "Metal" },
  { key: "waste_foam_kg", label: "Foam" },
  { key: "waste_textile_kg", label: "Clothes / Textiles" },
  { key: "waste_ewaste_kg", label: "E-waste" },
  { key: "waste_sanitary_kg", label: "Sanitary / Hygiene" },
  { key: "waste_footwear_kg", label: "Footwear / Rubber" },
  { key: "waste_medical_kg", label: "Medical" },
] as const

export type WasteKey = (typeof WASTE_CATEGORIES)[number]["key"]

export const WASTE_HINT =
  "Plastic: bottles, bags, containers · Food Wrapper: snack and junk-food packaging · Clothes / Textiles: shirts, shorts, towels · E-waste: batteries, vapes, electronics · Sanitary / Hygiene: diapers, pads, wet wipes · Footwear / Rubber: slippers, rubber scraps · Medical: facemasks, gloves, syringes, medicine packs"

export const MEDIA_CATEGORIES = [
  { value: "Before_Clearing", label: "Before Cleanup", required: true },
  { value: "After_Clearing", label: "After Cleanup", required: true },
  { value: "Additional_Evidence", label: "Additional Evidence", required: false },
] as const
