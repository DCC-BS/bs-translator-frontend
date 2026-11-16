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

/**
 * The only properties (hast names) kept per tag; everything else is dropped.
 * An allowlist because MDC turns some props into Vue bindings: `v-bind`
 * (e.g. `{"innerHTML": "..."}`), `:prop`, `@event`, `v-on:`, `#slot`.
 * `class` and `style` are not allowed: they could overlay or disguise app UI.
 * Headings get their `id` from MDC after this plugin runs.
 */
const ALLOWED_PROPERTIES: Record<string, ReadonlySet<string>> = {
    a: new Set(["href"]),
    // Set by MDC on the `<code>` of code blocks: keeps it unmapped.
    code: new Set(["__ignoreMap"]),
    col: new Set(["span"]),
    colgroup: new Set(["span"]),
    details: new Set(["open"]),
    img: new Set(["src", "alt", "width", "height"]),
    input: new Set(["type", "checked", "disabled"]),
    ol: new Set(["start", "type"]),
    pre: new Set(["language"]),
    td: new Set(["align", "colSpan", "rowSpan"]),
    th: new Set(["align", "colSpan", "rowSpan"]),
};

/** Allowed on every allowed tag. */
const GLOBAL_PROPERTIES: ReadonlySet<string> = new Set(["title"]);

function allowedProperties(
    tagName: string,
    properties: Record<string, unknown> = {},
): Record<string, unknown> {
    const allowed = ALLOWED_PROPERTIES[tagName];
    return Object.fromEntries(
        Object.entries(properties).filter(
            ([name]) => GLOBAL_PROPERTIES.has(name) || !!allowed?.has(name),
        ),
    );
}

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
            {
                ...node,
                properties: {
                    ...allowedProperties("input", node.properties),
                    disabled: true,
                },
                children: [],
            },
        ];
    }

    if (BLOCKED_TAGS.has(node.tagName)) {
        return [];
    }

    sanitizeChildren(node);

    if (!ALLOWED_TAGS.has(node.tagName)) {
        return [{ ...node, tagName: "span", properties: {} }];
    }

    node.properties = allowedProperties(node.tagName, node.properties);
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
 * `<style>`, `<meta http-equiv="refresh">` and binding props like `v-bind`.
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

/**
 * Keeps MDC from reading a leading `---` block as front matter: its data is
 * trusted by the renderer (e.g. `mdc.components` maps `p` to `iframe`), so
 * untrusted markdown must not set it. The block is rendered as markdown
 * instead. Apply before passing untrusted markdown to `<MDC>` or
 * `parseMarkdown`.
 */
export function disableFrontMatter(markdown: string): string {
    return markdown.startsWith("---") ? `\n${markdown}` : markdown;
}
