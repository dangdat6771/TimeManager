import { renderSidebar } from './Sidebar.js';

export function renderLayout(pageContent) {
  const app = document.getElementById('app');

  // Build layout
  const layout = document.createElement('div');
  layout.className = 'page-layout';

  // Sidebar
  layout.appendChild(renderSidebar());

  // Main content
  const main = document.createElement('main');
  main.className = 'main-content page-enter';
  main.id = 'main-content';

  if (typeof pageContent === 'string') {
    main.innerHTML = pageContent;
  } else if (pageContent instanceof HTMLElement) {
    main.appendChild(pageContent);
  }

  layout.appendChild(main);
  app.innerHTML = '';
  app.appendChild(layout);

  return main;
}
