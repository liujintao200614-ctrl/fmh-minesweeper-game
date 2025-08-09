import React from 'react';
import styled from 'styled-components';

// 响应式断点
const breakpoints = {
  mobile: '480px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1200px'
};

export const Container = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  
  @media (max-width: ${breakpoints.tablet}) {
    padding: 0 0.75rem;
  }
  
  @media (max-width: ${breakpoints.mobile}) {
    padding: 0 0.5rem;
  }
`;

export const Grid = styled.div<{ 
  columns?: number;
  gap?: string;
  mobileColumns?: number;
  tabletColumns?: number;
}>`
  display: grid;
  grid-template-columns: repeat(${props => props.columns || 2}, 1fr);
  gap: ${props => props.gap || '1rem'};
  
  @media (max-width: ${breakpoints.tablet}) {
    grid-template-columns: repeat(${props => props.tabletColumns || 1}, 1fr);
  }
  
  @media (max-width: ${breakpoints.mobile}) {
    grid-template-columns: repeat(${props => props.mobileColumns || 1}, 1fr);
    gap: 0.75rem;
  }
`;

export const FlexBox = styled.div<{
  direction?: 'row' | 'column';
  justify?: string;
  align?: string;
  gap?: string;
  wrap?: boolean;
}>`
  display: flex;
  flex-direction: ${props => props.direction || 'row'};
  justify-content: ${props => props.justify || 'flex-start'};
  align-items: ${props => props.align || 'stretch'};
  gap: ${props => props.gap || '0'};
  flex-wrap: ${props => props.wrap ? 'wrap' : 'nowrap'};
  
  @media (max-width: ${breakpoints.mobile}) {
    flex-direction: column;
    gap: 0.5rem;
  }
`;

export const Card = styled.div<{ padding?: string }>`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: ${props => props.padding || '1.5rem'};
  
  @media (max-width: ${breakpoints.tablet}) {
    padding: 1rem;
    border-radius: 8px;
  }
  
  @media (max-width: ${breakpoints.mobile}) {
    padding: 0.75rem;
    border-radius: 6px;
  }
`;

export const Button = styled.button<{
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  
  /* Size variants */
  ${props => props.size === 'small' && `
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  `}
  
  ${props => (props.size === 'medium' || !props.size) && `
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  `}
  
  ${props => props.size === 'large' && `
    padding: 1rem 2rem;
    font-size: 1.125rem;
  `}
  
  /* Color variants */
  ${props => (props.variant === 'primary' || !props.variant) && `
    background: linear-gradient(45deg, #667eea, #764ba2);
    color: white;
    
    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
  `}
  
  ${props => props.variant === 'secondary' && `
    background: rgba(102, 126, 234, 0.1);
    color: #667eea;
    
    &:hover:not(:disabled) {
      background: rgba(102, 126, 234, 0.2);
    }
  `}
  
  ${props => props.variant === 'outline' && `
    background: transparent;
    color: #667eea;
    border: 1px solid #667eea;
    
    &:hover:not(:disabled) {
      background: #667eea;
      color: white;
    }
  `}
  
  /* Width */
  ${props => props.fullWidth && `
    width: 100%;
  `}
  
  /* Disabled state */
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }
  
  /* Mobile adjustments */
  @media (max-width: ${breakpoints.mobile}) {
    ${props => props.size === 'large' && `
      padding: 0.875rem 1.5rem;
      font-size: 1rem;
    `}
  }
`;

export const Text = styled.div<{
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: string;
  align?: 'left' | 'center' | 'right';
}>`
  /* Size variants */
  ${props => props.size === 'xs' && `font-size: 0.75rem;`}
  ${props => props.size === 'sm' && `font-size: 0.875rem;`}
  ${props => (props.size === 'base' || !props.size) && `font-size: 1rem;`}
  ${props => props.size === 'lg' && `font-size: 1.125rem;`}
  ${props => props.size === 'xl' && `font-size: 1.25rem;`}
  ${props => props.size === '2xl' && `font-size: 1.5rem;`}
  
  /* Weight variants */
  ${props => props.weight === 'normal' && `font-weight: 400;`}
  ${props => props.weight === 'medium' && `font-weight: 500;`}
  ${props => props.weight === 'semibold' && `font-weight: 600;`}
  ${props => props.weight === 'bold' && `font-weight: 700;`}
  
  /* Color */
  ${props => props.color && `color: ${props.color};`}
  
  /* Alignment */
  ${props => props.align && `text-align: ${props.align};`}
`;

export const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
  }
  
  @media (max-width: ${breakpoints.mobile}) {
    padding: 0.625rem;
    font-size: 16px; /* Prevents zoom on iOS */
  }
`;

export const Badge = styled.span<{
  variant?: 'success' | 'warning' | 'error' | 'info';
}>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  
  ${props => (props.variant === 'success' || !props.variant) && `
    background: rgba(34, 197, 94, 0.1);
    color: #15803d;
  `}
  
  ${props => props.variant === 'warning' && `
    background: rgba(251, 191, 36, 0.1);
    color: #d97706;
  `}
  
  ${props => props.variant === 'error' && `
    background: rgba(239, 68, 68, 0.1);
    color: #dc2626;
  `}
  
  ${props => props.variant === 'info' && `
    background: rgba(59, 130, 246, 0.1);
    color: #2563eb;
  `}
`;

// 专门的游戏相关组件
export const GameContainer = styled(Card)`
  position: relative;
  overflow: hidden;
  
  @media (max-width: ${breakpoints.tablet}) {
    margin: 0 -0.5rem;
    border-radius: 0;
  }
`;

export const GameBoard = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  
  @media (max-width: ${breakpoints.tablet}) {
    padding: 0.5rem;
  }
  
  @media (max-width: ${breakpoints.mobile}) {
    padding: 0.25rem;
    overflow-x: auto;
  }
`;

export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  
  @media (max-width: ${breakpoints.mobile}) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
`;

export const StatCard = styled(Card)`
  text-align: center;
  padding: 1rem;
  
  .label {
    font-size: 0.75rem;
    color: #666;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .value {
    font-size: 1.5rem;
    font-weight: 700;
    background: linear-gradient(45deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1.2;
  }
  
  @media (max-width: ${breakpoints.mobile}) {
    padding: 0.75rem;
    
    .value {
      font-size: 1.25rem;
    }
  }
`;

// 辅助函数
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= parseInt(breakpoints.mobile));
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);
  
  return isMobile;
};

export const useIsTablet = () => {
  const [isTablet, setIsTablet] = React.useState(false);
  
  React.useEffect(() => {
    const checkIsTablet = () => {
      setIsTablet(window.innerWidth <= parseInt(breakpoints.tablet));
    };
    
    checkIsTablet();
    window.addEventListener('resize', checkIsTablet);
    
    return () => window.removeEventListener('resize', checkIsTablet);
  }, []);
  
  return isTablet;
};