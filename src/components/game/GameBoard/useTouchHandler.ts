import { useState, useEffect, useCallback } from 'react';

interface TouchPosition {
  x: number;
  y: number;
}

interface CellPosition {
  row: number;
  col: number;
}

export const useTouchHandler = (onCellRightClick: (row: number, col: number) => void) => {
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [longPressCell, setLongPressCell] = useState<CellPosition | null>(null);
  const [touchStartPos, setTouchStartPos] = useState<TouchPosition | null>(null);
  const [touchMoved, setTouchMoved] = useState(false);
  const [flaggedCell, setFlaggedCell] = useState<CellPosition | null>(null);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  // 长按开始
  const handleTouchStart = useCallback((e: React.TouchEvent, row: number, col: number) => {
    e.preventDefault();
    
    const touch = e.touches[0];
    if (touch) {
      setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    }
    
    setIsLongPressing(false);
    setTouchMoved(false);
    setLongPressCell({ row, col });
    
    const timer = setTimeout(() => {
      if (!touchMoved) {
        setIsLongPressing(true);
        setLongPressCell(null);
        
        // 触发震动反馈
        if (navigator.vibrate) {
          navigator.vibrate([50, 20, 50]);
        }
        
        onCellRightClick(row, col);
        
        // 显示成功插旗反馈
        setFlaggedCell({ row, col });
        setTimeout(() => setFlaggedCell(null), 500);
      }
    }, 300);
    
    setLongPressTimer(timer);
  }, [onCellRightClick, touchMoved]);

  // 长按结束
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    setLongPressCell(null);
    setTouchStartPos(null);
    setTouchMoved(false);
    
    setTimeout(() => {
      setIsLongPressing(false);
    }, 100);
  }, [longPressTimer]);

  // 手指移动检测
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    if (touchStartPos && e.touches[0]) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPos.x);
      const deltaY = Math.abs(touch.clientY - touchStartPos.y);
      const moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (moveDistance > 10) {
        setTouchMoved(true);
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          setLongPressTimer(null);
        }
        setLongPressCell(null);
      }
    }
  }, [touchStartPos, longPressTimer]);

  const handleTouchCancel = useCallback((e: React.TouchEvent) => {
    handleTouchEnd(e);
  }, [handleTouchEnd]);

  return {
    longPressCell,
    flaggedCell,
    isLongPressing,
    touchMoved,
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
    handleTouchCancel
  };
};