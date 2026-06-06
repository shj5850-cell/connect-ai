'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Settings, Bot, PenTool, FileText, Check, Loader2, 
  Sparkles, RefreshCw, AlertCircle, Save, Wrench, Eye, EyeOff
} from 'lucide-react';

function getAgentKoreanName(agentName) {
  const mapping = {
    secretary: '영숙 (비서)',
    youtube: '유튜브 관리자',
    writer: '콘텐츠 작가',
    designer: 'UI/UX 디자이너',
    instagram: '인스타그램 빌더',
    business: '현빈 (수익화 총괄)',
    developer: '개발자 에이전트',
    researcher: '시장 분석가',
    ceo: '대표이사 (CEO)',
    editor: '영상 편집자'
  };
  return mapping[agentName.toLowerCase()] || agentName;
}

export default function AgentsTunerPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeAgentIdx, setActiveAgentIdx] = useState(0);
  const [activeTab, setActiveTab] = useState('prompt'); // prompt, goal, tools
  
  // Working states for edits
  const [promptText, setPromptText] = useState('');
  const [goalText, setGoalText] = useState('');
  const [toolConfigs, setToolConfigs] = useState({}); // { toolName: { key: value } }
  
  // Saving indicators
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // success, error
  const [saveMessage, setSaveMessage] = useState('');

  // Password visibility state
  const [showPasswords, setShowPasswords] = useState({}); // { [toolName_key]: boolean }

  const fetchAgents = () => {
    setLoading(true);
    setError('');
    fetch('/api/agents')
      .then(res => {
        if (!res.ok) throw new Error('API 서버에서 에이전트 설정을 읽지 못했습니다.');
        return res.json();
      })
      .then(json => {
        if (json.success) {
          setAgents(json.agents || []);
          if (json.agents.length > 0) {
            loadAgentIntoState(json.agents[activeAgentIdx]);
          }
        } else {
          throw new Error(json.error || '에이전트 데이터를 불러오는데 실패했습니다.');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const loadAgentIntoState = (agent) => {
    if (!agent) return;
    setPromptText(agent.prompt || '');
    setGoalText(agent.goal || '');
    
    // Map tool configurations
    const initialTools = {};
    agent.tools.forEach(tool => {
      initialTools[tool.name] = { ...tool.values };
    });
    setToolConfigs(initialTools);
    
    // Reset save alerts
    setSaveStatus('');
    setSaveMessage('');
  };

  const handleAgentSelect = (idx) => {
    setActiveAgentIdx(idx);
    loadAgentIntoState(agents[idx]);
  };

  const handleToolConfigChange = (toolName, key, val) => {
    setToolConfigs(prev => ({
      ...prev,
      [toolName]: {
        ...prev[toolName],
        [key]: val
      }
    }));
  };

  const handleSavePrompt = async () => {
    const activeAgent = agents[activeAgentIdx];
    await saveAgentData({
      agent: activeAgent.name,
      prompt: promptText
    });
  };

  const handleSaveGoal = async () => {
    const activeAgent = agents[activeAgentIdx];
    await saveAgentData({
      agent: activeAgent.name,
      goal: goalText
    });
  };

  const handleSaveToolConfig = async (toolName) => {
    const activeAgent = agents[activeAgentIdx];
    await saveAgentData({
      agent: activeAgent.name,
      toolName: toolName,
      toolConfig: toolConfigs[toolName]
    });
  };

  const saveAgentData = async (payload) => {
    setSaving(true);
    setSaveStatus('');
    setSaveMessage('');
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveStatus('success');
        setSaveMessage(data.message || '설정이 안전하게 저장되었습니다.');
        
        // Refresh local data copy
        const updatedAgents = [...agents];
        const currentAgent = updatedAgents[activeAgentIdx];
        if (payload.prompt !== undefined) currentAgent.prompt = payload.prompt;
        if (payload.goal !== undefined) currentAgent.goal = payload.goal;
        if (payload.toolName) {
          const targetTool = currentAgent.tools.find(t => t.name === payload.toolName);
          if (targetTool) targetTool.values = payload.toolConfig;
        }
        setAgents(updatedAgents);

        setTimeout(() => {
          setSaveStatus('');
          setSaveMessage('');
        }, 3000);
      } else {
        throw new Error(data.error || '저장 도중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
      setSaveMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePasswordVisibility = (fieldKey) => {
    setShowPasswords(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey]
    }));
  };

  const activeAgent = agents[activeAgentIdx];

  return (
    <div className="container" style={{ padding: '2rem', maxWidth: '1350px' }}>
      
      {/* Header */}
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', width: 'fit-content' }} className="btn-secondary btn">
            <ArrowLeft size={16} /> 대시보드로 돌아가기
          </Link>
          <h1 className="title gradient-text" style={{ fontSize: '2.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Settings size={30} color="#3b82f6" style={{ filter: 'drop-shadow(0 0 8px rgba(59,130,246,0.4))' }} />
            <span>에이전트 튜너 & 설정 콘솔</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            맹칠컴퍼니 10개 에이전트의 페르소나 지침(`prompt.md`), 목표 지향점(`goal.md`), 그리고 사용하는 도구 계정 정보를 직접 수정합니다.
          </p>
        </div>
        <button onClick={fetchAgents} className="btn-secondary btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCw size={16} /> 불러오기
        </button>
      </header>

      {error && (
        <div className="error-message-box" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>에러: {error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '4rem 0', textAlign: 'center' }}>
          <Loader2 className="animate-spin" size={32} color="var(--accent-color)" style={{ margin: '0 auto 1rem auto' }} />
          <p style={{ color: 'var(--text-secondary)' }}>에이전트 파일 시스템 정보를 읽어오고 있습니다...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: '2rem', alignItems: 'stretch' }}>
          
          {/* Left Sidebar: Agents Selector */}
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 650 }}>
              🏢 컴퍼니 임직원 리스트
            </h3>
            {agents.map((agent, idx) => {
              const isActive = activeAgentIdx === idx;
              return (
                <div 
                  key={agent.name}
                  onClick={() => handleAgentSelect(idx)}
                  style={{ 
                    padding: '0.75rem 1rem', 
                    background: isActive ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.02)', 
                    border: '1px solid rgba(255,255,255,0.05)', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  }}
                >
                  <Bot size={18} color={isActive ? 'white' : 'var(--text-secondary)'} />
                  <div>
                    <div style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>
                      {getAgentKoreanName(agent.name)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: isActive ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '0.1rem' }}>
                      {agent.name}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Workspace: Tabbed Editor */}
          {activeAgent && (
            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'linear-gradient(145deg, rgba(255,255,255,0.01) 0%, rgba(59, 130, 246, 0.02) 100%)' }}>
              
              {/* Active Agent Info Header */}
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', color: 'white', margin: 0 }}>
                    {getAgentKoreanName(activeAgent.name)}
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                    파일 위치: `_company/_agents/{activeAgent.name}/`
                  </p>
                </div>

                {/* Save status notice */}
                {saveMessage && (
                  <div style={{ 
                    fontSize: '0.85rem', 
                    color: saveStatus === 'success' ? '#10b981' : '#ef4444', 
                    background: saveStatus === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', 
                    padding: '0.5rem 1rem', 
                    borderRadius: '6px',
                    border: `1px solid ${saveStatus === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    {saveStatus === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                    {saveMessage}
                  </div>
                )}
              </div>

              {/* Editor Tabs Navigation */}
              <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                <button
                  onClick={() => setActiveTab('prompt')}
                  className="btn"
                  style={{
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.85rem',
                    background: activeTab === 'prompt' ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: '#fff'
                  }}
                >
                  <PenTool size={14} /> 지침 및 역할 (`prompt.md`)
                </button>
                <button
                  onClick={() => setActiveTab('goal')}
                  className="btn"
                  style={{
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.85rem',
                    background: activeTab === 'goal' ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: '#fff'
                  }}
                >
                  <FileText size={14} /> 개인 미션 목표 (`goal.md`)
                </button>
                {activeAgent.tools?.length > 0 && (
                  <button
                    onClick={() => setActiveTab('tools')}
                    className="btn"
                    style={{
                      padding: '0.5rem 1.25rem',
                      fontSize: '0.85rem',
                      background: activeTab === 'tools' ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      color: '#fff'
                    }}
                  >
                    <Wrench size={14} /> 도구 및 계정 설정 ({activeAgent.tools.length}개)
                  </button>
                )}
              </div>

              {/* TAB CONTENT: Prompt Editor */}
              {activeTab === 'prompt' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                    에이전트가 생각하고 도구를 선택할 때 주입되는 **핵심 페르소나 지침**입니다. AI 모델이 어떤 말투와 순서로 과업을 해결해야 하는지 상세히 적혀 있습니다.
                  </p>
                  <textarea 
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    style={{ 
                      flex: 1, 
                      minHeight: '400px', 
                      padding: '1.25rem', 
                      background: 'rgba(0,0,0,0.4)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '8px',
                      color: 'white',
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      lineHeight: '1.6',
                      resize: 'vertical',
                      outline: 'none'
                    }}
                  />
                  <button 
                    onClick={handleSavePrompt}
                    disabled={saving}
                    className="btn"
                    style={{ alignSelf: 'flex-end', padding: '0.6rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    지침 저장하기
                  </button>
                </div>
              )}

              {/* TAB CONTENT: Goal Editor */}
              {activeTab === 'goal' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                    CEO가 공동 목표를 분배해 줄 때, 해당 에이전트가 최종 달성하고자 하는 **KPI 마일스톤 및 세부 미션** 목록입니다.
                  </p>
                  <textarea 
                    value={goalText}
                    onChange={(e) => setGoalText(e.target.value)}
                    style={{ 
                      flex: 1, 
                      minHeight: '400px', 
                      padding: '1.25rem', 
                      background: 'rgba(0,0,0,0.4)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '8px',
                      color: 'white',
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      lineHeight: '1.6',
                      resize: 'vertical',
                      outline: 'none'
                    }}
                  />
                  <button 
                    onClick={handleSaveGoal}
                    disabled={saving}
                    className="btn"
                    style={{ alignSelf: 'flex-end', padding: '0.6rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    목표 저장하기
                  </button>
                </div>
              )}

              {/* TAB CONTENT: Tools configuration schemas */}
              {activeTab === 'tools' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {activeAgent.tools.map(tool => {
                    const fields = Object.keys(tool.schema);
                    
                    return (
                      <div key={tool.name} style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
                          <Wrench size={16} color="#3b82f6" />
                          <h4 style={{ margin: 0, color: 'white', fontSize: '1rem', textTransform: 'capitalize' }}>
                            {tool.name} 도구 설정
                          </h4>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            ({tool.name}.json)
                          </span>
                        </div>

                        {fields.length === 0 ? (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            이 도구는 외부 파라미터 설정을 지원하지 않습니다.
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                            {fields.map(key => {
                              const meta = tool.schema[key];
                              const type = meta.type || 'text';
                              const currentVal = toolConfigs[tool.name]?.[key] !== undefined ? toolConfigs[tool.name][key] : '';
                              const fieldKey = `${tool.name}_${key}`;
                              const isPasswordVisible = showPasswords[fieldKey] || false;

                              return (
                                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                  <label style={{ fontSize: '0.85rem', fontWeight: 650, color: '#e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{meta.label || key}</span>
                                    <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{key}</span>
                                  </label>
                                  
                                  {/* Rendering form fields based on type */}
                                  <div style={{ position: 'relative', display: 'flex', width: '100%' }}>
                                    {type === 'select' ? (
                                      <select
                                        value={currentVal}
                                        onChange={(e) => handleToolConfigChange(tool.name, key, e.target.value)}
                                        style={{ width: '100%', padding: '0.65rem', background: '#1c1917', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                                      >
                                        {(meta.options || []).map(opt => (
                                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                      </select>
                                    ) : meta.label && meta.label.includes('password') || key.includes('SECRET') || key.includes('TOKEN') || key.includes('KEY') ? (
                                      // Render masked password fields securely
                                      <>
                                        <input
                                          type={isPasswordVisible ? 'text' : 'password'}
                                          value={currentVal}
                                          onChange={(e) => handleToolConfigChange(tool.name, key, e.target.value)}
                                          style={{ width: '100%', padding: '0.65rem', paddingRight: '2.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => togglePasswordVisibility(fieldKey)}
                                          style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                        >
                                          {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                      </>
                                    ) : (
                                      // Default standard input
                                      <input
                                        type="text"
                                        value={Array.isArray(currentVal) ? currentVal.join(', ') : currentVal}
                                        onChange={(e) => {
                                          let val = e.target.value;
                                          if (Array.isArray(currentVal)) {
                                            val = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                          }
                                          handleToolConfigChange(tool.name, key, val);
                                        }}
                                        style={{ width: '100%', padding: '0.65rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                                      />
                                    )}
                                  </div>
                                  
                                  {meta.hint && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                      {meta.hint}
                                    </span>
                                  )}
                                </div>
                              );
                            })}

                            <button 
                              onClick={() => handleSaveToolConfig(tool.name)}
                              disabled={saving}
                              className="btn"
                              style={{ alignSelf: 'flex-end', padding: '0.5rem 1.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--accent-gradient)' }}
                            >
                              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                              설정 적용하기
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

        </div>
      )}

    </div>
  );
}
