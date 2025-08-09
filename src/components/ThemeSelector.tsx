import React from 'react';
import styled from 'styled-components';
import { ColorTheme, DEFAULT_THEMES } from '@/types/game';
import { Card, Button, Text } from './ResponsiveLayout';

interface ThemeSelectorProps {
  currentTheme: ColorTheme;
  onThemeChange: (theme: ColorTheme) => void;
  onClose: () => void;
  isVisible: boolean;
}

const Overlay = styled.div<{ $visible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: ${props => props.$visible ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  animation: ${props => props.$visible ? 'fadeIn' : 'fadeOut'} 0.3s ease;
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
`;

const ThemePanel = styled(Card)`
  min-width: 400px;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  
  @media (max-width: 768px) {
    min-width: 90vw;
    margin: 1rem;
  }
`;

const ThemeHeader = styled.div`
  padding: 1.5rem 1.5rem 1rem;
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
  margin: -1.5rem -1.5rem 1.5rem;
  
  h2 {
    margin: 0 0 0.5rem;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  p {
    margin: 0;
    opacity: 0.9;
    font-size: 0.875rem;
  }
`;

const ThemeGrid = styled.div`
  display: grid;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const ThemeItem = styled.div<{ $selected: boolean }>`
  border: 2px solid ${props => props.$selected ? '#667eea' : 'transparent'};
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => props.$selected ? 'rgba(102, 126, 234, 0.1)' : 'transparent'};
  
  &:hover {
    border-color: #667eea;
    background: rgba(102, 126, 234, 0.05);
  }
`;

const ThemeName = styled(Text)`
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #333;
`;

const ThemePreview = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  margin-bottom: 0.5rem;
`;

const PreviewCell = styled.div<{ 
  $bg: string;
  $color?: string;
}>`
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: ${props => props.$bg};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${props => props.$color || '#333'};
  border: 1px solid rgba(0, 0, 0, 0.1);
`;

const ThemeDescription = styled(Text)`
  font-size: 0.75rem;
  color: #666;
  margin: 0;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  
  @media (max-width: 768px) {
    flex-direction: column;
    
    button {
      width: 100% !important;
    }
  }
`;

const CustomThemeSection = styled.div`
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #eee;
`;

const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  onThemeChange,
  onClose,
  isVisible
}) => {
  const handleThemeSelect = (theme: ColorTheme) => {
    onThemeChange(theme);
  };

  const renderThemePreview = (theme: ColorTheme) => (
    <ThemePreview>
      <PreviewCell 
        $bg={theme.unrevealedCell}
        title="未翻开格子"
      />
      <PreviewCell 
        $bg={theme.revealedCell}
        $color={theme.numbers[1]}
        title="已翻开格子"
      >
        1
      </PreviewCell>
      <PreviewCell 
        $bg={theme.flaggedCell}
        title="插旗格子"
      >
        🚩
      </PreviewCell>
      <PreviewCell 
        $bg={theme.mineCell}
        title="地雷格子"
      >
        💣
      </PreviewCell>
    </ThemePreview>
  );

  const getThemeDescription = (theme: ColorTheme) => {
    switch (theme.id) {
      case 'classic':
        return '经典的扫雷配色方案，清晰明了';
      case 'dark':
        return '深色主题，护眼舒适';
      case 'ocean':
        return '海洋风格，清新淡雅';
      case 'forest':
        return '森林主题，自然和谐';
      default:
        return '自定义主题';
    }
  };

  if (!isVisible) return null;

  return (
    <Overlay $visible={isVisible} onClick={onClose}>
      <ThemePanel onClick={(e) => e.stopPropagation()}>
        <ThemeHeader>
          <h2>🎨 选择游戏主题</h2>
          <p>选择你喜欢的颜色主题来个性化你的扫雷游戏</p>
        </ThemeHeader>
        
        <ThemeGrid>
          {DEFAULT_THEMES.map((theme) => (
            <ThemeItem
              key={theme.id}
              $selected={currentTheme.id === theme.id}
              onClick={() => handleThemeSelect(theme)}
            >
              <ThemeName>{theme.name}</ThemeName>
              {renderThemePreview(theme)}
              <ThemeDescription>
                {getThemeDescription(theme)}
              </ThemeDescription>
            </ThemeItem>
          ))}
        </ThemeGrid>

        <CustomThemeSection>
          <ThemeName>💡 提示</ThemeName>
          <ThemeDescription>
            主题设置会自动保存到本地，下次访问时会记住你的选择。
          </ThemeDescription>
        </CustomThemeSection>

        <ButtonGroup>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" onClick={onClose}>
            确定
          </Button>
        </ButtonGroup>
      </ThemePanel>
    </Overlay>
  );
};

export default ThemeSelector;