import { SkinPreviewData } from "./SkinPreviewData";
import { SkinPreviewType } from "./SkinPreviewType";

/**
 * Represents a preview for a skin.
 */
export type SkinPreview = Partial<Record<SkinPreviewType, SkinPreviewData>>;
