import type { MDCParseOptions } from "@nuxtjs/mdc";

/**
 * Minimal hast shape the sanitizer needs (avoids depending on @types/hast).
 */
type HastNode = {
    type: string;
    tagName?: string;
    properties?: Record<string, unknown>;
    children?: HastNode[];
};

/**
 * Elements dropped together with their content: they can run code, load
 * other pages, submit data, restyle the app or redirect (`<meta refresh>`).
 */
const BLOCKED_TAGS = new Set([
    "applet",
    "audio",
    "base",
    "button",
    "canvas",
    "dialog",
    "embed",
    "form",
    "frame",
    "frameset",
    "iframe",
    "input",
    "link",
    "math",
    "meta",
    "noscript",
    "object",
    "portal",
    "script",
    "select",
    "source",
    "style",
    "svg",
    "template",
    "textarea",
    "track",
    "video",
]);

/**
 * Document markup produced by markdown (incl. GFM) and by converted documents.
 * Any other element (raw HTML, MDC components) is rendered as a plain
 * `<span>` without attributes, so its text stays visible but the element
 * itself is not. (A span rather than its bare children: MDC drops text nodes
 * at the root level.)
 */
const ALLOWED_TAGS = new Set([
    "a",
    "abbr",
    "b",
    "blockquote",
    "br",
    "caption",
    "code",
    "col",
    "colgroup",
    "dd",
    "del",
    "details",
    "div",
    "dl",
    "dt",
    "em",
    "figcaption",
    "figure",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "img",
    "ins",
    "kbd",
    "li",
    "mark",
    "ol",
    "p",
    "pre",
    "q",
    "s",
    "section",
    "small",
    "span",
    "strong",
    "sub",
    "summary",
    "sup",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "tr",
    "u",
    "ul",
]);

/** GFM task lists render as `<input type="checkbox" disabled>`. */
function isTaskListCheckbox(node: HastNode): boolean {
    return node.tagName === "input" && node.properties?.type === "checkbox";
}

function sanitizeNode(node: HastNode): HastNode[] {
    if (node.type !== "element" || !node.tagName) {
        return [node];
    }

    if (isTaskListCheckbox(node)) {
        return [
            { ...node, properties: { ...node.properties, disabled: true } },
        ];
    }

    if (BLOCKED_TAGS.has(node.tagName)) {
        return [];
    }

    sanitizeChildren(node);

    if (!ALLOWED_TAGS.has(node.tagName)) {
        return [{ ...node, tagName: "span", properties: {} }];
    }

    // Inline styles and (Tailwind) classes could overlay or disguise app UI.
    if (node.properties) {
        delete node.properties.style;
        delete node.properties.className;
    }
    return [node];
}

function sanitizeChildren(parent: HastNode): void {
    if (parent.children) {
        parent.children = parent.children.flatMap(sanitizeNode);
    }
}

/**
 * Rehype plugin that strips active and page-altering HTML from markdown that
 * comes from the LLM or from uploaded documents. MDC already removes event
 * handlers and `javascript:` URLs, but still renders raw iframes, forms,
 * `<style>` and `<meta http-equiv="refresh">`.
 */
function rehypeSanitize() {
    return (tree: HastNode) => {
        sanitizeChildren(tree);
    };
}

/**
 * Parser options for rendering untrusted markdown with `<MDC>` or
 * `parseMarkdown`. Runs after MDC's built-in `rehype-raw`.
 */
export const safeMarkdownParserOptions: MDCParseOptions = {
    rehype: {
        plugins: {
            sanitize: { instance: rehypeSanitize },
        },
    },
};
