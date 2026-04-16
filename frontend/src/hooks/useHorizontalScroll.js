import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * useHorizontalScroll hook
 * - Manages horizontal scrolling for containers
 * - Provides scroll handlers and button visibility states
 */
const useHorizontalScroll = (scrollAmount = 300) => {
  const scrollRef = useRef(null);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(false);

  const updateButtons = useCallback(() => {
    const element = scrollRef.current;
    if (element) {
      const { scrollLeft, clientWidth, scrollWidth } = element;
      setShowLeftButton(scrollLeft > 0);
      // Using a small threshold (1px) to handle sub-pixel rounding issues
      setShowRightButton(scrollLeft + clientWidth < scrollWidth - 1);
    }
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    updateButtons();
    element.addEventListener('scroll', updateButtons);
    window.addEventListener('resize', updateButtons);

    // MutationObserver to handle dynamic content changes
    const observer = new MutationObserver(updateButtons);
    observer.observe(element, { childList: true, subtree: true });

    return () => {
      element.removeEventListener('scroll', updateButtons);
      window.removeEventListener('resize', updateButtons);
      observer.disconnect();
    };
  }, [updateButtons]);

  const scroll = (direction) => {
    const element = scrollRef.current;
    if (element) {
      element.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return {
    scrollRef,
    showLeftButton,
    showRightButton,
    scroll,
    updateButtons
  };
};

export default useHorizontalScroll;
