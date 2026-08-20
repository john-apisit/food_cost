import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/main.css'
import { useAuth } from './composables/useAuth'

const app = createApp(App)
app.use(createPinia())
app.use(router)

const { initAuth } = useAuth()
initAuth().then(() => {
  app.mount('#app')
})
