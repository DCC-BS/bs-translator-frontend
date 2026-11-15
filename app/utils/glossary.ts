export type GlossaryTerm = {
    term: string;
    description: string;
};

/**
 * Splits one "term: description" entry on its first ":" only, so a
 * description may itself contain ":" (e.g. "URL: https://example.com").
 */
function parseEntry(entry: string): GlossaryTerm | undefined {
    const separatorIndex = entry.indexOf(":");
    if (separatorIndex < 0) {
        return undefined;
    }

    const term = entry.slice(0, separatorIndex).trim();
    const description = entry.slice(separatorIndex + 1).trim();
    return term && description ? { term, description } : undefined;
}

function parseEntries(entries: string[]): GlossaryTerm[] {
    return entries
        .map(parseEntry)
        .filter((entry): entry is GlossaryTerm => entry !== undefined);
}

/**
 * Parses a glossary serialized by `serializeGlossary`: one "term: description"
 * entry per line. Lines keep any ";" or ":" inside the description intact.
 */
export function parseGlossary(value: string): GlossaryTerm[] {
    return parseEntries(value.split(/\r?\n/));
}

/**
 * Parses the old "term: description; term: description" format that was
 * stored in the glossary cookie. Only used to migrate that value once.
 */
export function parseLegacyGlossary(value: string): GlossaryTerm[] {
    return parseEntries(value.split(";"));
}

/**
 * Serializes complete glossary entries as one "term: description" per line.
 * This string is both the stored value and what is sent to the backend.
 */
export function serializeGlossary(entries: GlossaryTerm[]): string {
    return entries
        .map(({ term, description }) => ({
            term: term.trim(),
            description: description.trim(),
        }))
        .filter(({ term, description }) => term && description)
        .map(({ term, description }) => `${term}: ${description}`)
        .join("\n");
}
