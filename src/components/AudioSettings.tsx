import React, { useState, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { ResponsiveCard, ResponsiveButton, ResponsiveText, media } from '@/styles/responsive';
import { useAudio } from '@/utils/audioManager';

const SettingsContainer = styled(ResponsiveCard)`
  max-width: 400px;
  margin: 20px auto;
`;

const SettingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  
  ${media.mobile(css`
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  `)}
`;

const VolumeSlider = styled.input`
  flex: 1;
  margin: 0 15px;
  height: 6px;
  border-radius: 3px;
  background: #ddd;
  outline: none;
  
  &::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #4CAF50;
    cursor: pointer;
    border: 2px solid #fff;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  
  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #4CAF50;
    cursor: pointer;
    border: 2px solid #fff;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }

  ${media.mobile(css`
    margin: 8px 0;
  `)}
`;

const ToggleSwitch = styled.button<{ $enabled: boolean }>`
  width: 50px;
  height: 25px;
  border-radius: 25px;
  border: 2px solid ${props => props.$enabled ? '#4CAF50' : '#ccc'};
  background: ${props => props.$enabled ? '#4CAF50' : '#f0f0f0'};
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &::before {
    content: '';
    position: absolute;
    width: 19px;
    height: 19px;
    border-radius: 50%;
    background: white;
    top: 1px;
    left: ${props => props.$enabled ? '26px' : '1px'};
    transition: left 0.3s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }

  ${media.mobile(css`
    width: 45px;
    height: 22px;
    
    &::before {
      width: 16px;
      height: 16px;
      left: ${props => props.$enabled ? '24px' : '1px'};
    }
  `)}
`;

const TestButtonGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 20px;
  
  ${media.mobile(css`
    justify-content: center;
  `)}
`;

const TestButton = styled(ResponsiveButton)`
  flex: 1;
  min-width: 80px;
  font-size: 12px;
  padding: 8px 12px;
  
  ${media.mobile(css`
    flex: none;
    min-width: 70px;
    font-size: 11px;
  `)}
`;

const VolumeDisplay = styled.div`
  min-width: 40px;
  text-align: center;
  font-weight: bold;
  color: #4CAF50;
`;

interface AudioSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AudioSettings({ isOpen, onClose }: AudioSettingsProps) {
  const {
    getVolume,
    setVolume,
    isEnabled,
    setEnabled,
    testSound,
    preloadSounds
  } = useAudio();

  const [volume, setVolumeState] = useState(getVolume());
  const [enabled, setEnabledState] = useState(isEnabled());

  useEffect(() => {
    if (isOpen) {
      // 预加载音效
      preloadSounds();
    }
  }, [isOpen, preloadSounds]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolumeState(newVolume);
    setVolume(newVolume);
  };

  const handleEnabledToggle = () => {
    const newEnabled = !enabled;
    setEnabledState(newEnabled);
    setEnabled(newEnabled);
    
    if (newEnabled) {
      testSound('click');
    }
  };

  const testSounds = [
    { name: 'click', label: '点击' },
    { name: 'flag', label: '标记' },
    { name: 'reveal', label: '揭开' },
    { name: 'explosion', label: '爆炸' },
    { name: 'win', label: '胜利' }
  ];

  if (!isOpen) return null;

  return (
    <SettingsContainer>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <ResponsiveText $size="large" $weight="bold">
          🔊 音效设置
        </ResponsiveText>
        <ResponsiveButton onClick={onClose}>
          ✕
        </ResponsiveButton>
      </div>

      <SettingRow>
        <ResponsiveText>启用音效</ResponsiveText>
        <ToggleSwitch $enabled={enabled} onClick={handleEnabledToggle}>
          <span style={{ 
            position: 'absolute', 
            top: '50%', 
            transform: 'translateY(-50%)',
            fontSize: '10px',
            left: enabled ? '4px' : '30px',
            color: enabled ? 'white' : '#666',
            transition: 'all 0.3s ease'
          }}>
            {enabled ? 'ON' : 'OFF'}
          </span>
        </ToggleSwitch>
      </SettingRow>

      {enabled && (
        <SettingRow>
          <ResponsiveText>音量</ResponsiveText>
          <VolumeSlider
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
          />
          <VolumeDisplay>
            {Math.round(volume * 100)}%
          </VolumeDisplay>
        </SettingRow>
      )}

      {enabled && (
        <>
          <ResponsiveText $size="small" style={{ marginBottom: '10px', color: '#666' }}>
            测试音效：
          </ResponsiveText>
          <TestButtonGroup>
            {testSounds.map(sound => (
              <TestButton
                key={sound.name}
                onClick={() => testSound(sound.name)}
                $size="small"
              >
                {sound.label}
              </TestButton>
            ))}
          </TestButtonGroup>
        </>
      )}

      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        background: '#f8f9fa', 
        borderRadius: '6px' 
      }}>
        <ResponsiveText $size="small" style={{ color: '#666', textAlign: 'center' }}>
          💡 提示：音效增强游戏体验，建议在安静环境下启用
        </ResponsiveText>
      </div>
    </SettingsContainer>
  );
}