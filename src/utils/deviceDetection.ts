/**
 * 檢測當前裝置是否為移動裝置
 * @returns {boolean} 如果是移動裝置返回 true，否則返回 false
 */
export const isMobileDevice = (): boolean => {
  // 檢查 userAgent
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    'android',
    'webos',
    'iphone',
    'ipad',
    'ipod',
    'blackberry',
    'windows phone',
    'mobile'
  ];
  
  const isMobileUserAgent = mobileKeywords.some(keyword => 
    userAgent.includes(keyword)
  );

  // 檢查螢幕寬度（小於 768px 視為移動裝置）
  const isMobileWidth = window.innerWidth < 768;

  // 檢查觸控支援
  const hasTouchSupport = 
    'ontouchstart' in window || 
    navigator.maxTouchPoints > 0;

  // 如果 userAgent 明確指出是移動裝置，直接返回 true
  if (isMobileUserAgent) return true;

  // 否則同時檢查螢幕寬度和觸控支援
  return isMobileWidth && hasTouchSupport;
};

