import React, { useRef } from "react";
import { useStore } from "zustand";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAppStore, ChatMessage } from "./store";

function sanitizeRenderedHtml(html: string): string {
  if (!html) return "";

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const allowedTags = new Set([
      "a", "span", "div", "p", "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "pre", "code", "em", "strong", "br", "img",
      "table", "thead", "tbody", "tr", "th", "td", "blockquote", "hr"
    ]);
    const allowedAttrs = new Set(["class", "href", "src", "alt", "title", "target", "style"]);

    const cleanNode = (node: Node) => {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (child.nodeType !== Node.ELEMENT_NODE) {
          continue;
        }

        const el = child as Element;
        const tagName = el.tagName.toLowerCase();
        if (!allowedTags.has(tagName)) {
          if (["script", "style", "iframe", "object", "embed", "noscript", "meta", "link"].includes(tagName)) {
            el.remove();
            continue;
          }

          cleanNode(el);
          while (el.firstChild) {
            el.parentNode?.insertBefore(el.firstChild, el);
          }
          el.remove();
          continue;
        }

        for (const attr of Array.from(el.attributes)) {
          const name = attr.name.toLowerCase();
          const value = attr.value.trim().toLowerCase();
          if (!allowedAttrs.has(name) || name.startsWith("on")) {
            el.removeAttribute(attr.name);
          } else if ((name === "href" || name === "src") && (value.startsWith("javascript:") || value.startsWith("data:") || value.startsWith("vbscript:"))) {
            el.removeAttribute(attr.name);
          }
        }

        cleanNode(el);
      }
    };

    cleanNode(doc.body);
    return doc.body.innerHTML;
  } catch {
    return html.replace(/<[^>]*>/g, "");
  }
}

export const VirtualChat: React.FC = () => {
  // Bind to our Zustand vanilla store
  const messages = useStore(useAppStore, (state) => state.chatMessages);
  
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // Default estimated height of a message
  });

  return (
    <div
      ref={parentRef}
      style={{
        height: "100%",
        width: "100%",
        overflowY: "auto",
        contain: "strict",
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const msg = messages[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className={`chat-message ${msg.role}`}>
                <div dangerouslySetInnerHTML={{ __html: sanitizeRenderedHtml(msg.content) }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
