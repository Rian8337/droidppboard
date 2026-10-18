import ReactMarkdown from "react-markdown";
import styles from "./Markdown.module.css";

export interface MarkdownProps {
    source: string;
}

/**
 * Renders user-written Markdown. Raw HTML in the source is dropped (`skipHtml`), never rendered or executed, and
 * links open in a new tab without access to this page.
 */
export function Markdown({ source }: MarkdownProps) {
    return (
        <div className={styles.markdown}>
            <ReactMarkdown
                skipHtml
                components={{
                    a: ({ node: _node, ...props }) => (
                        <a {...props} target="_blank" rel="noopener noreferrer" />
                    ),
                }}
            >
                {source}
            </ReactMarkdown>
        </div>
    );
}
