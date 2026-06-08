import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

const conversationsDir = ".opencode/conversations"

export const SaveConversationPlugin = async ({ project, directory, $ }) => {
  let messages = []
  let sessionStart = null
  let sessionLabel = ""

  async function flush() {
    if (messages.length === 0) return
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10)
    const timeStr = date.toISOString().slice(11, 19).replace(/:/g, "-")
    const dir = join(directory, conversationsDir)
    await mkdir(dir, { recursive: true })
    const filePath = join(dir, `${dateStr}_${timeStr}.md`)
    const content = messages.join("\n") + "\n"
    await writeFile(filePath, content, "utf-8")
    messages = []
  }

  return {
    event: async ({ event }) => {
      if (event.type === "session.created") {
        sessionStart = new Date()
        sessionLabel = event.session?.label || event.session?.id || "untitled"
        messages.push(`# ${sessionLabel}\n\nIniciada em: ${sessionStart.toLocaleString("pt-BR")}\n\n---\n`)
      }

      if (event.type === "session.idle" || event.type === "session.deleted") {
        if (messages.length > 0) {
          const date = new Date()
          messages.push(`\n---\n_Finalizada em: ${date.toLocaleString("pt-BR")}_\n`)
          await flush()
        }
      }

      if (event.type === "message.updated") {
        const msg = event.message
        if (!msg) return
        const role = msg.role === "user" ? "**Você**" : "**Assistente**"
        const text = msg.content?.map?.(c => c.text).filter(Boolean).join("\n") || msg.text || ""
        if (text) {
          messages.push(`### ${role} (${new Date().toLocaleTimeString("pt-BR")})\n\n${text}\n`)
        }
      }

      if (event.type === "message.part.updated") {
        const part = event.part
        if (!part || !part.text || part.type !== "text") return
        if (messages.length > 0) {
          const lastMsg = messages[messages.length - 1]
          if (lastMsg.startsWith("### **Assistente**")) {
            messages[messages.length - 1] = `### **Assistente** (${new Date().toLocaleTimeString("pt-BR")})\n\n${part.text}\n`
          }
        }
      }
    },
  }
}
