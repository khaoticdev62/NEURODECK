import React, { useRef } from "react";
import { useStore } from "zustand";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAppStore, ChatMessage } from "./store";

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
                {/* HTML content will be rendered here. For safety we use dangerouslySetInnerHTML after worker parses markdown */}
                <div dangerouslySetInnerHTML={{ __html: msg.content }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
