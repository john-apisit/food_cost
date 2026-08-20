import { ref } from 'vue'

export interface ToastMessage {
  id: number
  type: 'success' | 'error' | 'info'
  text: string
}

const toasts = ref<ToastMessage[]>([])
let nextId = 1

export function useToast() {
  const show = (text: string, type: ToastMessage['type'] = 'info', timeout = 3500) => {
    const id = nextId++
    toasts.value.push({ id, type, text })
    window.setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, timeout)
  }

  const success = (text: string) => show(text, 'success')
  const error = (text: string) => show(text, 'error', 5000)
  const info = (text: string) => show(text, 'info')
  const dismiss = (id: number) => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return { toasts, show, success, error, info, dismiss }
}
