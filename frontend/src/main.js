import './styles/index.css';
import './styles/animations.css';
import { authStore } from './store/auth.js';
import { router } from './router/index.js';

// Initialize auth state from localStorage
authStore.init();

// Boot router
router.init();
