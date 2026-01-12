
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Layout } from './components/Layout';
import { INITIAL_STATS, INITIAL_QUESTS, ICONS, SHOP_ITEMS } from './constants';
import { PlayerStats, DailyQuest, InventoryItem, DungeonEncounter, StatusEffect, StatusType, NotificationSettings } from './types';
import { generateDungeon, getSystemMessage, generateLoot } from './services/gemini';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Radar as RadarComponent } from 'recharts';

type Tab = 'STATUS' | 'QUEST' | 'INVENTÁRIO' | 'DUNGEON' | 'LOJA';

interface SystemNotification {
    id: string;
    message: string;
}

interface Skill {
    id: string;
    name: string;
    description: string;
    mpCost: number;
    fatigueCost: number;
    effect: string;
    statusToApply?: StatusType;
    requiredLevel: number;
}

const DEFAULT_SKILLS: Skill[] = [
    { id: 'sk0', name: 'Instinto Assassino', description: 'Aumenta a percepção de perigo.', mpCost: 5, fatigueCost: 2, effect: 'Buff de Sentido', requiredLevel: 1 },
    { id: 'sk1', name: 'Investida de Sombra', description: 'Ataque rápido que pode atordoar.', mpCost: 10, fatigueCost: 5, effect: 'Dano Físico', statusToApply: 'ATORDOADO', requiredLevel: 5 },
    { id: 'sk3', name: 'Golpe Venenoso', description: 'Lâmina embebida em veneno de Kasaka.', mpCost: 15, fatigueCost: 8, effect: 'Envenena', statusToApply: 'ENVENENADO', requiredLevel: 12 },
    { id: 'sk2', name: 'Toque do Purgatório', description: 'Queima o inimigo com chamas negras.', mpCost: 25, fatigueCost: 10, effect: 'Queima', statusToApply: 'QUEIMANDO', requiredLevel: 25 },
    { id: 'sk4', name: 'Surto de Vitalidade', description: 'Fortalece temporariamente o corpo.', mpCost: 40, fatigueCost: 15, effect: 'Auto-Fortalecer', statusToApply: 'FORTALECIDO', requiredLevel: 35 },
    { id: 'sk5', name: 'Mãos do Monarca', description: 'Controla objetos e inimigos com mana.', mpCost: 60, fatigueCost: 20, effect: 'Dano Mágico', statusToApply: 'ATORDOADO', requiredLevel: 50 },
    { id: 'sk6', name: 'Autoridade do Soberano', description: 'Esmaga a vontade dos inimigos.', mpCost: 100, fatigueCost: 30, effect: 'Debuff Área', requiredLevel: 70 },
    { id: 'sk7', name: 'Extração de Sombras', description: 'ERGA-SE. Transforma mortos em soldados.', mpCost: 200, fatigueCost: 50, effect: 'Invocação', requiredLevel: 85 },
];

const StatusVisualOverlay: React.FC<{ effects: StatusEffect[] }> = ({ effects }) => {
    const hasStatus = (type: StatusType) => effects.some(e => e.type === type);

    return (
        <div className="absolute inset-0 pointer-events-none z-40">
            {hasStatus('QUEIMANDO') && (
                <div className="absolute inset-0 status-burning mix-blend-screen opacity-60"></div>
            )}
            
            {hasStatus('ENVENENADO') && (
                <div className="absolute inset-0 overflow-hidden">
                    {[...Array(12)].map((_, i) => (
                        <div 
                            key={i} 
                            className="poison-particle" 
                            style={{ 
                                width: `${Math.random() * 10 + 5}px`,
                                height: `${Math.random() * 10 + 5}px`,
                                left: `${Math.random() * 100}%`,
                                bottom: '-20px',
                                animationDelay: `${Math.random() * 2}s`,
                                opacity: 0.6
                            }} 
                        />
                    ))}
                </div>
            )}

            {hasStatus('ATORDOADO') && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-full h-12 flex items-center justify-center">
                    {[...Array(3)].map((_, i) => (
                        <div 
                            key={i} 
                            className="stun-star text-lg" 
                            style={{ animationDelay: `${i * 0.5}s` }}
                        >
                            ★
                        </div>
                    ))}
                </div>
            )}

            {hasStatus('FORTALECIDO') && (
                <div className="absolute inset-0 border-[6px] border-blue-400/30 animate-pulse scale-105 rounded-xl blur-sm"></div>
            )}
        </div>
    );
};

