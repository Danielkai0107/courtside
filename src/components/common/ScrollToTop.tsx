import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop 組件
 * 當路由變化時自動將頁面滾動到頂部
 */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // 當路徑改變時，滾動到頂部
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default ScrollToTop;

