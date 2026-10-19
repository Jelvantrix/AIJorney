import React, { useEffect, useState } from 'react';
import { applyTheme, getStoredTheme } from '@noevix/design-system';
import { MarketingPage } from './pages/HomePage.tsx';
import { ProductsPage } from './pages/ProductsPage.tsx';
import { ProductDetailPage } from './pages/ProductDetailPage.tsx';
import { AuraLab } from './pages/AuraLab.tsx';
import { MarketingNav } from './components/MarketingNav.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { getProduct } from '@noevix/products';

export default function App() {
  const [route, setRoute] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      if (p.startsWith('/products/')) return p;
      if (p === '/products') return '/products';
      if (p === '/lab') return '/lab';
    }
    return '/';
  });

  const [isAuthOpen, setAuthOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    applyTheme(getStoredTheme());
    const updateTheme = () =>
      setTheme(document.documentElement.classList.contains('light') ? 'light' : 'dark');
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onPop = () => {
      setRoute(window.location.pathname);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (to: string) => {
    window.history.pushState({}, '', to);
    setRoute(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const launchChat = () => {
    const chatProd = getProduct('chat');
    window.location.href = chatProd?.url || '/chat';
  };

  const renderContent = () => {
    if (route.startsWith('/products/')) {
      const slug = route.replace('/products/', '');
      return (
        <ProductDetailPage
          slug={slug}
          onBack={() => navigate('/products')}
          onLaunch={launchChat}
        />
      );
    }
    if (route === '/products') {
      return (
        <ProductsPage
          onLaunchProduct={(slug) => {
            const p = getProduct(slug);
            if (p) window.location.href = p.url;
          }}
          onNavigateDetail={(slug) => navigate(`/products/${slug}`)}
        />
      );
    }
    if (route === '/lab') {
      return <AuraLab onBack={() => navigate('/')} />;
    }
    return (
      <MarketingPage
        onNavigateProducts={() => navigate('/products')}
        onNavigateProductDetail={(slug) => navigate(`/products/${slug}`)}
        onNavigateLab={() => navigate('/lab')}
      />
    );
  };

  return (
    <div className="relative min-h-screen w-full" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <MarketingNav
        theme={theme}
        onLaunch={launchChat}
        onSignIn={() => setAuthOpen(true)}
        onLab={() => navigate('/lab')}
        onProducts={() => navigate('/products')}
      />

      <main>{renderContent()}</main>

      <AuthModal isOpen={isAuthOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