const AvatarDisplay: React.FC<{ stats: PlayerStats, onUpload: () => void }> = ({ stats, onUpload }) => {
    const dominantAttr = useMemo(() => {
        const attrs = stats.attributes;
        const entries = Object.entries(attrs);
        let max = entries[0];
        for (const entry of entries) {
            if (entry[1] > max[1]) max = entry;
        }
        return max;
    }, [stats.attributes]);

    const strengthFactor = useMemo(() => Math.min(2.5, stats.attributes.strength / 40), [stats.attributes.strength]);
    const intelligenceFactor = useMemo(() => Math.min(2.5, stats.attributes.intelligence / 40), [stats.attributes.intelligence]);
    const levelFactor = useMemo(() => stats.level / 80, [stats.level]);

    const rank = useMemo(() => {
        if (stats.level < 10) return 'E';
        if (stats.level < 20) return 'D';
        if (stats.level < 30) return 'C';
        if (stats.level < 40) return 'B';
        if (stats.level < 55) return 'A';
        return 'S';
    }, [stats.level]);

    const dominantColor = useMemo(() => {
        if (stats.preferredAuraType && stats.preferredAuraType !== 'DOMINANTE') {
            switch(stats.preferredAuraType) {
                case 'SOMBRAS': return '#9333ea'; 
                case 'DIVINA': return '#fbbf24';  
                case 'SANGUE': return '#dc2626';  
                case 'GELO': return '#7dd3fc';    
                case 'RELÂMPAGO': return '#e879f9'; 
                default: return '#0ea5e9';
            }
        }
        const key = dominantAttr[0];
        switch(key) {
            case 'strength': return '#ef4444'; 
            case 'agility': return '#22d3ee'; 
            case 'intelligence': return '#8b5cf6'; 
            case 'sense': return '#f59e0b'; 
            case 'vitality': return '#10b981'; 
            default: return '#0ea5e9';
        }
    }, [dominantAttr, stats.preferredAuraType]);

    const secondaryColor = useMemo(() => {
        return stats.attributes.strength > stats.attributes.intelligence ? '#f87171' : '#a78bfa';
    }, [stats.attributes.strength, stats.attributes.intelligence]);

    const baseIntensity = 0.4 + (strengthFactor * 0.4) + (levelFactor * 0.5);
    const auraIntensity = rank === 'S' ? baseIntensity * 1.8 : rank === 'A' ? baseIntensity * 1.4 : baseIntensity;
    const pulseSpeed = Math.max(0.3, 3.2 - (intelligenceFactor * 1.3) - (levelFactor * 0.6));
    const isShadowMonarch = stats.level >= 50 || rank === 'S';

    const getRankClasses = () => {
        if (rank === 'S') return 'animate-shadow-drift blur-[120px] opacity-100 scale-[1.5] brightness-125';
        if (rank === 'A') return 'animate-shadow-drift blur-[80px] opacity-90 scale-[1.3]';
        if (rank === 'B') return 'blur-[50px] opacity-70 scale-[1.15]';
        return 'blur-[30px] opacity-40 scale-100';
    };

    const isStunned = stats.activeEffects.some(e => e.type === 'ATORDOADO');

    return (
        <div 
            className="relative w-72 h-96 flex items-center justify-center animate-float group cursor-pointer" 
            onClick={onUpload}
        >
            <div 
                className={`absolute inset-0 transition-all duration-1000 rounded-full ${getRankClasses()}`}
                style={{ 
                    background: `radial-gradient(circle, ${dominantColor} 0%, ${secondaryColor} 60%, transparent 100%)`,
                    opacity: 0.2 + (auraIntensity * 0.45)
                }}
            ></div>

            <div 
                className="absolute inset-[-10px] rounded-full border-[4px] opacity-40 pointer-events-none mix-blend-screen"
                style={{ 
                    borderColor: isStunned ? '#fbbf24' : dominantColor,
                    animation: `mana-pulse ${pulseSpeed}s infinite ease-in-out`,
                    boxShadow: `0 0 ${20 + intelligenceFactor * 40}px ${dominantColor}`,
                    filter: isStunned ? 'grayscale(0.8)' : `hue-rotate(${stats.level * 2}deg)`
                }}
            ></div>

            <div 
                className="relative z-10 animate-breathe"
                style={{ animationDuration: `${pulseSpeed * 2.8}s` }}
            >
                <div className={`relative w-52 h-72 rounded-b-full rounded-t-[110px] border-2 transition-all duration-1000 overflow-hidden shadow-2xl bg-slate-900`}
                     style={{ 
                        borderColor: isStunned ? '#fbbf24' : dominantColor, 
                        boxShadow: `0 0 ${auraIntensity * 60}px ${dominantColor}66`,
                        borderWidth: isShadowMonarch ? '5px' : '2px',
                        filter: isStunned ? 'sepia(0.5) brightness(0.7) blur(0.5px)' : 'none'
                    }}>
                    
                    {stats.profileImage ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <img 
                                src={stats.profileImage} 
                                alt="Profile" 
                                className="w-full h-full object-cover grayscale brightness-75 hover:grayscale-0 transition-all duration-700"
                                style={{ 
                                    filter: `grayscale(${Math.max(0, 0.7 - auraIntensity)}) brightness(${0.6 + (auraIntensity * 0.4)})`,
                                    transform: `scale(${1 + (strengthFactor * 0.1)})`
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/30 to-transparent"></div>
                            <div className="scanline-effect opacity-40"></div>
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex items-end justify-center bg-slate-800">
                             <div 
                                className={`w-full transition-all duration-1000 ease-in-out`} 
                                style={{ 
                                    height: `${Math.min(100, (stats.level / 70) * 100)}%`,
                                    background: `linear-gradient(to top, ${dominantColor}, ${secondaryColor}, transparent)`
                                }}
                             ></div>
                        </div>
                    )}

                    <StatusVisualOverlay effects={stats.activeEffects} />

                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="system-font text-[10px] text-white font-bold tracking-widest uppercase">SINCRONIZAR AVATAR</span>
                    </div>

                    <div className="absolute top-[28%] left-1/2 -translate-x-1/2 flex gap-12 w-full justify-center">
                        <div 
                            className={`w-4 h-2 rounded-full transition-all duration-500`}
                            style={{ 
                                backgroundColor: dominantColor, 
                                boxShadow: `0 0 ${25 + (stats.attributes.sense * 1.2)}px 6px ${dominantColor}`,
                                transform: `scaleX(${1.4 + (stats.attributes.sense / 25)})`
                            }}
                        ></div>
                        <div 
                            className={`w-4 h-2 rounded-full transition-all duration-500`}
                            style={{ 
                                backgroundColor: dominantColor, 
                                boxShadow: `0 0 ${25 + (stats.attributes.sense * 1.2)}px 6px ${dominantColor}`,
                                transform: `scaleX(${1.4 + (stats.attributes.sense / 25)})`
                            }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const [stats, setStats] = useState<PlayerStats>(() => {
    const saved = localStorage.getItem('solo_leveling_stats');
    const initial = saved ? JSON.parse(saved) : INITIAL_STATS;
    return { ...initial, activeEffects: initial.activeEffects || [], notificationSettings: initial.notificationSettings || INITIAL_STATS.notificationSettings };
  });
  
  const [quests, setQuests] = useState<DailyQuest[]>(() => {
    const saved = localStorage.getItem('solo_leveling_quests');
    return saved ? JSON.parse(saved) : INITIAL_QUESTS;
  });

  const [skills, setSkills] = useState<Skill[]>(() => {
    const saved = localStorage.getItem('solo_leveling_skills');
    return saved ? JSON.parse(saved) : DEFAULT_SKILLS;
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('solo_leveling_inventory');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<Tab>('STATUS');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [systemMessage, setSystemMessage] = useState<string>("BEM-VINDO AO SISTEMA DE EVOLUÇÃO.");
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeDungeon, setActiveDungeon] = useState<DungeonEncounter | null>(null);
  const [lastLoot, setLastLoot] = useState<InventoryItem | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingQuests, setIsEditingQuests] = useState(false);
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [isPenaltyActive, setIsPenaltyActive] = useState(false);
  const [penaltyProgress, setPenaltyProgress] = useState(0);
  const [consumingItemId, setConsumingItemId] = useState<string | null>(null);
  const [showLootEffect, setShowLootEffect] = useState(false);
  const [hoveredAttr, setHoveredAttr] = useState<string | null>(null);
  const [attrUpdateKey, setAttrUpdateKey] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      const interval = setInterval(() => {
          setStats(prev => {
              if (prev.activeEffects.length === 0 && prev.hp === prev.maxHp && prev.mp === prev.maxMp) return prev;
              
              let newHp = prev.hp;
              let newEffects = prev.activeEffects.map(e => ({ ...e, duration: e.duration - 1 })).filter(e => e.duration > 0);
              
              prev.activeEffects.forEach(e => {
                  if (e.type === 'QUEIMANDO') newHp -= 2;
                  if (e.type === 'ENVENENADO') newHp -= 5;
              });

              return { 
                  ...prev, 
                  hp: Math.max(0, newHp), 
                  activeEffects: newEffects 
              };
          });

          setActiveDungeon(prev => {
              if (!prev || (prev.bossEffects.length === 0 && prev.bossHp === prev.bossMaxHp)) return prev;
              let newHp = prev.bossHp;
              let newEffects = prev.bossEffects.map(e => ({ ...e, duration: e.duration - 1 })).filter(e => e.duration > 0);
              
              prev.bossEffects.forEach(e => {
                  if (e.type === 'QUEIMANDO') newHp -= 50;
                  if (e.type === 'ENVENENADO') newHp -= 30;
              });

              return { ...prev, bossHp: Math.max(0, newHp), bossEffects: newEffects };
          });
      }, 1000);

      return () => clearInterval(interval);
  }, []);

  const penaltyMultiplier = useMemo(() => {
    if (stats.fatigue >= 100) return 0.5;
    if (stats.fatigue >= 80) return 0.8;
    return 1.0;
  }, [stats.fatigue]);

  const effectiveAttributes = useMemo(() => {
    const baseMult = penaltyMultiplier;
    const fortified = stats.activeEffects.some(e => e.type === 'FORTALECIDO') ? 1.5 : 1.0;
    const stunned = stats.activeEffects.some(e => e.type === 'ATORDOADO') ? 0.2 : 1.0;
    const finalMult = baseMult * fortified * stunned;

    return {
      strength: Math.floor(stats.attributes.strength * finalMult),
      agility: Math.floor(stats.attributes.agility * finalMult),
      vitality: Math.floor(stats.attributes.vitality * finalMult),
      intelligence: Math.floor(stats.attributes.intelligence * finalMult),
      sense: Math.floor(stats.attributes.sense * finalMult),
    };
  }, [stats.attributes, penaltyMultiplier, stats.activeEffects]);

  useEffect(() => {
    localStorage.setItem('solo_leveling_stats', JSON.stringify(stats));
    localStorage.setItem('solo_leveling_quests', JSON.stringify(quests));
    localStorage.setItem('solo_leveling_inventory', JSON.stringify(inventory));
    localStorage.setItem('solo_leveling_skills', JSON.stringify(skills));
  }, [stats, quests, inventory, skills]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStats(prev => ({ ...prev, profileImage: reader.result as string }));
        updateSystemLog("SISTEMA: AVATAR SINCRONIZADO.", 'systemLogs');
      };
      reader.readAsDataURL(file);
    }
  };

  const addNotification = useCallback((msg: string, type: keyof NotificationSettings = 'systemLogs') => {
    if (!stats.notificationSettings[type]) return;

    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message: msg }]);
    setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, [stats.notificationSettings]);

  const updateSystemLog = useCallback((msg: string, type: keyof NotificationSettings = 'systemLogs') => {
      setSystemMessage(msg);
      addNotification(msg, type);
  }, [addNotification]);

  const handleManualSave = () => {
    localStorage.setItem('solo_leveling_stats', JSON.stringify(stats));
    localStorage.setItem('solo_leveling_quests', JSON.stringify(quests));
    localStorage.setItem('solo_leveling_inventory', JSON.stringify(inventory));
    localStorage.setItem('solo_leveling_skills', JSON.stringify(skills));
    updateSystemLog("SISTEMA: PROGRESSO SINCRONIZADO COM O BANCO DE DADOS NEURAL.", 'systemLogs');
  };

  const toggleNotification = (type: keyof NotificationSettings) => {
    setStats(prev => ({
        ...prev,
        notificationSettings: {
            ...prev.notificationSettings,
            [type]: !prev.notificationSettings[type]
        }
    }));
    updateSystemLog(`CONFIGURAÇÃO: ALERTA DE ${type.toUpperCase()} ${(stats.notificationSettings[type] ? 'DESATIVADO' : 'ATIVADO')}.`, 'systemLogs');
  };

  const addPoint = (attr: keyof PlayerStats['attributes']) => {
    if (stats.points > 0) {
      setAttrUpdateKey(attr);
      setStats(prev => ({
        ...prev,
        points: prev.points - 1,
        attributes: {
          ...prev.attributes,
          [attr]: prev.attributes[attr] + 1
        }
      }));
      addNotification(`ATRIBUTO ${attr.toUpperCase()} AUMENTADO.`, 'systemLogs');
      setTimeout(() => setAttrUpdateKey(null), 600);
    }
  };

  const buyItem = (item: InventoryItem) => {
    if (!item.price) return;
    if (stats.gold >= item.price) {
      const newItem = { ...item, id: Math.random().toString(36).substr(2, 9) };
      setStats(prev => ({ ...prev, gold: prev.gold - item.price! }));
      setInventory(prev => [newItem, ...prev]);
      updateSystemLog(`LOJA: ADQUIRIDO [${item.name}].`, 'itemDrop');
    } else {
      updateSystemLog("SISTEMA: OURO INSUFICIENTE.", 'systemLogs');
    }
  };

  const applyStatus = (target: 'PLAYER' | 'BOSS', type: StatusType, duration: number) => {
      const effect: StatusEffect = {
          id: Math.random().toString(36).substr(2, 9),
          type,
          name: type,
          duration,
          description: `Efeito de ${type} ativo.`
      };

      if (target === 'PLAYER') {
          setStats(prev => ({
              ...prev,
              activeEffects: [...prev.activeEffects, effect]
          }));
      } else if (activeDungeon) {
          setActiveDungeon(prev => prev ? ({
              ...prev,
              bossEffects: [...prev.bossEffects, effect]
          }) : null);
      }
  };

  const useItem = (itemId: string) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item || item.type !== 'CONSUMÍVEL' || consumingItemId) return;

    setConsumingItemId(itemId);
    
    setTimeout(() => {
        setInventory(prev => prev.filter(i => i.id !== itemId));
        setConsumingItemId(null);
        if (selectedItemId === itemId) setSelectedItemId(null);
        
        setStats(prev => {
          const next = { ...prev };
          const itemName = item.name.toLowerCase();
          
          if (itemName.includes('soro')) {
              next.fatigue = Math.max(0, next.fatigue - 25);
          } else if (itemName.includes('essência')) {
              next.fatigue = Math.max(0, next.fatigue - 60);
          } else if (itemName.includes('bebida') || itemName.includes('energética')) {
              next.fatigue = 0;
              next.hp = next.maxHp;
              next.mp = next.maxMp;
              next.activeEffects = [];
          } else if (itemName.includes('vida')) {
              next.hp = Math.min(next.maxHp, next.hp + 30);
          } else if (itemName.includes('mana') || itemName.includes('elixir')) {
              next.mp = Math.min(next.maxMp, next.mp + 80);
          }

          return next;
        });

        updateSystemLog(`SISTEMA: [${item.name}] utilizado.`, 'systemLogs');
    }, 600);
  };

  const useSkill = (skill: Skill) => {
      if (isEditingSkills) return;
      if (stats.level < skill.requiredLevel) {
          updateSystemLog(`SISTEMA: NÍVEL ${skill.requiredLevel} NECESSÁRIO.`, 'systemLogs');
          return;
      }
      if (stats.mp < skill.mpCost) {
          updateSystemLog("SISTEMA: MANA INSUFICIENTE.", 'systemLogs');
          return;
      }
      if (stats.fatigue >= stats.maxFatigue) {
          updateSystemLog("SISTEMA: JOGADOR EXAUSTO.", 'systemLogs');
          return;
      }
      if (stats.activeEffects.some(e => e.type === 'ATORDOADO')) {
          updateSystemLog("SISTEMA: VOCÊ ESTÁ ATORDOADO.", 'systemLogs');
          return;
      }

      setStats(prev => ({
          ...prev,
          mp: prev.mp - skill.mpCost,
          fatigue: Math.min(prev.maxFatigue, prev.fatigue + skill.fatigueCost)
      }));

      if (skill.name === 'Surto de Vitalidade') {
          applyStatus('PLAYER', 'FORTALECIDO', 10);
      } else if (activeDungeon) {
          const damage = effectiveAttributes.strength * 5;
          setActiveDungeon(prev => prev ? ({ ...prev, bossHp: Math.max(0, prev.bossHp - damage) }) : null);
          if (skill.statusToApply) {
              applyStatus('BOSS', skill.statusToApply, 5);
          }
          updateSystemLog(`DANO CAUSADO: ${damage.toLocaleString()}.`, 'systemLogs');
      }

      updateSystemLog(`SISTEMA: HABILIDADE [${skill.name.toUpperCase()}] ATIVADA.`, 'systemLogs');
  };

  const updateQuestProgress = (id: string, amount: number) => {
    if (isEditingQuests) return;
    if (stats.fatigue >= stats.maxFatigue) {
        updateSystemLog("SISTEMA: ALERTA! FADIGA CRÍTICA.", 'systemLogs');
        return;
    }

    setQuests(prev => prev.map(q => {
      if (q.id === id) {
        const newCurrent = Math.min(q.target, Math.max(0, q.current + amount));
        if (amount > 0 && newCurrent > q.current) {
            setStats(s => {
                let newExp = s.exp + (amount * (q.expReward || 2));
                let newLevel = s.level;
                let newPoints = s.points;
                let newMaxExp = s.maxExp;

                while (newExp >= newMaxExp) {
                  const previouslyUnlockedCount = skills.filter(sk => newLevel >= sk.requiredLevel).length;
                  
                  newLevel++;
                  newExp -= newMaxExp;
                  newMaxExp = Math.floor(newMaxExp * 1.5);
                  newPoints += 5;
                  
                  const currentlyUnlockedCount = skills.filter(sk => newLevel >= sk.requiredLevel).length;
                  if (currentlyUnlockedCount > previouslyUnlockedCount) {
                      const latestSkill = skills.find(sk => sk.requiredLevel === newLevel);
                      if (latestSkill) {
                          setTimeout(() => updateSystemLog(`NOVA HABILIDADE DESBLOQUEADA: [${latestSkill.name.toUpperCase()}]`, 'levelUp'), 500);
                      }
                  }

                  updateSystemLog(`LEVEL UP! NÍVEL ${newLevel}.`, 'levelUp');
                }

                return { 
                    ...s, 
                    exp: newExp, 
                    level: newLevel, 
                    points: newPoints,
                    maxExp: newMaxExp,
                    fatigue: Math.min(s.maxFatigue, s.fatigue + (amount * (q.fatigueCost || 1)))
                };
            });

            if (newCurrent >= q.target) {
                updateSystemLog(`PROTOCOLO CONCLUÍDO: [${q.name.toUpperCase()}]`, 'questProgress');
            }
        }
        return { ...q, current: newCurrent };
      }
      return q;
    }));
  };

  const checkPenalty = () => {
    const allCompleted = quests.every(q => q.current >= q.target);
    if (allCompleted) {
        setQuests(prev => prev.map(q => ({ ...q, current: 0 })));
        setStats(prev => ({ 
            ...prev, 
            fatigue: 0, 
            gold: prev.gold + 1000,
            exp: prev.exp + 500 
        }));
        updateSystemLog("MISSÃO DIÁRIA CONCLUÍDA. RECOMPENSAS ENTREGUES.", 'questProgress');
    } else {
        updateSystemLog("MISSÃO INCOMPLETA. INICIANDO PENALIDADE.", 'systemLogs');
        setIsPenaltyActive(true);
        setPenaltyProgress(0);
    }
  };

  const runPenalty = () => {
    setPenaltyProgress(prev => {
        const next = prev + 2;
        if (next >= 100) {
            setIsPenaltyActive(false);
            setQuests(prev => prev.map(q => ({ ...q, current: 0 })));
            setStats(prevStats => ({ ...prevStats, fatigue: 95, hp: 5 }));
            updateSystemLog("PENALIDADE SOBREVIVIDA.", 'systemLogs');
            return 0;
        }
        return next;
    });
  };

  const handleEnterDungeon = async () => {
    if (stats.fatigue >= stats.maxFatigue) {
        updateSystemLog("SISTEMA: ACESSO NEGADO. JOGADOR EXAUSTO.", 'systemLogs');
        return;
    }

    setIsGenerating(true);
    setLastLoot(null);
    setShowLootEffect(false);
    try {
      const dungeon = await generateDungeon(stats);
      setActiveDungeon(dungeon);
      setStats(s => ({ ...s, fatigue: Math.min(s.maxFatigue, s.fatigue + 15) }));
      const msg = await getSystemMessage(stats, `Entrou na Masmorra Rank-${dungeon.rank}: ${dungeon.name}`);
      updateSystemLog(msg, 'dungeonAvailable');
    } catch (error) {
      updateSystemLog("SISTEMA: ERRO DE CONEXÃO.", 'systemLogs');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearDungeon = async () => {
    if (!activeDungeon) return;
    if (activeDungeon.bossHp > 0) {
        updateSystemLog(`SISTEMA: O CHEFE [${activeDungeon.boss}] IMPEDE SUA SAÍDA.`, 'systemLogs');
        const damage = 15;
        setStats(prev => ({ ...prev, hp: Math.max(0, prev.hp - damage) }));
        applyStatus('PLAYER', 'ENVENENADO', 5);
        return;
    }

    setIsGenerating(true);
    try {
      const loot = await generateLoot(activeDungeon.rank);
      setInventory(prev => [loot, ...prev]);
      setLastLoot(loot);
      
      const rankValue = activeDungeon.rank.charCodeAt(0);
      const goldGain = (90 - rankValue) * 600; 
      const expGain = 30 * (activeDungeon.rank === 'S' ? 15 : (activeDungeon.rank.charCodeAt(0) - 64));

      setStats(prev => {
        let newExp = prev.exp + expGain;
        let newLevel = prev.level;
        let newPoints = prev.points;
        let newMaxExp = prev.maxExp;

        while (newExp >= newMaxExp) {
          newLevel++;
          newExp -= newMaxExp;
          newMaxExp = Math.floor(newMaxExp * 1.6);
          newPoints += 5;
        }

        return {
          ...prev,
          level: newLevel,
          exp: newExp,
          maxExp: newMaxExp,
          points: newPoints,
          gold: prev.gold + goldGain,
          fatigue: Math.min(prev.maxFatigue, prev.fatigue + 30)
        };
      });

      updateSystemLog(`INSTÂNCIA LIMPA: [${loot.name}] ADQUIRIDO.`, 'itemDrop');
      setShowLootEffect(true);
      setActiveDungeon(null);
    } catch (error) {
      updateSystemLog("SISTEMA: FALHA AO REIVINDICAR.", 'systemLogs');
    } finally {
      setIsGenerating(false);
    }
  };

  const radarData = [
    { subject: 'FOR', A: effectiveAttributes.strength, fullMark: 100 },
    { subject: 'AGI', A: effectiveAttributes.agility, fullMark: 100 },
    { subject: 'VIT', A: effectiveAttributes.vitality, fullMark: 100 },
    { subject: 'INT', A: effectiveAttributes.intelligence, fullMark: 100 },
    { subject: 'SEN', A: effectiveAttributes.sense, fullMark: 100 },
  ];

  const handleAddQuest = () => {
      const newQuest: DailyQuest = {
          id: Math.random().toString(36).substr(2, 9),
          name: 'Nova Missão',
          target: 100,
          current: 0,
          unit: 'reps',
          expReward: 2,
          fatigueCost: 1
      };
      setQuests([...quests, newQuest]);
  };

  const handleRemoveQuest = (id: string) => {
      setQuests(quests.filter(q => q.id !== id));
  };

  const handleAddSkill = () => {
      const newSkill: Skill = {
          id: Math.random().toString(36).substr(2, 9),
          name: 'Nova Habilidade',
          description: 'Descrição da habilidade...',
          mpCost: 10,
          fatigueCost: 5,
          effect: 'Dano',
          requiredLevel: stats.level
      };
      setSkills([...skills, newSkill]);
  };

  const handleRemoveSkill = (id: string) => {
      setSkills(skills.filter(s => s.id !== id));
  };

  if (isPenaltyActive) {
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-red-900/20 animate-pulse"></div>
            <div className="z-10 text-center max-w-lg w-full">
                <h1 className="system-font text-5xl text-red-600 font-black mb-4 glow-red">ZONA DE PENALIDADE</h1>
                <p className="text-red-400 mb-12 uppercase tracking-[0.4em] font-bold text-xs animate-pulse">Sobreviva ao Deserto das Sombras</p>
                
                <div className="system-bg system-border border-red-600 p-8 rounded-lg mb-8 shadow-[0_0_50px_rgba(220,38,38,0.2)]">
                    <p className="text-white text-sm mb-6 leading-relaxed italic opacity-80">
                        "O Jogador negligenciou sua evolução. A morte é a única alternativa para os fracos nesta zona."
                    </p>
                    <div className="h-5 w-full bg-slate-950 rounded-full border border-red-900 overflow-hidden mb-8">
                        <div className="h-full bg-red-600 shadow-[0_0_20px_red] transition-all duration-150" style={{ width: `${penaltyProgress}%` }}></div>
                    </div>
                    <button 
                        onClick={runPenalty}
                        className="w-full py-6 bg-red-600 hover:bg-red-500 text-white system-font font-black rounded shadow-[0_0_40px_rgba(220,38,38,0.6)] transition-all animate-bounce uppercase tracking-widest text-lg"
                    >
                        LUTAR PELA VIDA
                    </button>
                </div>
            </div>
        </div>
    );
  }

  return (
    <Layout onSave={handleManualSave}>
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleImageUpload} 
      />

      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none w-full max-w-md px-4">
        {notifications.map((n) => (
          <div key={n.id} className="system-bg border-2 border-sky-400/80 p-4 rounded shadow-[0_0_30px_rgba(14,165,233,0.3)] animate-fadeInUp flex items-center gap-3 backdrop-blur-xl">
             <div className="w-1.5 h-8 bg-sky-400 animate-pulse"></div>
             <p className="system-font text-xs text-sky-100 font-black uppercase tracking-widest leading-tight">
                 {n.message}
             </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        
        <div className="lg:col-span-3 space-y-4">
          <div className="system-bg system-border rounded p-4">
            <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-sky-400 uppercase font-bold tracking-widest">Saldo Atual</span>
                    <span className="text-yellow-400 font-bold system-font text-sm">G {stats.gold.toLocaleString()}</span>
                </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-[10px] text-sky-400 mb-1">
                <span>NÍVEL {stats.level}</span>
                <span>EXP {Math.floor((stats.exp / stats.maxExp) * 100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-sky-500 shadow-[0_0_8px_#0ea5e9] transition-all duration-500" 
                  style={{ width: `${(stats.exp / stats.maxExp) * 100}%` }}
                />
              </div>
            </div>

            <nav className="space-y-2">
              {(['STATUS', 'QUEST', 'INVENTÁRIO', 'DUNGEON', 'LOJA'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-all duration-200 border-l-2 ${
                    activeTab === tab 
                      ? 'bg-sky-500/10 border-sky-500 text-sky-400 shadow-[inset_4px_0_15px_-5px_#0ea5e9]' 
                      : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {ICONS[tab as keyof typeof ICONS]}
                  <span className="system-font text-sm font-bold uppercase">{tab}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="system-bg system-border rounded p-4">
            <h3 className="system-font text-[10px] text-sky-400 mb-2 uppercase tracking-[0.2em]">Efeitos Ativos</h3>
            <div className="space-y-2">
                {stats.activeEffects.length === 0 ? (
                    <p className="text-[9px] text-slate-600 uppercase">Nenhum efeito neural detectado.</p>
                ) : (
                    stats.activeEffects.map(e => (
                        <div key={e.id} className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-slate-800">
                            <span className={`text-[9px] font-bold ${e.type === 'QUEIMANDO' ? 'text-orange-500' : e.type === 'ENVENENADO' ? 'text-green-500' : 'text-sky-400'}`}>{e.name}</span>
                            <span className="text-[9px] text-slate-500 font-mono">{e.duration}s</span>
                        </div>
                    ))
                )}
            </div>
          </div>

          <div className="system-bg system-border rounded p-4">
            <h3 className="system-font text-xs text-sky-400 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
              REGISTROS DO SISTEMA
            </h3>
            <div className="bg-black/50 p-3 rounded border border-sky-500/10 h-32 overflow-y-auto text-xs leading-relaxed font-mono text-sky-200/80 uppercase whitespace-pre-wrap scroll-smooth">
              {systemMessage}
              {penaltyMultiplier < 1 && (
                  <div className="mt-2 text-red-500 font-black animate-pulse">
                      [ALERTA: PENALIDADE DE FADIGA ATIVA - ATRIBUTOS REDUZIDOS]
                  </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-9 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="system-bg system-border rounded p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="system-font text-xs font-bold text-red-500 uppercase tracking-tighter">PV</span>
                <span className="text-xs font-mono">{stats.hp} / {stats.maxHp}</span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded border border-slate-700">
                <div className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" style={{ width: `${(stats.hp / stats.maxHp) * 100}%` }} />
              </div>
            </div>
            <div className="system-bg system-border rounded p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="system-font text-xs font-bold text-sky-500 uppercase tracking-tighter">PM</span>
                <span className="text-xs font-mono">{stats.mp} / {stats.maxMp}</span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded border border-slate-700">
                <div className="h-full bg-gradient-to-r from-sky-600 to-sky-400 transition-all duration-500 shadow-[0_0_8px_rgba(14,165,233,0.4)]" style={{ width: `${(stats.mp / stats.maxMp) * 100}%` }} />
              </div>
            </div>
            <div className="system-bg system-border rounded p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="system-font text-xs font-bold text-purple-500 uppercase tracking-tighter">FADIGA</span>
                <span className="text-xs font-mono">{stats.fatigue} / {stats.maxFatigue}</span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded border border-slate-700 overflow-hidden">
                <div 
                    className={`h-full transition-all duration-500 ${stats.fatigue >= 80 ? 'bg-red-600 animate-pulse shadow-[0_0_15px_red]' : 'bg-purple-600 shadow-[0_0_8px_rgba(168,85,247,0.4)]'}`} 
                    style={{ width: `${(stats.fatigue / stats.maxFatigue) * 100}%` }} 
                />
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-[500px]">
            {activeTab === 'STATUS' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                <div className="system-bg system-border rounded p-6">
                  <div className="flex justify-between items-center mb-6 border-b border-sky-500/20 pb-2">
                    <h2 className="system-font text-xl uppercase tracking-tighter">Perfil do Caçador</h2>
                    <button 
                      onClick={() => setIsEditingProfile(!isEditingProfile)}
                      className="text-[10px] text-sky-400 hover:text-white uppercase border border-sky-500/30 px-3 py-1 rounded transition-all bg-sky-500/5"
                    >
                      {isEditingProfile ? 'SALVAR' : 'EDITAR'}
                    </button>
                  </div>
                  
                  <div className="flex flex-col items-center mb-20 py-4">
                     <AvatarDisplay stats={stats} onUpload={() => fileInputRef.current?.click()} />
                  </div>

                  <div className="space-y-4">
                    <div className="border-b border-slate-800 pb-4">
                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest block mb-3">Sintonização de Aura</span>
                      <div className="flex flex-wrap gap-2">
                        {(['DOMINANTE', 'SOMBRAS', 'DIVINA', 'SANGUE', 'GELO', 'RELÂMPAGO'] as const).map((type) => (
                          <button
                            key={type}
                            onClick={() => setStats(prev => ({ ...prev, preferredAuraType: type }))}
                            className={`text-[9px] font-black px-3 py-1.5 rounded-lg border transition-all ${
                                stats.preferredAuraType === type 
                                ? 'bg-sky-500/20 border-sky-500 text-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.3)]' 
                                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    {[
                      { label: 'Nome do Monarca', key: 'playerName' },
                      { label: 'Título Adquirido', key: 'title' },
                      { label: 'Ocupação Neural', key: 'job' }
                    ].map(field => (
                      <div key={field.key} className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <span className="text-slate-400 text-xs uppercase font-bold tracking-widest">{field.label}</span>
                        {isEditingProfile ? (
                          <input 
                            type="text"
                            value={(stats as any)[field.key]}
                            onChange={(e) => setStats(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="bg-slate-800 text-white font-bold text-right text-sm px-2 py-1 rounded border border-sky-500/30 focus:outline-none focus:border-sky-500 w-1/2"
                          />
                        ) : (
                          <span className={`font-black uppercase text-sm ${field.key === 'title' ? 'text-sky-400 glow-blue' : 'text-white'}`}>
                            {(stats as any)[field.key]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Sincronização de Notificações */}
                  <div className="mt-8 pt-6 border-t border-slate-800">
                    <h3 className="system-font text-xs text-sky-400 uppercase tracking-[0.2em] font-black mb-4">Configurações do Sistema</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { key: 'levelUp', label: 'Evolução de Nível' },
                        { key: 'dungeonAvailable', label: 'Portais Identificados' },
                        { key: 'itemDrop', label: 'Saques e Tesouros' },
                        { key: 'questProgress', label: 'Progresso de Protocolo' },
                        { key: 'systemLogs', label: 'Registros Gerais' }
                      ].map(setting => (
                        <div key={setting.key} className="flex justify-between items-center bg-slate-900/40 p-3 rounded border border-slate-800 hover:border-sky-500/20 transition-all group">
                          <div className="flex items-center gap-3">
                            <div className={`w-1.5 h-1.5 rounded-full ${stats.notificationSettings[setting.key as keyof NotificationSettings] ? 'bg-sky-400 shadow-[0_0_8px_#0ea5e9]' : 'bg-slate-700'}`}></div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest group-hover:text-slate-200">{setting.label}</span>
                          </div>
                          <button 
                            onClick={() => toggleNotification(setting.key as keyof NotificationSettings)}
                            className={`w-10 h-5 rounded-full relative transition-all duration-300 ${stats.notificationSettings[setting.key as keyof NotificationSettings] ? 'bg-sky-600/40 border border-sky-500' : 'bg-slate-800 border border-slate-700'}`}
                          >
                            <div className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-all duration-300 ${stats.notificationSettings[setting.key as keyof NotificationSettings] ? 'right-1 bg-sky-400 shadow-[0_0_10px_#0ea5e9]' : 'left-1 bg-slate-600'}`}></div>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-800">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="system-font text-xs text-sky-400 uppercase tracking-[0.2em] font-black">Habilidades Disponíveis</h3>
                          <button 
                            onClick={() => setIsEditingSkills(!isEditingSkills)}
                            className="text-[9px] text-sky-400 hover:text-white uppercase border border-sky-500/20 px-3 py-1 rounded"
                          >
                            {isEditingSkills ? 'CONCLUIR' : 'EDITAR'}
                          </button>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                          {isEditingSkills && (
                              <button 
                                onClick={handleAddSkill}
                                className="w-full py-2 border-2 border-dashed border-sky-500/20 text-sky-400 text-[10px] font-black uppercase hover:bg-sky-500/10 transition-all rounded-lg mb-2"
                              >
                                + NOVA HABILIDADE
                              </button>
                          )}
                          
                          {skills.map((skill, index) => {
                              const isUnlocked = stats.level >= skill.requiredLevel;
                              return (
                                <div 
                                  key={skill.id}
                                  className={`flex flex-col p-3 rounded-lg border transition-all ${
                                      isUnlocked 
                                      ? 'bg-slate-900/50 border-slate-800' 
                                      : 'bg-slate-950/50 border-slate-900 opacity-60'
                                  } ${isEditingSkills ? 'border-sky-500/30' : ''}`}
                                >
                                    {isEditingSkills ? (
                                        <div className="space-y-2">
                                            <div className="flex justify-between gap-2">
                                                <input 
                                                    className="bg-slate-800 text-[10px] font-black uppercase text-sky-400 p-1 flex-1 rounded border border-sky-500/20"
                                                    value={skill.name}
                                                    onChange={(e) => {
                                                        const newSkills = [...skills];
                                                        newSkills[index].name = e.target.value;
                                                        setSkills(newSkills);
                                                    }}
                                                />
                                                <button onClick={() => handleRemoveSkill(skill.id)} className="text-red-500 text-xs">✕</button>
                                            </div>
                                            <textarea 
                                                className="bg-slate-800 text-[8px] text-slate-400 p-1 w-full rounded border border-sky-500/20"
                                                value={skill.description}
                                                onChange={(e) => {
                                                    const newSkills = [...skills];
                                                    newSkills[index].description = e.target.value;
                                                    setSkills(newSkills);
                                                }}
                                            />
                                            <div className="flex gap-2">
                                                <input 
                                                    type="number" 
                                                    className="bg-slate-800 text-[9px] p-1 w-1/4 rounded border border-sky-500/20" 
                                                    placeholder="MP"
                                                    value={skill.mpCost}
                                                    onChange={(e) => {
                                                        const newSkills = [...skills];
                                                        newSkills[index].mpCost = Number(e.target.value);
                                                        setSkills(newSkills);
                                                    }}
                                                />
                                                <input 
                                                    type="number" 
                                                    className="bg-slate-800 text-[9px] p-1 w-1/4 rounded border border-sky-500/20" 
                                                    placeholder="FAD"
                                                    value={skill.fatigueCost}
                                                    onChange={(e) => {
                                                        const newSkills = [...skills];
                                                        newSkills[index].fatigueCost = Number(e.target.value);
                                                        setSkills(newSkills);
                                                    }}
                                                />
                                                <input 
                                                    type="number" 
                                                    className="bg-slate-800 text-[9px] p-1 flex-1 rounded border border-sky-500/20" 
                                                    placeholder="Nível Req"
                                                    value={skill.requiredLevel}
                                                    onChange={(e) => {
                                                        const newSkills = [...skills];
                                                        newSkills[index].requiredLevel = Number(e.target.value);
                                                        setSkills(newSkills);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => useSkill(skill)}
                                            disabled={!isUnlocked}
                                            className="w-full text-left flex justify-between items-center group"
                                        >
                                            <div className="text-left">
                                                <div className={`text-[10px] font-black uppercase tracking-tighter ${isUnlocked ? 'text-sky-400 group-hover:text-white' : 'text-slate-600'}`}>
                                                    {skill.name}
                                                </div>
                                                <div className="text-[8px] text-slate-500 uppercase">{skill.description}</div>
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                {isUnlocked ? (
                                                    <>
                                                        <span className="text-[8px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">{skill.mpCost} PM</span>
                                                        <span className="text-[8px] bg-purple-900/30 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20">+{skill.fatigueCost} FAD</span>
                                                    </>
                                                ) : (
                                                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">NÍVEL {skill.requiredLevel} REQUERIDO</span>
                                                )}
                                            </div>
                                        </button>
                                    )}
                                </div>
                              );
                          })}
                      </div>
                  </div>
                </div>
                
                <div className="system-bg system-border rounded p-6">
                   <h2 className="system-font text-xl mb-8 w-full text-center border-b border-sky-500/20 pb-4 uppercase tracking-[0.3em]">Habilidades e Potencial</h2>
                   
                   <div className="w-full h-[320px] mb-8 relative chart-glow-filter">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="#1e293b" strokeDasharray="3 3" />
                        <PolarAngleAxis 
                            dataKey="subject" 
                            tick={({ x, y, payload }) => {
                                const isActive = hoveredAttr === payload.value || (payload.value === 'FOR' && hoveredAttr === 'strength') || (payload.value === 'AGI' && hoveredAttr === 'agility') || (payload.value === 'VIT' && hoveredAttr === 'vitality') || (payload.value === 'INT' && hoveredAttr === 'intelligence') || (payload.value === 'SEN' && hoveredAttr === 'sense');
                                return (
                                    <text 
                                        x={x} y={y} 
                                        textAnchor="middle" 
                                        fill={isActive ? '#0ea5e9' : '#64748b'} 
                                        fontSize={12} 
                                        fontWeight="900"
                                        className="transition-all duration-300"
                                        style={{ textShadow: isActive ? '0 0 10px rgba(14, 165, 233, 0.8)' : 'none' }}
                                    >
                                        {payload.value}
                                    </text>
                                );
                            }}
                        />
                        <RadarComponent
                          name="Status"
                          dataKey="A"
                          stroke={penaltyMultiplier < 1 ? "#ef4444" : "#0ea5e9"}
                          strokeWidth={4}
                          fill={penaltyMultiplier < 1 ? "#ef4444" : "#0ea5e9"}
                          fillOpacity={0.3}
                          animationDuration={1000}
                          animationEasing="ease-out"
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                    {/* Visual Grid Overlays */}
                    <div className="absolute inset-0 pointer-events-none border border-sky-500/5 rounded-full scale-[0.6] animate-pulse"></div>
                    <div className="absolute inset-0 pointer-events-none border border-sky-500/5 rounded-full scale-[0.8] animate-pulse" style={{ animationDelay: '1s' }}></div>
                  </div>

                  <div className="pt-4 border-t border-slate-800">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                            <p className="text-[10px] text-sky-400 uppercase font-black tracking-[0.2em]">Pontos de Evolução</p>
                            <p className="system-font text-2xl font-black text-white">{stats.points}</p>
                        </div>
                        <div className="h-10 w-px bg-slate-800"></div>
                        <div className="text-right">
                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">Total Acumulado</p>
                            <p className="system-font text-xl font-black text-slate-400">
                                {Object.values(stats.attributes).reduce((a, b) => a + b, 0)}
                            </p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {[
                          { key: 'strength', label: 'Força', code: 'FOR', color: 'from-red-600 to-red-400' },
                          { key: 'agility', label: 'Agilidade', code: 'AGI', color: 'from-cyan-600 to-cyan-400' },
                          { key: 'vitality', label: 'Vitalidade', code: 'VIT', color: 'from-emerald-600 to-emerald-400' },
                          { key: 'intelligence', label: 'Inteligência', code: 'INT', color: 'from-violet-600 to-violet-400' },
                          { key: 'sense', label: 'Sentido', code: 'SEN', color: 'from-amber-600 to-amber-400' }
                        ].map(attr => (
                          <div 
                            key={attr.key} 
                            className={`relative p-3 rounded-xl border border-transparent transition-all duration-300 group ${hoveredAttr === attr.key ? 'bg-sky-500/5 border-sky-500/20 translate-x-2' : ''} ${attrUpdateKey === attr.key ? 'animate-attr-update' : ''}`}
                            onMouseEnter={() => setHoveredAttr(attr.key)}
                            onMouseLeave={() => setHoveredAttr(null)}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-3">
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black system-font border border-slate-800 ${hoveredAttr === attr.key ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' : 'bg-slate-900 text-slate-500'}`}>
                                    {attr.code}
                                </span>
                                <span className="text-xs text-slate-400 font-black uppercase tracking-widest group-hover:text-slate-200 transition-colors">
                                    {attr.label}
                                    {penaltyMultiplier < 1 && <span className="text-[8px] text-red-500 ml-2 animate-pulse">(-{(100 - penaltyMultiplier * 100).toFixed(0)}%)</span>}
                                </span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className={`system-font font-black text-xl ${penaltyMultiplier < 1 ? 'text-red-500' : 'text-sky-400'} ${attrUpdateKey === attr.key ? 'scale-125' : ''} transition-transform`}>
                                    {(effectiveAttributes as any)[attr.key]}
                                </span>
                                <button 
                                  onClick={() => addPoint(attr.key as keyof PlayerStats['attributes'])}
                                  disabled={stats.points === 0}
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all ${
                                    stats.points > 0 
                                    ? 'border-sky-500 text-sky-400 hover:bg-sky-500 hover:text-white shadow-[0_0_15px_rgba(14,165,233,0.3)] hover:scale-110' 
                                    : 'border-slate-800 text-slate-800 cursor-not-allowed opacity-30'
                                  }`}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            {/* Attribute Power Bar */}
                            <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full bg-gradient-to-r ${attr.color} transition-all duration-1000 shadow-[0_0_10px_currentColor] opacity-60 group-hover:opacity-100`}
                                    style={{ width: `${Math.min(100, ((stats.attributes as any)[attr.key] / 200) * 100)}%` }}
                                />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                </div>
              </div>
            )}

            {activeTab === 'LOJA' && (
              <div className="animate-fadeIn">
                <div className="system-bg system-border rounded p-6">
                  <div className="flex justify-between items-center mb-6 border-b border-sky-500/20 pb-4">
                    <h2 className="system-font text-xl uppercase tracking-[0.2em]">Loja Dimensional</h2>
                    <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-full border border-yellow-500/30">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Saldo:</span>
                        <span className="text-yellow-400 font-black system-font tracking-tighter">G {stats.gold.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                    {SHOP_ITEMS.map((item) => (
                      <div key={item.id} className="bg-slate-900/60 border border-slate-800 rounded-xl group hover:border-sky-500/50 transition-all flex flex-col hover:shadow-[0_0_20px_rgba(14,165,233,0.1)] overflow-hidden min-h-[160px] p-5">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[8px] bg-slate-800 px-3 py-1 rounded-full text-slate-400 font-black uppercase tracking-widest border border-slate-700/50">{item.type}</span>
                          <div className={`text-[9px] font-black px-4 py-1 rounded-full border bg-slate-950/90 backdrop-blur-md shadow-2xl ${
                            item.rarity === 'S' ? 'border-orange-500 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.4)]' :
                            item.rarity === 'A' ? 'border-purple-500 text-purple-400' :
                            item.rarity === 'B' ? 'border-blue-500 text-blue-400' :
                            item.rarity === 'C' ? 'border-sky-500 text-sky-400' :
                            'border-slate-700 text-slate-400'
                          }`}>RANK {item.rarity}</div>
                        </div>
                        <h4 className="font-black text-sky-400 text-base mb-1 group-hover:text-white transition-colors uppercase tracking-tight">{item.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 flex-grow italic leading-relaxed">"{item.description}"</p>
                        <button 
                          onClick={() => buyItem(item)}
                          disabled={stats.gold < (item.price || 0)}
                          className={`mt-5 w-full py-3 rounded-lg text-xs font-black system-font transition-all border-2 ${
                            stats.gold >= (item.price || 0)
                            ? 'bg-sky-600/10 border-sky-500/60 text-sky-400 hover:bg-sky-500 hover:text-white shadow-[0_5px_15px_rgba(14,165,233,0.2)] tracking-[0.2em] uppercase'
                            : 'bg-slate-900/80 border-slate-800 text-slate-700 cursor-not-allowed'
                          }`}
                        >
                          ADQUIRIR - G {item.price?.toLocaleString()}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'QUEST' && (
              <div className="animate-fadeIn">
                <div className="system-bg system-border rounded p-6 overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                     <span className="system-font text-6xl font-black uppercase">PROTOCOL</span>
                  </div>

                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-sky-500/20 pb-6 relative z-10">
                    <div>
                      <h2 className="system-font text-2xl uppercase tracking-[0.3em] glow-blue">Protocolo de Treino</h2>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Status Diário: {quests.every(q => q.current >= q.target) ? 'Sincronizado' : 'Aguardando Evolução'}</p>
                    </div>
                    <div className="flex gap-4 mt-4 md:mt-0">
                        <button 
                            onClick={() => setIsEditingQuests(!isEditingQuests)}
                            className={`text-[9px] font-black uppercase border px-4 py-2 rounded-lg transition-all ${isEditingQuests ? 'bg-sky-500 text-white border-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.5)]' : 'text-sky-400 border-sky-500/20 hover:bg-sky-500/10'}`}
                        >
                            {isEditingQuests ? 'SALVAR DEFINIÇÕES' : 'MODIFICAR PROTOCOLOS'}
                        </button>
                        <button 
                            onClick={checkPenalty}
                            disabled={isEditingQuests}
                            className={`text-[11px] px-8 py-2 rounded-lg system-font font-black transition-all tracking-widest uppercase border-2 ${
                                quests.every(q => q.current >= q.target) 
                                ? 'bg-green-600/20 text-green-400 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:bg-green-500 hover:text-white' 
                                : 'bg-slate-900 text-slate-500 border-slate-800'
                            } ${isEditingQuests ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                            ENCERRAR DIA
                        </button>
                    </div>
                  </div>
                  
                  <div className="space-y-6 max-h-[550px] overflow-y-auto pr-4 custom-scrollbar relative z-10">
                    {isEditingQuests && (
                        <div className="bg-sky-500/5 border-2 border-dashed border-sky-500/20 rounded-xl p-4 mb-4">
                            <p className="text-[10px] text-sky-400 uppercase font-black mb-3 text-center tracking-widest">Configuração do Terminal de Missões</p>
                            <button 
                                onClick={handleAddQuest}
                                className="w-full py-4 bg-sky-500/10 text-sky-400 text-xs font-black uppercase hover:bg-sky-500/20 transition-all rounded-lg border border-sky-500/30"
                            >
                                + INJETAR NOVO PROTOCOLO
                            </button>
                        </div>
                    )}
                    
                    {quests.map((q, index) => {
                      const isComplete = q.current >= q.target;
                      return (
                        <div key={q.id} className={`group relative p-5 rounded-2xl border transition-all duration-500 ${isEditingQuests ? 'border-sky-500/40 bg-slate-900/60 font-mono' : isComplete ? 'quest-completed-card' : 'border-slate-800 bg-slate-900/30 hover:border-sky-500/30'}`}>
                          {isEditingQuests ? (
                              <div className="space-y-4">
                                  <div className="flex justify-between gap-4">
                                      <div className="flex-1 flex items-center gap-2">
                                          <span className="text-[10px] text-sky-500">ID:{(index+1).toString().padStart(2,'0')}</span>
                                          <input 
                                              className="bg-slate-950 text-sm font-black text-white p-2 rounded border border-sky-500/20 w-full focus:border-sky-500 outline-none"
                                              placeholder="NOME_MISAO"
                                              value={q.name}
                                              onChange={(e) => {
                                                  const newQuests = [...quests];
                                                  newQuests[index].name = e.target.value;
                                                  setQuests(newQuests);
                                              }}
                                          />
                                      </div>
                                      <button onClick={() => handleRemoveQuest(q.id)} className="text-red-500 hover:bg-red-500/10 p-2 rounded transition-colors">✕</button>
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                      <div>
                                          <label className="text-[8px] text-slate-500 block mb-1 uppercase font-black">META_VAL</label>
                                          <input 
                                              type="number"
                                              className="bg-slate-950 text-xs text-white p-2 rounded border border-sky-500/10 w-full"
                                              value={q.target}
                                              onChange={(e) => {
                                                  const newQuests = [...quests];
                                                  newQuests[index].target = Number(e.target.value);
                                                  setQuests(newQuests);
                                              }}
                                          />
                                      </div>
                                      <div>
                                          <label className="text-[8px] text-slate-500 block mb-1 uppercase font-black">UNI_MEASURE</label>
                                          <input 
                                              className="bg-slate-950 text-xs text-white p-2 rounded border border-sky-500/10 w-full"
                                              value={q.unit}
                                              onChange={(e) => {
                                                  const newQuests = [...quests];
                                                  newQuests[index].unit = e.target.value;
                                                  setQuests(newQuests);
                                              }}
                                          />
                                      </div>
                                      <div>
                                          <label className="text-[8px] text-sky-500 block mb-1 uppercase font-black">XP_GAIN</label>
                                          <input 
                                              type="number"
                                              className="bg-slate-950 text-xs text-sky-400 p-2 rounded border border-sky-500/10 w-full"
                                              value={q.expReward}
                                              onChange={(e) => {
                                                  const newQuests = [...quests];
                                                  newQuests[index].expReward = Number(e.target.value);
                                                  setQuests(newQuests);
                                              }}
                                          />
                                      </div>
                                      <div>
                                          <label className="text-[8px] text-purple-500 block mb-1 uppercase font-black">FAT_COST</label>
                                          <input 
                                              type="number"
                                              className="bg-slate-950 text-xs text-purple-400 p-2 rounded border border-sky-500/10 w-full"
                                              value={q.fatigueCost}
                                              onChange={(e) => {
                                                  const newQuests = [...quests];
                                                  newQuests[index].fatigueCost = Number(e.target.value);
                                                  setQuests(newQuests);
                                              }}
                                          />
                                      </div>
                                  </div>
                              </div>
                          ) : (
                              <>
                                  <div className="flex justify-between items-start mb-4">
                                      <div className="flex flex-col">
                                          <div className="flex items-center gap-3">
                                              {isComplete && (
                                                  <div className="bg-green-500 text-white p-1 rounded-full animate-bounce">
                                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                                      </svg>
                                                  </div>
                                              )}
                                              <span className={`font-black uppercase tracking-widest text-lg ${isComplete ? 'text-green-400' : 'text-slate-100'}`}>{q.name}</span>
                                          </div>
                                          <div className="flex items-center gap-4 mt-1">
                                              <span className="text-[9px] text-slate-500 uppercase tracking-[0.2em] font-bold">Recompensa: <span className="text-sky-400">+{q.expReward * (q.target - q.current) > 0 ? q.expReward : 0} XP Pendente</span></span>
                                              <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                              <span className="text-[9px] text-slate-500 uppercase tracking-[0.2em] font-bold">Custo: <span className="text-purple-400">+{q.fatigueCost} FAD / un</span></span>
                                          </div>
                                      </div>
                                      <div className="flex flex-col items-end">
                                          <span className={`text-xl font-black system-font ${isComplete ? 'text-green-400' : 'text-sky-400'}`}>
                                              {q.current} <span className="text-xs opacity-50">/ {q.target}</span>
                                          </span>
                                          <span className="text-[9px] text-slate-500 uppercase font-black tracking-tighter">{q.unit.toUpperCase()}</span>
                                      </div>
                                  </div>

                                  <div className="flex items-center gap-6">
                                    <div className="flex-1 h-6 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden relative shadow-inner">
                                      <div 
                                        className={`h-full transition-all duration-700 relative ${isComplete ? 'bg-gradient-to-r from-green-600 to-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'bg-gradient-to-r from-sky-600 to-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.3)]'}`}
                                        style={{ width: `${Math.min(100, (q.current / q.target) * 100)}%` }}
                                      >
                                          {!isComplete && <div className="progress-spark-effect"></div>}
                                      </div>
                                      {/* Completion Overlay */}
                                      {isComplete && (
                                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                              <span className="text-[8px] text-white font-black uppercase tracking-[0.5em] glow-blue">PROTOCOLO_FINALIZADO</span>
                                          </div>
                                      )}
                                    </div>

                                    <div className="flex gap-2">
                                      <button 
                                        onClick={() => updateQuestProgress(q.id, -1)}
                                        className="w-12 h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-500 border border-slate-800 transition-all font-black text-xl hover:scale-105 active:scale-95"
                                      >-</button>
                                      <button 
                                        onClick={() => updateQuestProgress(q.id, 1)}
                                        disabled={isComplete}
                                        className={`w-12 h-12 rounded-xl border transition-all font-black text-xl hover:scale-110 active:scale-90 shadow-lg flex items-center justify-center ${
                                            isComplete 
                                            ? 'bg-slate-950 border-slate-900 text-slate-800 cursor-not-allowed' 
                                            : 'bg-sky-600/20 hover:bg-sky-500/40 text-sky-400 border-sky-500/40'
                                        }`}
                                      >
                                          {isComplete ? '✓' : '+'}
                                      </button>
                                    </div>
                                  </div>
                              </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Decorative Elements */}
                  <div className="mt-8 border-t border-sky-500/10 pt-4 flex justify-between items-center opacity-40">
                      <div className="flex gap-2">
                          <div className="w-1 h-1 bg-sky-400 rounded-full animate-ping"></div>
                          <div className="w-1 h-1 bg-sky-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
                          <div className="w-1 h-1 bg-sky-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-widest">Sincronização de Protocolo Diário v.2.4</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'INVENTÁRIO' && (
              <div className="animate-fadeIn">
                <div className="system-bg system-border rounded p-6">
                  <h2 className="system-font text-xl mb-8 flex items-center gap-2 border-b border-sky-500/20 pb-4 uppercase tracking-[0.2em]">
                    Cofre de Itens
                  </h2>
                  {inventory.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl uppercase text-xs tracking-[0.5em] font-black opacity-30">
                      Cofre Vazio
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {inventory.map((item) => (
                        <div 
                          key={item.id} 
                          onClick={() => setSelectedItemId(selectedItemId === item.id ? null : item.id)}
                          className={`bg-slate-900/60 border border-slate-800 rounded-2xl group transition-all flex flex-col relative overflow-hidden shadow-xl cursor-pointer hover:border-sky-500/40 ${selectedItemId === item.id ? 'item-selected' : ''} ${consumingItemId === item.id ? 'animate-shatter' : ''}`}
                        >
                          {/* Mana Resonance Wave Effect */}
                          {selectedItemId === item.id && (
                              <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                                  <div className="mana-ripple"></div>
                                  <div className="mana-ripple" style={{ animationDelay: '0.6s' }}></div>
                                  <div className="mana-ripple" style={{ animationDelay: '1.2s' }}></div>
                              </div>
                          )}

                          <div className="p-5 flex flex-col flex-1 relative z-10">
                            <div className="flex justify-between items-start mb-3 pointer-events-none">
                              <span className="text-[8px] bg-slate-800 px-3 py-1 rounded-full text-slate-500 font-black uppercase tracking-widest">{item.type}</span>
                              <span className={`text-[8px] font-black px-3 py-1 rounded-full border ${
                                item.rarity === 'S' ? 'border-orange-500 text-orange-400' :
                                item.rarity === 'A' ? 'border-purple-500 text-purple-400' :
                                'border-slate-700 text-slate-500'
                              }`}>RANK {item.rarity}</span>
                            </div>
                            <h4 className="font-black text-sky-400 text-base mb-2 group-hover:text-white transition-colors uppercase tracking-tight pointer-events-none">{item.name}</h4>
                            <p className="text-[10px] text-slate-500 mt-2 line-clamp-3 italic flex-grow leading-relaxed pointer-events-none">"{item.description}"</p>
                            
                            {item.type === 'CONSUMÍVEL' && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); useItem(item.id); }}
                                  disabled={consumingItemId !== null}
                                  className="mt-5 w-full py-3 bg-sky-600/10 border-2 border-sky-500/40 text-sky-400 text-[10px] font-black system-font hover:bg-sky-500 hover:text-white transition-all rounded-lg uppercase tracking-[0.3em] shadow-lg relative z-10 disabled:opacity-50"
                                >
                                  ATIVAR EFEITO
                                </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'DUNGEON' && (
              <div className="animate-fadeIn h-full relative">
                {showLootEffect && (
                    <div className="absolute inset-0 pointer-events-none z-[60] flex items-center justify-center">
                        {[...Array(40)].map((_, i) => (
                            <div 
                                key={i}
                                className="absolute w-2 h-2 rounded-full bg-yellow-500 animate-coin shadow-[0_0_5px_rgba(255,215,0,0.8)]"
                                style={{ 
                                    '--tw-translate-x': `${(Math.random() - 0.5) * 600}px`,
                                    '--tw-translate-y': `${(Math.random() - 0.5) * 600}px`,
                                    '--tw-rotate': `${Math.random() * 720}deg`,
                                    left: '50%',
                                    top: '50%',
                                    animationDelay: `${Math.random() * 0.2}s`
                                } as any}
                            ></div>
                        ))}
                    </div>
                )}

                {activeDungeon ? (
                  <div className="system-bg system-border rounded p-8 animate-pulse-border bg-slate-900/40 shadow-[0_0_50px_rgba(0,191,255,0.05)] border-l-4 border-l-sky-500">
                     <div className="flex justify-between items-start mb-8">
                        <div>
                          <span className={`px-6 py-1.5 rounded-full text-xs font-black system-font tracking-[0.3em] border-2 shadow-lg ${
                            activeDungeon.rank === 'S' ? 'border-orange-500 text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.4)]' :
                            activeDungeon.rank === 'A' ? 'border-purple-500 text-purple-400' :
                            'border-sky-500 text-sky-400'
                          }`}>RANK {activeDungeon.rank}</span>
                          <h2 className="system-font text-4xl mt-6 glow-blue tracking-tighter uppercase font-black">{activeDungeon.name}</h2>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-red-600 block font-black uppercase tracking-[0.4em] mb-2 animate-pulse">Chefe da Instância</span>
                          <span className="system-font text-2xl text-red-500 uppercase tracking-tighter font-black">{activeDungeon.boss}</span>
                        </div>
                     </div>

                     <div className="mb-8 relative overflow-hidden rounded-lg p-4 border border-slate-800 bg-slate-950/40">
                         <StatusVisualOverlay effects={activeDungeon.bossEffects} />

                         <div className="flex justify-between text-[10px] text-red-400 mb-2 font-black uppercase tracking-widest relative z-10">
                             <span>Integridade do Boss</span>
                             <span>{Math.ceil(activeDungeon.bossHp).toLocaleString()} / {activeDungeon.bossMaxHp.toLocaleString()} PV</span>
                         </div>
                         <div className="h-4 w-full bg-slate-950 rounded-full border border-red-900/30 overflow-hidden shadow-inner relative z-10">
                            <div 
                                className={`h-full bg-gradient-to-r from-red-800 to-red-500 transition-all duration-300 ${activeDungeon.bossEffects.some(e => e.type === 'ATORDOADO') ? 'grayscale' : ''}`}
                                style={{ width: `${(activeDungeon.bossHp / activeDungeon.bossMaxHp) * 100}%` }}
                            />
                         </div>
                         <div className="flex gap-2 mt-4 flex-wrap relative z-10">
                             {activeDungeon.bossEffects.map(e => (
                                 <span key={e.id} className={`text-[8px] font-black px-2 py-0.5 rounded border flex items-center gap-1 ${e.type === 'QUEIMANDO' ? 'border-orange-500 text-orange-400' : e.type === 'ENVENENADO' ? 'border-green-500 text-green-400' : 'border-yellow-500 text-yellow-400'}`}>
                                     <span className="w-1 h-1 rounded-full bg-current animate-ping"></span>
                                     {e.type} ({e.duration}s)
                                 </span>
                             ))}
                         </div>
                     </div>

                     <div className="p-8 bg-black/60 border border-sky-500/20 rounded-2xl mb-10 italic text-slate-300 text-sm leading-loose shadow-inner">
                        "{activeDungeon.description}"
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div>
                          <h4 className="system-font text-[10px] text-sky-500 mb-6 tracking-[0.5em] uppercase font-black">Saques Identificados</h4>
                          <ul className="space-y-4">
                            {activeDungeon.rewards.map((reward, i) => (
                              <li key={i} className="flex items-center gap-4 text-xs text-slate-400 group">
                                <span className="w-2 h-2 bg-sky-500 rounded-full group-hover:scale-150 transition-all shadow-[0_0_10px_#0ea5e9]"></span>
                                <span className="uppercase tracking-widest font-bold group-hover:text-slate-200">{reward}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex flex-col justify-end gap-4">
                          <button 
                            onClick={handleClearDungeon}
                            disabled={isGenerating}
                            className="w-full py-6 bg-gradient-to-r from-sky-700 to-blue-900 hover:from-sky-500 hover:to-blue-700 text-white system-font font-black rounded-xl shadow-[0_10px_40px_rgba(14,165,233,0.4)] uppercase tracking-[0.4em] transition-all text-sm border-2 border-sky-400/20"
                          >
                            {activeDungeon.bossHp > 0 ? 'ABATER CHEFE (RISCO ALTO)' : (isGenerating ? 'EXTRAINDO MANA...' : 'REIVINDICAR RECOMPENSAS')}
                          </button>
                        </div>
                     </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    {lastLoot && showLootEffect && (
                        <div className="mb-12 loot-reveal relative z-[70]">
                            <h3 className="system-font text-sky-400 text-xs font-black uppercase tracking-[0.4em] mb-4">RECOMPENSA REIVINDICADA</h3>
                            <div className="system-bg system-border border-yellow-500/50 p-8 rounded-3xl max-w-sm mx-auto shadow-[0_0_50px_rgba(255,215,0,0.2)]">
                                <span className="text-[10px] bg-yellow-500/20 px-3 py-1 rounded-full text-yellow-500 font-black uppercase border border-yellow-500/30 mb-4 block w-max mx-auto">RANK {lastLoot.rarity}</span>
                                <h4 className="system-font text-2xl text-white font-black uppercase mb-2 glow-blue">{lastLoot.name}</h4>
                                <p className="text-slate-400 text-xs italic">"{lastLoot.description}"</p>
                            </div>
                        </div>
                    )}

                    <div className="system-bg system-border rounded p-16 flex flex-col items-center justify-center text-center group w-full">
                        <div className="w-32 h-32 mb-10 text-sky-600 opacity-20 group-hover:opacity-40 transition-opacity">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                            </svg>
                        </div>
                        <h2 className="system-font text-4xl mb-6 text-sky-400 uppercase tracking-[0.4em] font-black">Portais de Mana</h2>
                        <p className="max-w-md text-slate-500 mb-14 text-xs leading-relaxed uppercase font-black tracking-widest opacity-80">
                        O Sistema detectou ressonância mágica. Caçadores de Rank compatível podem solicitar entrada para extração.
                        </p>
                        <button 
                        onClick={handleEnterDungeon}
                        disabled={isGenerating}
                        className="px-16 py-7 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-black system-font tracking-[0.5em] disabled:opacity-50 transition-all flex items-center gap-5 gate-button-effect uppercase shadow-[0_0_60px_rgba(14,165,233,0.3)] text-base border-2 border-sky-400/30"
                        >
                        {isGenerating ? 'ANALISANDO FLUXO...' : 'ENTRAR NA INSTÂNCIA'}
                        </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;
