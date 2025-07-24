import type { MDCNode } from "@nuxtjs/mdc";
import markdownStyle from "~/assets/css/generated_markdown.css?raw";

/**
 * Converts MDC parsed AST node to HTML string
 * Recursively processes the AST nodes and converts them to HTML
 */
function astToHtml(node: MDCNode | MDCNode[]): string {
    if (!node) return "";

    if (typeof node === "string") {
        return node;
    }

    if (Array.isArray(node)) {
        return node.map(astToHtml).join("");
    }

    if (node.type === "text") {
        return String(node.value || "");
    }

    if (node.type === "element") {
        const tag = String(node.tag || "div");
        const children = node.children ? astToHtml(node.children) : "";
        const props = (node.props as Record<string, unknown>) || {};

        // Build attributes string
        const attributes = Object.entries(props)
            .filter(([, value]) => value !== undefined && value !== null)
            .map(
                ([key, value]) =>
                    `${key}="${String(value).replace(/"/g, "&quot;")}"`,
            )
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
        const parsed = await parseMarkdown(markdown);
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
