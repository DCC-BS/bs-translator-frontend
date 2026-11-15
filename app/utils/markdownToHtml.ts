import type { MDCNode } from "@nuxtjs/mdc";
import { markdownStyle } from "~/utils/markdownStyle";
import { safeMarkdownParserOptions } from "~/utils/sanitizeMarkdown";

/** AST prop names that differ from their HTML attribute name. */
const ATTRIBUTE_NAMES: Record<string, string> = {
    className: "class",
    htmlFor: "for",
};

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * Renders one AST prop as an HTML attribute. Boolean props follow HTML
 * semantics: `true` emits the bare attribute, `false` omits it.
 */
function toAttribute(key: string, value: unknown): string | undefined {
    if (value === undefined || value === null || value === false) {
        return undefined;
    }

    const name = ATTRIBUTE_NAMES[key] ?? key;
    if (value === true) {
        return name;
    }

    const text = Array.isArray(value) ? value.join(" ") : String(value);
    return `${name}="${escapeHtml(text)}"`;
}

/**
 * Converts MDC parsed AST node to HTML string
 * Recursively processes the AST nodes and converts them to HTML
 */
function astToHtml(node: MDCNode | MDCNode[]): string {
    if (!node) return "";

    if (typeof node === "string") {
        return escapeHtml(node);
    }

    if (Array.isArray(node)) {
        return node.map(astToHtml).join("");
    }

    if (node.type === "text") {
        return escapeHtml(String(node.value || ""));
    }

    if (node.type === "element") {
        const tag = String(node.tag || "div");
        const children = node.children ? astToHtml(node.children) : "";
        const props = (node.props as Record<string, unknown>) || {};

        // Build attributes string
        const attributes = Object.entries(props)
            .map(([key, value]) => toAttribute(key, value))
            .filter((attribute) => attribute !== undefined)
            .join(" ");

        const attributesStr = attributes ? ` ${attributes}` : "";

        // Self-closing tags
        if (["img", "br", "hr", "input", "meta", "link"].includes(tag)) {
            return `<${tag}${attributesStr} />`;
        }

        return `<${tag}${attributesStr}>${children}</${tag}>`;
    }

    return "";
}

/**
 * Converts markdown to HTML using MDC's parseMarkdown function
 * Provides better markdown parsing than the simple regex approach
 */
export async function markdownToHtml(markdown: string): Promise<string> {
    try {
        const parsed = await parseMarkdown(markdown, safeMarkdownParserOptions);
        if (parsed?.body) {
            const html = astToHtml(parsed.body.children);
            return createHTMLDocument(html);
        }
        return markdown; // Fallback to original text
    } catch (error) {
        console.warn(
            "Failed to parse markdown with MDC, falling back to original text:",
            error,
        );
        return markdown; // Fallback to original text
    }
}

function createHTMLDocument(htmlContent: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown to HTML</title>
    <style>
        ${markdownStyle}
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
}
