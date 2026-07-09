import { useState } from 'react';

const useDevice = () => {
  // Always true for this mobile-only build
  const [isMobile] = useState(true);
  return { isMobile };
};

export default useDevice;

