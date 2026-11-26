import Link from "next/link";
import type { ReactNode } from "react";

// Safe Markdown renderer for the assistant's replies in the help chat.
//
// Everything is built as React elements: text nodes are escaped by React, so
// no HTML from the model ever reaches the DOM, there is no
// dangerouslySetInnerHTML and nothing here can execute. Supported syntax is
// deliberately small: paragraphs, bold, italic, inline code, lists and
// headings sized for a chat bubble. Anything else (including links and raw
// HTML) stays visible as plain text.

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "paragraph"; text: string };

const HEADING_PATTERN = /^(#{1,6})\s+(.*)$/;
const UNORDERED_ITEM_PATTERN = /^\s*[-*+]\s+(.*)$/;
const ORDERED_ITEM_PATTERN = /^\s*\d+[.)]\s+(.*)$/;
const INDENTED_PATTERN = /^\s+\S/;

// Splits the source into blocks. Blank lines separate blocks; a heading or a
// list marker opens its own block; indented lines continue the list item.
export function parseHelpMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  function flushParagraph() {
    if (paragraph.length === 0) return;
    blocks.push({ type: "paragraph", text: paragraph.join("\n") });
    paragraph = [];
  }

  function flushList() {
    if (!list) return;
    blocks.push({ type: "list", ordered: list.ordered, items: list.items });
    list = null;
  }

  function flushAll() {
    flushParagraph();
    flushList();
  }

  for (const line of lines) {
    if (line.trim() === "") {
      flushAll();
      continue;
    }

    const heading = HEADING_PATTERN.exec(line.trim());
    if (heading) {
      flushAll();
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: heading[2].trim(),
      });
      continue;
    }

    const orderedItem = ORDERED_ITEM_PATTERN.exec(line);
    const unorderedItem = UNORDERED_ITEM_PATTERN.exec(line);
    const item = orderedItem ?? unorderedItem;
    if (item) {
      flushParagraph();
      const ordered = orderedItem !== null;
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push(item[1]);
      continue;
    }

    if (list && INDENTED_PATTERN.test(line)) {
      list.items[list.items.length - 1] += `\n${line.trim()}`;
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  flushAll();
  return blocks;
}

// Inline formatting: **bold**, *italic* and `code`. Unmatched markers stay
// visible as text, which is what a half-streamed message needs.
// Only this fixed internal destination may become a link. The model never
// supplies a URL; the phrase is replaced by a validated Next.js route.
const CHAT_DATOS_LABEL = "Hablá con tus datos";
const CHAT_DATOS_HREF = "/chat-datos";
const INLINE_PATTERN = new RegExp(
  `(\\*\\*[^*]+\\*\\*|\\*[^*\\n]+\\*|\`[^\`]+\`|${CHAT_DATOS_LABEL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
  "g",
);

function renderInline(text: string, keyPrefix: string, chatDatosEnabled: boolean): ReactNode[] {
  const nodes: ReactNode[] = [];
  INLINE_PATTERN.lastIndex = 0;
  let cursor = 0;
  let order = 0;
  let match: RegExpExecArray | null;

  function pushText(value: string) {
    if (value.length > 0) nodes.push(value);
  }

  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    pushText(text.slice(cursor, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${order}`;
    if (token === CHAT_DATOS_LABEL) {
      if (chatDatosEnabled) {
        nodes.push(
          <Link
            key={key}
            href={CHAT_DATOS_HREF}
            className="font-medium text-brand-green-700 underline underline-offset-2 hover:text-brand-green-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {CHAT_DATOS_LABEL}
          </Link>,
        );
      } else {
        pushText(CHAT_DATOS_LABEL);
      }
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={key} className="rounded bg-surface px-1 font-mono text-[0.9em]">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    order += 1;
    cursor = match.index + token.length;
  }

  pushText(text.slice(cursor));
  return nodes;
}

// Headings stay chat-sized: a styled paragraph instead of h1-h6, so a reply
// never breaks the page's heading outline or dwarfs the surrounding text.
function renderBlock(block: Block, index: number, chatDatosEnabled: boolean): ReactNode {
  const key = String(index);
  switch (block.type) {
    case "heading":
      return (
        <p
          key={key}
          className={
            block.level <= 2
              ? "text-sm font-semibold text-fg"
              : "text-xs font-semibold text-fg-muted"
          }
        >
          {renderInline(block.text, key, chatDatosEnabled)}
        </p>
      );
    case "list": {
      const items = block.items.map((item, itemIndex) => (
        <li key={`${key}-${itemIndex}`} className="whitespace-pre-line">
          {renderInline(item, `${key}-${itemIndex}`, chatDatosEnabled)}
        </li>
      ));
      return block.ordered ? (
        <ol key={key} className="list-decimal space-y-1 pl-5">
          {items}
        </ol>
      ) : (
        <ul key={key} className="list-disc space-y-1 pl-5">
          {items}
        </ul>
      );
    }
    case "paragraph":
      return (
        <p key={key} className="whitespace-pre-line">
          {renderInline(block.text, key, chatDatosEnabled)}
        </p>
      );
  }
}

type HelpMarkdownProps = {
  content: string;
  chatDatosEnabled?: boolean;
};

export function HelpMarkdown({ content, chatDatosEnabled = false }: HelpMarkdownProps) {
  const blocks = parseHelpMarkdown(content);
  if (blocks.length === 0) return null;
  return (
    <div className="space-y-2 leading-relaxed">
      {blocks.map((block, index) => renderBlock(block, index, chatDatosEnabled))}
    </div>
  );
}
