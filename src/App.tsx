import React, { useEffect, useState } from 'react';
import CompanyApp from '../apps/company/src/App.tsx';
import ChatApp from '../apps/chat/src/App.tsx';

export default function App() {
  const [pathname, setPathname] = useState<string>(() => {
    return typeof window !== 'undefined' ? window.location.pathname : '/';
  });

  useEffect(() => {
    const onPop = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Intercept local navigations to /chat or back to / for instant SPA transitions
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (!target) return;
      const href = target.getAttribute('href');
      if (href && (href === '/chat' || href.startsWith('/chat?') || href === '/' || href.startsWith('/products'))) {
        e.preventDefault();
        window.history.pushState({}, '', href);
        setPathname(window.location.pathname);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, []);

  if (pathname.startsWith('/chat')) {
    return <ChatApp />;
  }

  return <CompanyApp />;
}
