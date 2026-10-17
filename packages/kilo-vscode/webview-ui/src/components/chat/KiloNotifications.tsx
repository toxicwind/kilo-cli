import { Component, Show, createMemo, createSignal } from "solid-js"
import { Button } from "@kappacode/kappa-ui/button"
import { IconButton } from "@kappacode/kappa-ui/icon-button"
import { Icon } from "@kappacode/kappa-ui/icon"
import { useNotifications } from "../../context/notifications"
import { useVSCode } from "../../context/vscode"

export const KiloNotifications: Component = () => {
  const { filteredNotifications, dismiss } = useNotifications()
  const vscode = useVSCode()
  const [index, setIndex] = createSignal(0)

  const items = filteredNotifications
  const total = () => items().length
  const safeIndex = () => Math.min(index(), Math.max(0, total() - 1))
  const current = createMemo(() => (total() === 0 ? undefined : items()[safeIndex()]))

  const prev = () => setIndex((i) => (i - 1 + total()) % total())
  const next = () => setIndex((i) => (i + 1) % total())

  const handleAction = (url: string) => {
    vscode.postMessage({ type: "openExternal", url })
  }

  const handleDismiss = () => {
    const n = current()
    if (!n) return
    dismiss(n.id)
    setIndex((i) => Math.min(i, Math.max(0, total() - 2)))
  }

  return (
    <Show when={total() > 0}>
      <div class="kappa-notifications">
        <div class="kappa-notifications-card">
          <div class="kappa-notifications-header">
            <span class="kappa-notifications-title">{current()?.title}</span>
            <IconButton size="small" variant="ghost" icon="close" onClick={handleDismiss} title="Dismiss" />
          </div>
          <p class="kappa-notifications-message">{current()?.message}</p>
          <div class="kappa-notifications-footer">
            <Show when={total() > 1}>
              <div class="kappa-notifications-nav">
                <button class="kappa-notifications-nav-btn" onClick={prev} title="Previous">
                  <Icon name="arrow-left" size="small" />
                </button>
                <span class="kappa-notifications-nav-count">
                  {safeIndex() + 1} / {total()}
                </span>
                <button class="kappa-notifications-nav-btn" onClick={next} title="Next">
                  <Icon name="arrow-right" size="small" />
                </button>
              </div>
            </Show>
            <Show when={current()?.action}>
              {(action) => (
                <Button variant="primary" size="small" onClick={() => handleAction(action().actionURL)}>
                  {action().actionText}
                </Button>
              )}
            </Show>
          </div>
        </div>
      </div>
    </Show>
  )
}
