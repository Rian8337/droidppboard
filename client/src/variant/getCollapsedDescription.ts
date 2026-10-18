const fencePattern = /^\s{0,3}(```|~~~)/;
const headingPattern = /^\s{0,3}#{1,6}(\s|$)/;

/** Splits Markdown at its blank lines, except inside fenced code, which stays in one piece. */
function splitBlocks(source: string): string[] {
    const blocks: string[] = [];
    let current: string[] = [];
    let isInFence = false;

    for (const line of source.split(/\r?\n/)) {
        if (fencePattern.test(line)) {
            isInFence = !isInFence;
        }

        if (!isInFence && line.trim() === "") {
            if (current.length > 0) {
                blocks.push(current.join("\n"));
                current = [];
            }

            continue;
        }

        current.push(line);
    }

    if (current.length > 0) {
        blocks.push(current.join("\n"));
    }

    return blocks;
}

/**
 * The part of a description shown while it is collapsed: its first block, plus the block after
 * it when the first is a heading (a heading alone says too little). The Admin description editor
 * previews with this too, so what it shows is what the variant page will.
 */
export function getCollapsedDescription(source: string): string {
    const [first, second] = splitBlocks(source);

    if (first === undefined) {
        return "";
    }

    const isHeading = headingPattern.test(first) && !first.includes("\n");

    return isHeading && second !== undefined ? `${first}\n\n${second}` : first;
}
