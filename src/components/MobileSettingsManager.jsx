import React, { useState, useEffect } from 'react';
import { 
  Volume2, VolumeX, Smartphone, Sparkles, Sliders, 
  RotateCcw, Check, Info, Type, Play, Bot, CheckSquare
} from 'lucide-react';
import WindowModal from './WindowModal';
import { getMobileSettings, saveMobileSettings, resetMobileSettings, DEFAULT_MOBILE_SETTINGS } from '../utils/mobileSettings';
import { testSound, playButtonClickSound } from '../utils/audio';
import './MobileSettingsManager.css';

export default function MobileSettingsManager({ onClose, showToast }) {
  const [settings, setSettings] = useState(() => getMobileSettings());

  const updateSetting = (key, value) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      saveMobileSettings(updated);
      return updated;
    });
  };

  const handleTestSound = (tone, volume, e) => {
    if (e) e.stopPropagation();
    testSound(tone, volume);
  };

  const handleReset = () => {
    if (window.confirm('모바일 환경설정을 기본값으로 초기화하시겠습니까?')) {
      const reset = resetMobileSettings();
      setSettings(reset);
      playButtonClickSound();
      if (showToast) showToast('모바일 설정이 기본값으로 초기화되었습니다.');
    }
  };

  const handleSaveAndClose = () => {
    saveMobileSettings(settings);
    playButtonClickSound();
    if (showToast) showToast('모바일 환경설정이 적용되었습니다.');
    onClose();
  };

  const toneList = [
    { id: 'pop', name: '팝 (Pop)', desc: '현대적인 팝 터치음' },
    { id: 'click', name: '클릭 (Click)', desc: '경쾌한 타건 클릭음' },
    { id: 'chime', name: '차임 (Chime)', desc: '맑고 고운 벨소리' },
    { id: 'soft', name: '소프트 (Soft)', desc: '은은하고 차분한 탭음' }
  ];

  const fontScales = [
    { value: 95, label: '95% (작게)' },
    { value: 100, label: '100% (보통)' },
    { value: 105, label: '105% (약간 큼)' },
    { value: 110, label: '110% (크게)' },
    { value: 115, label: '115% (매우 큼)' }
  ];

  return (
    <WindowModal title="📱 모바일 전용 환경설정" onClose={onClose}>
      <div className="mobile-settings-modal">
        
        {/* 안내 배너: 데스크탑과 분리된 독립 설정 */}
        <div className="mobile-settings-banner">
          <Info size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>모바일 독립 설정 안내</strong><br />
            이 설정은 데스크탑 PC 화면에 전혀 영향을 주지 않으며, 현재 모바일 기기의 작동 환경만 단독으로 제어합니다.
          </div>
        </div>

        {/* 1. 버튼 사운드 & 햅틱 피드백 카드 */}
        <div className="mobile-settings-card">
          <div className="mobile-settings-card-header">
            <Volume2 size={18} color="#2563eb" />
            <h4>버튼 효과음 및 터치 피드백</h4>
          </div>

          {/* 메인 체크박스: 모든 버튼 클릭 시 소리 나오도록 설정 */}
          <div className="mobile-setting-item">
            <label className="mobile-setting-row" onClick={() => updateSetting('enableButtonSound', !settings.enableButtonSound)}>
              <div className="mobile-setting-label">
                <span className="title">모든 화면 버튼 터치 시 효과음 재생</span>
                <span className="desc">모바일 화면의 모든 버튼, 탭, 메뉴 클릭 시 소리를 재생합니다.</span>
              </div>
              <input 
                type="checkbox" 
                className="mobile-checkbox-input"
                checked={settings.enableButtonSound} 
                onChange={(e) => updateSetting('enableButtonSound', e.target.checked)}
                onClick={(e) => e.stopPropagation()}
              />
            </label>
          </div>

          {/* 소리 음색 선택 (체크 활성화 시 표시) */}
          {settings.enableButtonSound && (
            <>
              <div className="mobile-setting-item" style={{ marginTop: '4px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>효과음 음색 선택</span>
                <div className="tone-selector-grid">
                  {toneList.map(t => {
                    const isSelected = settings.soundTone === t.id;
                    return (
                      <div 
                        key={t.id} 
                        className={`tone-option-btn ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          updateSetting('soundTone', t.id);
                          handleTestSound(t.id, settings.soundVolume);
                        }}
                      >
                        <div>
                          <div>{t.name}</div>
                          <div style={{ fontSize: '0.68rem', color: isSelected ? '#3b82f6' : '#94a3b8', fontWeight: 500 }}>{t.desc}</div>
                        </div>
                        <button 
                          className="tone-preview-btn"
                          onClick={(e) => handleTestSound(t.id, settings.soundVolume, e)}
                          title="미리듣기"
                        >
                          <Play size={10} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 볼륨 조절 슬라이더 */}
              <div className="mobile-setting-item" style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>효과음 볼륨</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#2563eb' }}>
                    {Math.round((settings.soundVolume || 0.15) / 0.4 * 100)}%
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0.04" 
                  max="0.40" 
                  step="0.02"
                  value={settings.soundVolume || 0.15}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateSetting('soundVolume', val);
                  }}
                  onMouseUp={() => handleTestSound(settings.soundTone, settings.soundVolume)}
                  onTouchEnd={() => handleTestSound(settings.soundTone, settings.soundVolume)}
                  style={{ width: '100%', accentColor: '#2563eb', cursor: 'pointer', marginTop: '4px' }}
                />
              </div>
            </>
          )}

          {/* 햅틱(진동) 피드백 체크박스 */}
          <div className="mobile-setting-item" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
            <label className="mobile-setting-row" onClick={() => updateSetting('enableHaptic', !settings.enableHaptic)}>
              <div className="mobile-setting-label">
                <span className="title">버튼 터치 시 햅틱(진동) 피드백</span>
                <span className="desc">버튼을 누를 때 손끝에 가벼운 터치 진동을 전달합니다. (지원 스마트폰)</span>
              </div>
              <input 
                type="checkbox" 
                className="mobile-checkbox-input"
                checked={settings.enableHaptic} 
                onChange={(e) => updateSetting('enableHaptic', e.target.checked)}
                onClick={(e) => e.stopPropagation()}
              />
            </label>
          </div>
        </div>

        {/* 2. 모바일 AI 비서 & 편의 제어 카드 */}
        <div className="mobile-settings-card">
          <div className="mobile-settings-card-header">
            <Bot size={18} color="#16a34a" />
            <h4>미스링 AI 비서 & 기능 제어</h4>
          </div>

          <div className="mobile-setting-item">
            <label className="mobile-setting-row" onClick={() => updateSetting('enableMissRing', !settings.enableMissRing)}>
              <div className="mobile-setting-label">
                <span className="title">모바일 미스링 AI 비서 표시</span>
                <span className="desc">화면 우측 하단에 미스링 플로팅 챗봇 버튼을 노출합니다.</span>
              </div>
              <input 
                type="checkbox" 
                className="mobile-checkbox-input"
                checked={settings.enableMissRing} 
                onChange={(e) => updateSetting('enableMissRing', e.target.checked)}
                onClick={(e) => e.stopPropagation()}
              />
            </label>
          </div>

          <div className="mobile-setting-item" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
            <label className="mobile-setting-row" onClick={() => updateSetting('showMenuIcons', !settings.showMenuIcons)}>
              <div className="mobile-setting-label">
                <span className="title">드로어 및 퀵메뉴 아이콘 표시</span>
                <span className="desc">모바일 메뉴 목록에 이모지/아이콘을 함께 표시합니다.</span>
              </div>
              <input 
                type="checkbox" 
                className="mobile-checkbox-input"
                checked={settings.showMenuIcons} 
                onChange={(e) => updateSetting('showMenuIcons', e.target.checked)}
                onClick={(e) => e.stopPropagation()}
              />
            </label>
          </div>

          <div className="mobile-setting-item" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
            <label className="mobile-setting-row" onClick={() => updateSetting('showReceiptSignature', settings.showReceiptSignature === false ? true : false)}>
              <div className="mobile-setting-label">
                <span className="title">거래명세표(전표) 서명란 표시</span>
                <span className="desc">매출전표 영수증 출력 시 하단 인수자 서명란을 표시합니다.</span>
              </div>
              <input 
                type="checkbox" 
                className="mobile-checkbox-input"
                checked={settings.showReceiptSignature !== false} 
                onChange={(e) => updateSetting('showReceiptSignature', e.target.checked)}
                onClick={(e) => e.stopPropagation()}
              />
            </label>
          </div>
        </div>

        {/* 3. 모바일 화면 가독성 (글자 크기) 카드 */}
        <div className="mobile-settings-card">
          <div className="mobile-settings-card-header">
            <Type size={18} color="#d97706" />
            <h4>모바일 화면 가독성 (글자 크기 배율)</h4>
          </div>

          <div className="mobile-setting-item">
            <div className="font-scale-group">
              {fontScales.map(scale => (
                <button
                  key={scale.value}
                  className={`font-scale-btn ${settings.fontScale === scale.value ? 'active' : ''}`}
                  onClick={() => updateSetting('fontScale', scale.value)}
                >
                  {scale.label}
                </button>
              ))}
            </div>
            <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
              선택한 글자 배율이 모바일 전체 화면 요소에 자연스럽게 적용됩니다.
            </span>
          </div>
        </div>

        {/* 4. 하단 액션 버튼 */}
        <div className="mobile-settings-footer">
          <button className="btn-reset" onClick={handleReset}>
            <RotateCcw size={16} /> 기본값 초기화
          </button>
          <button className="btn-save" onClick={handleSaveAndClose}>
            <Check size={18} /> 확인 및 적용
          </button>
        </div>

      </div>
    </WindowModal>
  );
}
