function emptyProgress() {
  return { phase: "starting", partialText: "", activeTools: [] };
}

export function projectChildEvent(current, event) {
  const progress = current ?? emptyProgress();

  if (event.type === "message_update" && event.message?.role === "assistant") {
    const content = Array.isArray(event.message.content) ? event.message.content : [];
    const text = [...content].reverse().find((part) => part.type === "text")?.text;
    const isThinking = content.some((part) => part.type === "thinking");
    const next = {
      ...progress,
      phase: text ? "responding" : isThinking ? "thinking" : progress.phase,
      partialText: text ?? "",
    };
    return { progress: next, changed: true, immediate: false };
  }

  if (event.type === "tool_execution_start") {
    const tool = {
      id: event.toolCallId,
      name: event.toolName,
      args: event.args ?? {},
    };
    return {
      progress: {
        ...progress,
        phase: "tool",
        partialText: "",
        activeTools: [...progress.activeTools.filter((item) => item.id !== tool.id), tool],
      },
      changed: true,
      immediate: true,
    };
  }

  if (event.type === "tool_execution_end") {
    const activeTools = progress.activeTools.filter((tool) => tool.id !== event.toolCallId);
    return {
      progress: {
        ...progress,
        phase: activeTools.length > 0 ? "tool" : "thinking",
        activeTools,
      },
      changed: true,
      immediate: true,
    };
  }

  if (event.type === "message_end") {
    return {
      progress: { ...progress, partialText: "" },
      changed: progress.partialText.length > 0,
      immediate: true,
    };
  }

  return { progress, changed: false, immediate: false };
}
