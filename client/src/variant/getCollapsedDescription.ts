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

/** How many leading blocks stay visible while collapsed: the first, plus the one after a lone heading. */
function countCollapsedBlocks(blocks: string[]): number {
    const [first, second] = blocks;

    if (first === undefined) {
        return 0;
    }

    const isHeading = headingPattern.test(first) && !first.includes("\n");

    return isHeading && second !== undefined ? 2 : 1;
}

/**
 * The part of a description shown while it is collapsed: its first block, plus the block after
 * it when the first is a heading (a heading alone says too little). The Admin description editor
 * previews with this too, so what it shows is what the variant page will.
 */
export function getCollapsedDescription(source: string): string {
    const blocks = splitBlocks(source);

    return blocks.slice(0, countCollapsedBlocks(blocks)).join("\n\n");
}

/**
 * Whether a description has anything to hide behind "Show more": it has more blocks than the
 * collapsed part. Comparing the texts instead would be fooled by line endings and indentation.
 */
export function isCollapsible(source: string): boolean {
    const blocks = splitBlocks(source);

    return blocks.length > countCollapsedBlocks(blocks);
}
