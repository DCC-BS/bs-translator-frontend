import { z } from "zod";

export type ConversionResult = {
    markdown: string;
    images: Record<number, string>;
};

export const bBoxSchema = z.object({
    left: z.number().min(0),
    top: z.number().min(0),
    right: z.number().min(0),
    bottom: z.number().min(0),
    coord_origin: z.enum(["TOPLEFT", "BOTTOMLEFT"]).optional(),
});

export const conversionImageTextEntrySchema = z.object({
    original: z.string(),
    translated: z.string(),
    bbox: bBoxSchema,
});

export type BBox = z.infer<typeof bBoxSchema>;
export type ConversionImageTextEntry = z.infer<
    typeof conversionImageTextEntrySchema
>;
