import { z } from "zod";

export type ConversionResult = {
    markdown: string;
    images: Record<number, string>;
};

/**
 * A rectangle relative to the photo: (0, 0) is the top-left corner,
 * (1, 1) the bottom-right one. Multiply by the drawn image size to place it.
 */
export const normalizedBoxSchema = z.object({
    left: z.number().min(0).max(1),
    top: z.number().min(0).max(1),
    right: z.number().min(0).max(1),
    bottom: z.number().min(0).max(1),
});

export const ocrBlockSchema = z.object({
    id: z.string(),
    text: z.string(),
    kind: z.string(),
    bbox: normalizedBoxSchema,
});

export const imageOcrResultSchema = z.object({
    blocks: z.array(ocrBlockSchema),
});

export const blockTranslationEventSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("translation"),
        id: z.string(),
        translated: z.string(),
    }),
    z.object({ type: z.literal("done") }),
    z.object({
        type: z.literal("error"),
        errorId: z.string(),
        status: z.number(),
    }),
]);

export type NormalizedBox = z.infer<typeof normalizedBoxSchema>;
export type OcrBlock = z.infer<typeof ocrBlockSchema>;
export type ImageOcrResult = z.infer<typeof imageOcrResultSchema>;
export type BlockTranslationEvent = z.infer<typeof blockTranslationEventSchema>;
