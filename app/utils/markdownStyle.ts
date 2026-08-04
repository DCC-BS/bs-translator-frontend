/**
 * Styles inlined into the standalone HTML document produced by
 * `markdownToHtml`. Kept as a TS string rather than a `.css?raw` import:
 * Nuxt appends `?inline&used` to css ids during the SSR build, which turns
 * the raw query into a parse error.
 */
export const markdownStyle = `
table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.5em 0;
    overflow-x: auto;
    display: block;
}

table th {
    background-color: rgba(0, 0, 0, 0.05);
    font-weight: 600;
    text-align: left;
    padding: 0.6em 1em;
    border: 1px solid #e5e7eb;
}

table td {
    padding: 0.6em 1em;
    border: 1px solid #e5e7eb;
}

table tr:nth-child(even) {
    background-color: rgba(0, 0, 0, 0.025);
}

/* Horizontal Rule */
hr {
    border: 0;
    border-top: 1px solid #e5e7eb;
    margin: 2em 0;
}
`;
