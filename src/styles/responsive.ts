import styled, { css } from 'styled-components';

// 响应式断点
export const breakpoints = {
  mobile: '480px',
  tablet: '768px',
  desktop: '1024px',
  large: '1200px'
};

// 媒体查询帮助函数
export const media = {
  mobile: (styles: any) => css`
    @media (max-width: ${breakpoints.mobile}) {
      ${styles}
    }
  `,
  tablet: (styles: any) => css`
    @media (max-width: ${breakpoints.tablet}) {
      ${styles}
    }
  `,
  desktop: (styles: any) => css`
    @media (min-width: ${breakpoints.desktop}) {
      ${styles}
    }
  `,
  between: (min: string, max: string) => (styles: any) => css`
    @media (min-width: ${min}) and (max-width: ${max}) {
      ${styles}
    }
  `
};

// 响应式容器
export const ResponsiveContainer = styled.div<{ $padding?: boolean }>`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: ${props => props.$padding ? '0 20px' : '0'};

  ${media.tablet(css`
    padding: ${props => props.$padding ? '0 15px' : '0'};
  `)}

  ${media.mobile(css`
    padding: ${props => props.$padding ? '0 10px' : '0'};
  `)}
`;

// 灵活的网格系统
export const FlexGrid = styled.div<{
  $columns?: number;
  $gap?: string;
  $responsive?: boolean;
}>`
  display: grid;
  grid-template-columns: repeat(${props => props.$columns || 1}, 1fr);
  gap: ${props => props.$gap || '20px'};

  ${props => props.$responsive && media.tablet(css`
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
  `)}

  ${props => props.$responsive && media.mobile(css`
    grid-template-columns: 1fr;
    gap: 10px;
  `)}
`;

// 响应式游戏板容器
export const GameBoardContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 20px;

  ${media.tablet(css`
    padding: 15px;
    min-height: 350px;
  `)}

  ${media.mobile(css`
    padding: 10px;
    min-height: 300px;
    
    /* 确保在小屏幕上不会溢出 */
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  `)}
`;

// 响应式按钮
export const ResponsiveButton = styled.button<{
  $primary?: boolean;
  $fullWidth?: boolean;
  $size?: 'small' | 'medium' | 'large';
}>`
  padding: ${props => {
    switch (props.$size) {
      case 'small': return '8px 16px';
      case 'large': return '16px 32px';
      default: return '12px 24px';
    }
  }};
  
  font-size: ${props => {
    switch (props.$size) {
      case 'small': return '14px';
      case 'large': return '18px';
      default: return '16px';
    }
  }};
  
  background: ${props => props.$primary ? '#4CAF50' : '#f0f0f0'};
  color: ${props => props.$primary ? 'white' : '#333'};
  border: 2px outset ${props => props.$primary ? '#4CAF50' : '#c0c0c0'};
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px; /* 符合触摸友好的最小高度 */
  
  width: ${props => props.$fullWidth ? '100%' : 'auto'};

  &:hover:not(:disabled) {
    background: ${props => props.$primary ? '#45a049' : '#e0e0e0'};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: #cccccc;
    cursor: not-allowed;
    opacity: 0.6;
  }

  ${media.tablet(css`
    padding: 14px 28px;
    font-size: 16px;
    min-height: 48px;
  `)}

  ${media.mobile(css`
    padding: 16px 32px;
    font-size: 16px;
    width: 100%;
    max-width: 300px;
    min-height: 52px; /* 更大的触摸目标 */
  `)}
`;

// 响应式卡片
export const ResponsiveCard = styled.div<{ $padding?: boolean }>`
  background: #ffffff;
  border: 2px inset #c0c0c0;
  border-radius: 8px;
  padding: ${props => props.$padding !== false ? '20px' : '0'};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  ${media.tablet(css`
    padding: ${props => props.$padding !== false ? '16px' : '0'};
    border-radius: 6px;
  `)}

  ${media.mobile(css`
    padding: ${props => props.$padding !== false ? '12px' : '0'};
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  `)}
`;

// 响应式文本
export const ResponsiveText = styled.div<{
  $size?: 'small' | 'medium' | 'large' | 'xlarge';
  $weight?: 'normal' | 'bold';
  $align?: 'left' | 'center' | 'right';
}>`
  font-size: ${props => {
    switch (props.$size) {
      case 'small': return '14px';
      case 'large': return '20px';
      case 'xlarge': return '24px';
      default: return '16px';
    }
  }};
  
  font-weight: ${props => props.$weight || 'normal'};
  text-align: ${props => props.$align || 'left'};
  line-height: 1.5;

  ${media.tablet(css`
    font-size: ${props => {
      switch (props.$size) {
        case 'small': return '13px';
        case 'large': return '18px';
        case 'xlarge': return '22px';
        default: return '15px';
      }
    }};
  `)}

  ${media.mobile(css`
    font-size: ${props => {
      switch (props.$size) {
        case 'small': return '12px';
        case 'large': return '16px';
        case 'xlarge': return '20px';
        default: return '14px';
      }
    }};
    line-height: 1.4;
  `)}
`;

// 移动端友好的输入框
export const ResponsiveInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  border: 2px inset #c0c0c0;
  border-radius: 4px;
  background: #ffffff;
  min-height: 44px;

  &:focus {
    outline: none;
    border-color: #4CAF50;
    box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
  }

  ${media.mobile(css`
    font-size: 16px; /* 防止iOS Safari缩放 */
    min-height: 48px;
    padding: 14px 18px;
  `)}
`;

// 水平滚动容器（适用于移动端的表格或列表）
export const HorizontalScrollContainer = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  width: 100%;

  ${media.mobile(css`
    /* 在移动端显示滚动提示 */
    &::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 20px;
      background: linear-gradient(to right, transparent, rgba(0, 0, 0, 0.1));
      pointer-events: none;
    }
  `)}
`;

// 安全区域适配（针对有刘海屏的设备）
export const SafeAreaContainer = styled.div`
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
`;

// 触摸友好的游戏单元格
export const TouchFriendlyCell = styled.button<{
  $size?: number;
  $revealed?: boolean;
  $flagged?: boolean;
  $mine?: boolean;
}>`
  width: ${props => props.$size || 32}px;
  height: ${props => props.$size || 32}px;
  min-width: 44px; /* 确保触摸友好 */
  min-height: 44px;
  
  border: 2px outset #c0c0c0;
  background: ${props => {
    if (props.$flagged) return '#ffeb3b';
    if (!props.$revealed) return '#c0c0c0';
    if (props.$mine) return '#ff0000';
    return '#e0e0e0';
  }};
  
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  user-select: none;
  
  /* 禁用移动端的默认触摸行为 */
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  &:active {
    border-style: inset;
    background: #d0d0d0;
  }

  ${media.tablet(css`
    min-width: 46px;
    min-height: 46px;
    font-size: 16px;
  `)}

  ${media.mobile(css`
    min-width: 48px;
    min-height: 48px;
    font-size: 18px;
    border-width: 3px; /* 更粗的边框便于识别 */
  `)}
`;

// 导出所有样式
export default {
  ResponsiveContainer,
  FlexGrid,
  GameBoardContainer,
  ResponsiveButton,
  ResponsiveCard,
  ResponsiveText,
  ResponsiveInput,
  HorizontalScrollContainer,
  SafeAreaContainer,
  TouchFriendlyCell,
  media,
  breakpoints
};