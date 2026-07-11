// ══════════════════════════════════════════════════════
//  MODULE: AutoDodge - Versão Herald SO Original
//  Mantém 100% da lógica do seu script original
//  SEM LOGS no console do MultBot
// ══════════════════════════════════════════════════════
var AutoDodge = class extends MultUtil {
    constructor(c, s) {
        super(c, s);
        this._active = false;
        this._intervalId = null;
        
        // ═══════════════════════════════════════════════════════════════════
        // ⚙️ CONFIGURAÇÃO (IGUAL AO SEU SCRIPT ORIGINAL)
        // ═══════════════════════════════════════════════════════════════════
        this.CIDADES = {
            2677: 2470,
            154: 156,
            2195: 2280,
            197: 234,
            2165: 288,
            97: 13,
            2263: 2273,
        };

        this.CONFIG = {
            TEMPO_ANTECEDENCIA: 4,
            INTERVALO_REFRESH_ATAQUES: 2,
            MARGEM_SEGURANCA_RETORNO: 2,
            DIFERENCA_ENVIO: 0.5,
            JANELA_GRUPO: 10,
            MIN_TROOPS_TO_DODGE: 1,
            MAX_TROOPS_TO_SEND: 1000,
            SOUND_ALERTS: true,
            DEBUG: false,
            AUTO_DODGE: true,
        };

        // ═══════════════════════════════════════════════════════════════════
        // ESTADO DO DODGE (MANTIDO IGUAL AO ORIGINAL)
        // ═══════════════════════════════════════════════════════════════════
        this.dodgeState = {
            groupTimers: {},
            returnTimers: {},
            groupStatus: {},
            isScanning: false,
            lastScan: 0,
            executedGroups: {},
        };
        
        this.troopsSent = {};
        this.attackCommands = {};
        this._pendingRecalls = new Map();
        
        // Carregar configurações salvas
        this._loadConfig();
        
        // Reconciliar recalls pendentes
        this._reconcilePendingRecalls();

        if (this.storage.load('dodge_active', false)) {
            setTimeout(() => this.start(), 2000);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📦 CONFIGURAÇÃO E PERSISTÊNCIA
    // ═══════════════════════════════════════════════════════════════════════

    _loadConfig() {
        try {
            const saved = this.storage.load('dodge_cidades_herald_original', null);
            if (saved && typeof saved === 'object') {
                this.CIDADES = saved;
            }
            
            const configSaved = this.storage.load('dodge_config_herald_original', null);
            if (configSaved && typeof configSaved === 'object') {
                Object.assign(this.CONFIG, configSaved);
            }
        } catch(e) {}
    }

    _saveConfig() {
        try {
            this.storage.save('dodge_cidades_herald_original', this.CIDADES);
            this.storage.save('dodge_config_herald_original', this.CONFIG);
        } catch(e) {}
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🎨 INTERFACE DO MÓDULO - NA ABA ATTACK
    // ═══════════════════════════════════════════════════════════════════════

    settings = () => {
        requestAnimationFrame(() => this._updateTitle());
        
        // Gerar HTML das cidades configuradas
        let cidadesHTML = '';
        for (const [from, to] of Object.entries(this.CIDADES)) {
            cidadesHTML += `
                <div class="dodge-city-row" style="display:flex;gap:5px;margin:2px 0;align-items:center;">
                    <input type="number" value="${from}" class="dodge_city_from" style="width:60px;background:#2a2a3e;color:#eee;border:1px solid #444;border-radius:4px;padding:2px 5px;font-size:11px;">
                    <span style="color:#666;font-size:11px;">→</span>
                    <input type="number" value="${to}" class="dodge_city_to" style="width:60px;background:#2a2a3e;color:#eee;border:1px solid #444;border-radius:4px;padding:2px 5px;font-size:11px;">
                    <button onclick="window.dodge_removeCity(this)" style="background:#ff6b6b;color:#fff;border:none;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:11px;">✕</button>
                </div>
            `;
        }

        return `
            <div class="game_border" style="margin-bottom:20px;">
                <div class="game_border_top"></div>
                <div class="game_border_bottom"></div>
                <div class="game_border_left"></div>
                <div class="game_border_right"></div>
                <div class="game_border_corner corner1"></div>
                <div class="game_border_corner corner2"></div>
                <div class="game_border_corner corner3"></div>
                <div class="game_border_corner corner4"></div>
                
                ${this.getTitleHtml('dodge_title', '🛡️ Herald SO - Dodge V49.2', this.toggle, '', this._active)}
                
                <!-- ATAQUES DETECTADOS -->
                <div style="padding:5px 10px;font-weight:bold;font-size:12px;color:#a29bfe;border-bottom:1px solid #333;">
                    ⚔️ ATAQUES DETECTADOS
                </div>
                <div id="dodge_attacks_list" style="padding:5px 10px;max-height:200px;overflow-y:auto;min-height:50px;">
                    <div style="color:#666;font-size:11px;text-align:center;padding:10px;">
                        🔍 Aguardando ataques...
                    </div>
                </div>
                
                <!-- CONFIGURAÇÃO DE CIDADES -->
                <div style="padding:5px 10px;font-weight:bold;font-size:12px;color:#a29bfe;border-top:1px solid #333;border-bottom:1px solid #333;">
                    ⚙️ CIDADES PROTEGIDAS (cidade atacada → destino)
                </div>
                
                <div id="dodge_cidades_container" style="padding:5px 10px;max-height:150px;overflow-y:auto;">
                    ${cidadesHTML}
                </div>
                
                <div style="padding:5px 10px;display:flex;gap:5px;flex-wrap:wrap;">
                    <button onclick="window.dodge_addCity()" style="background:#6c5ce7;color:#fff;border:none;border-radius:4px;padding:4px 12px;cursor:pointer;font-size:11px;">➕ Adicionar</button>
                    <button onclick="window.dodge_saveCities()" style="background:#00b894;color:#fff;border:none;border-radius:4px;padding:4px 12px;cursor:pointer;font-size:11px;">💾 Salvar</button>
                    <button onclick="window.dodge_autoDetect()" style="background:#fdcb6e;color:#000;border:none;border-radius:4px;padding:4px 12px;cursor:pointer;font-size:11px;">🔍 Auto Detectar</button>
                    <button onclick="window.dodge_clearAll()" style="background:#ff6b6b;color:#fff;border:none;border-radius:4px;padding:4px 12px;cursor:pointer;font-size:11px;">🗑️ Limpar Tudo</button>
                    <button onclick="window.dodge_test()" style="background:#a29bfe;color:#fff;border:none;border-radius:4px;padding:4px 12px;cursor:pointer;font-size:11px;">🧪 Testar</button>
                </div>
                
                <!-- CONFIGURAÇÕES AVANÇADAS -->
                <div style="padding:5px 10px;border-top:1px solid #333;margin-top:5px;">
                    <div style="font-size:10px;color:#888;">⚙️ Configurações Avançadas</div>
                    <div style="display:flex;flex-wrap:wrap;gap:10px;font-size:11px;margin-top:3px;">
                        <label style="color:#aaa;">Antecedência: <input type="number" value="${this.CONFIG.TEMPO_ANTECEDENCIA}" class="dodge_config_lead" style="width:40px;background:#2a2a3e;color:#eee;border:1px solid #444;border-radius:4px;padding:2px 5px;">s</label>
                        <label style="color:#aaa;">Retorno: <input type="number" value="${this.CONFIG.MARGEM_SEGURANCA_RETORNO}" class="dodge_config_return" style="width:40px;background:#2a2a3e;color:#eee;border:1px solid #444;border-radius:4px;padding:2px 5px;">s</label>
                        <label style="color:#aaa;">Janela Grupo: <input type="number" value="${this.CONFIG.JANELA_GRUPO}" class="dodge_config_window" style="width:40px;background:#2a2a3e;color:#eee;border:1px solid #444;border-radius:4px;padding:2px 5px;">s</label>
                        <label style="color:#aaa;">Max Tropas: <input type="number" value="${this.CONFIG.MAX_TROOPS_TO_SEND}" class="dodge_config_max" style="width:40px;background:#2a2a3e;color:#eee;border:1px solid #444;border-radius:4px;padding:2px 5px;"></label>
                    </div>
                </div>
                
                <div id="dodge_log" style="padding:2px 10px 8px;font-size:11px;color:#5a3a0a;min-height:16px;border-top:1px solid #333;margin-top:5px;">
                    🛡️ Herald SO - ${Object.keys(this.CIDADES).length} cidades protegidas
                </div>
            </div>
        `;
    };

    // ═══════════════════════════════════════════════════════════════════════
    // 📋 ATUALIZAR LISTA DE ATAQUES
    // ═══════════════════════════════════════════════════════════════════════

    _updateAttacksList() {
        const container = document.getElementById('dodge_attacks_list');
        if (!container) return;

        const now = this._gameNow();
        let html = '';

        const groups = [];
        for (const key in this.dodgeState.groupStatus) {
            if (this.dodgeState.groupStatus.hasOwnProperty(key)) {
                const data = this.dodgeState.groupStatus[key];
                if (data && data.lastTime > now - 10) {
                    groups.push(data);
                }
            }
        }

        if (groups.length === 0) {
            html = `
                <div style="color:#666;font-size:11px;text-align:center;padding:10px;">
                    🛡️ Nenhum ataque detectado
                </div>
            `;
        } else {
            groups.sort((a, b) => a.firstTime - b.firstTime);
            
            for (const data of groups) {
                const timeLeft = Math.round(data.firstTime - now);
                const timeStr = timeLeft > 0 ? 
                    (timeLeft > 60 ? Math.round(timeLeft / 60) + 'm ' + (timeLeft % 60) + 's' : timeLeft + 's') : 
                    '💥 AGORA';
                
                const isGroup = data.isGroup;
                const statusMap = {
                    'waiting': '⏳ Aguardando',
                    'dodged': '🌀 Desviado',
                    'cancelled': '✅ Voltou',
                    'failed': '❌ Falhou'
                };
                const statusText = statusMap[data.status] || '⏳ Aguardando';
                const statusColor = data.status === 'dodged' ? '#00b894' : 
                                   data.status === 'cancelled' ? '#fdcb6e' :
                                   data.status === 'failed' ? '#ff6b6b' : '#74b9ff';

                html += `
                    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:5px 10px;padding:4px 8px;margin:3px 0;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:6px;font-size:11px;">
                        <span style="font-weight:600;color:#ddd;">🏙️ ${data.townId}</span>
                        <span style="color:#888;font-size:9px;">→ ${data.destino}</span>
                        ${isGroup ? `<span style="font-size:8px;padding:1px 8px;border-radius:10px;background:#fdcb6e;color:#000;font-weight:700;">📦 ${data.attacks.length} ataques</span>` : ''}
                        <span style="${timeLeft < 5 && timeLeft > 0 ? 'color:#ff6b6b;font-weight:700;' : timeLeft < 15 && timeLeft > 0 ? 'color:#fdcb6e;font-weight:700;' : 'color:#888;'}">⏱️ ${timeStr}</span>
                        <span style="color:#666;font-size:9px;">${new Date(data.firstTime * 1000).toLocaleTimeString()}</span>
                        <span style="font-size:8px;padding:2px 10px;border-radius:10px;background:rgba(116,185,255,0.15);color:${statusColor};">${statusText}</span>
                    </div>
                `;
            }
        }

        container.innerHTML = html;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🎮 MÉTODOS DE CONTROLE EXPORTADOS
    // ═══════════════════════════════════════════════════════════════════════

    _setupWindowMethods() {
        const self = this;
        
        window.dodge_addCity = function() {
            const container = document.getElementById('dodge_cidades_container');
            if (!container) return;
            
            const div = document.createElement('div');
            div.className = 'dodge-city-row';
            div.style.cssText = 'display:flex;gap:5px;margin:2px 0;align-items:center;';
            div.innerHTML = `
                <input type="number" placeholder="Cidade" class="dodge_city_from" style="width:60px;background:#2a2a3e;color:#eee;border:1px solid #444;border-radius:4px;padding:2px 5px;font-size:11px;">
                <span style="color:#666;font-size:11px;">→</span>
                <input type="number" placeholder="Destino" class="dodge_city_to" style="width:60px;background:#2a2a3e;color:#eee;border:1px solid #444;border-radius:4px;padding:2px 5px;font-size:11px;">
                <button onclick="window.dodge_removeCity(this)" style="background:#ff6b6b;color:#fff;border:none;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:11px;">✕</button>
            `;
            container.appendChild(div);
        };
        
        window.dodge_removeCity = function(btn) {
            const row = btn.closest('.dodge-city-row');
            if (row) row.remove();
        };
        
        window.dodge_saveCities = function() {
            const fromInputs = document.querySelectorAll('.dodge_city_from');
            const toInputs = document.querySelectorAll('.dodge_city_to');
            const newCities = {};
            
            for (let i = 0; i < fromInputs.length; i++) {
                const from = parseInt(fromInputs[i].value);
                const to = parseInt(toInputs[i].value);
                if (from && to) {
                    newCities[from] = to;
                }
            }
            
            self.CIDADES = newCities;
            self._saveConfig();
            
            const log = document.getElementById('dodge_log');
            if (log) {
                log.textContent = `✅ ${Object.keys(newCities).length} cidades salvas!`;
                log.style.color = '#00b894';
            }
            
            if (uw.HumanMessage) {
                uw.HumanMessage.success('AutoDodge: ' + Object.keys(newCities).length + ' cidades salvas!');
            }
        };
        
        window.dodge_autoDetect = function() {
            self._autoDetectCities();
        };
        
        window.dodge_clearAll = function() {
            if (!confirm('🗑️ Limpar todos os ataques e grupos?')) return;
            
            for (const key in self.dodgeState.groupTimers) {
                clearTimeout(self.dodgeState.groupTimers[key]);
            }
            for (const key in self.dodgeState.returnTimers) {
                clearTimeout(self.dodgeState.returnTimers[key]);
            }
            
            self.dodgeState.groupStatus = {};
            self.dodgeState.groupTimers = {};
            self.dodgeState.returnTimers = {};
            self.dodgeState.executedGroups = {};
            self.troopsSent = {};
            self.attackCommands = {};
            
            self._updateAttacksList();
            
            const log = document.getElementById('dodge_log');
            if (log) {
                log.textContent = '🗑️ Todos os ataques limpos!';
                log.style.color = '#fcd34d';
            }
        };
        
        window.dodge_test = function() {
            self._testDodge();
        };
        
        const configObserver = new MutationObserver(() => {
            const lead = document.querySelector('.dodge_config_lead');
            const ret = document.querySelector('.dodge_config_return');
            const win = document.querySelector('.dodge_config_window');
            const max = document.querySelector('.dodge_config_max');
            
            if (lead && ret && win && max) {
                self.CONFIG.TEMPO_ANTECEDENCIA = parseInt(lead.value) || 4;
                self.CONFIG.MARGEM_SEGURANCA_RETORNO = parseInt(ret.value) || 2;
                self.CONFIG.JANELA_GRUPO = parseInt(win.value) || 10;
                self.CONFIG.MAX_TROOPS_TO_SEND = parseInt(max.value) || 1000;
                self._saveConfig();
            }
        });
        
        configObserver.observe(document.body, { childList: true, subtree: true });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔍 AUTO DETECTAR CIDADES
    // ═══════════════════════════════════════════════════════════════════════

    _autoDetectCities() {
        try {
            const towns = uw.ITowns.towns;
            if (!towns) return;
            
            let detected = 0;
            const newCities = { ...this.CIDADES };
            
            for (const [id, town] of Object.entries(towns)) {
                if (typeof town.getIslandCoordinateX !== 'function') continue;
                
                const ix = town.getIslandCoordinateX();
                const iy = town.getIslandCoordinateY();
                
                for (const [id2, town2] of Object.entries(towns)) {
                    if (id === id2) continue;
                    if (typeof town2.getIslandCoordinateX !== 'function') continue;
                    
                    if (town2.getIslandCoordinateX() === ix && town2.getIslandCoordinateY() === iy) {
                        if (!newCities[id]) {
                            newCities[id] = parseInt(id2);
                            detected++;
                            break;
                        }
                    }
                }
            }
            
            this.CIDADES = newCities;
            this._saveConfig();
            
            const log = document.getElementById('dodge_log');
            if (log) {
                log.textContent = `🔍 Detectadas ${detected} cidades na mesma ilha!`;
                log.style.color = '#fdcb6e';
            }
            
            if (uw.HumanMessage) {
                uw.HumanMessage.success('AutoDodge: ' + detected + ' cidades detectadas!');
            }
            
            this._reloadSettings();
        } catch(e) {}
    }

    _reloadSettings() {
        const container = document.querySelector('.game_border');
        if (container && container.parentNode) {
            const parent = container.parentNode;
            const newSettings = this.settings();
            const temp = document.createElement('div');
            temp.innerHTML = newSettings;
            parent.replaceChild(temp.firstElementChild, container);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔄 CONTROLE DO MÓDULO
    // ═══════════════════════════════════════════════════════════════════════

    toggle = () => {
        if (this._active) {
            this.stop();
        } else {
            this.start();
        }
    };

    start() {
        if (this._active) return;
        this._active = true;
        this.storage.save('dodge_active', true);
        this._updateTitle();
        
        this._setupWindowMethods();
        this._scanAttacks();
        this._intervalId = this.createGuardedInterval(() => {
            this._scanAttacks();
            this._updateAttacksList();
        }, this.CONFIG.INTERVALO_REFRESH_ATAQUES * 1000);
        
        const log = document.getElementById('dodge_log');
        if (log) {
            log.textContent = '🟢 Sistema ativo - Monitorando ' + Object.keys(this.CIDADES).length + ' cidades';
            log.style.color = '#00b894';
        }
        
        this._updateAttacksList();
    }

    stop() {
        this._active = false;
        this.storage.save('dodge_active', false);

        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }

        for (const key in this.dodgeState.groupTimers) {
            clearTimeout(this.dodgeState.groupTimers[key]);
        }
        for (const key in this.dodgeState.returnTimers) {
            clearTimeout(this.dodgeState.returnTimers[key]);
        }
        for (const entry of this._pendingRecalls.values()) {
            clearTimeout(entry.timeoutId);
        }
        
        this.dodgeState.groupTimers = {};
        this.dodgeState.returnTimers = {};
        this.dodgeState.groupStatus = {};
        this.dodgeState.executedGroups = {};
        this.troopsSent = {};
        this._pendingRecalls.clear();

        this._updateTitle();
        
        const log = document.getElementById('dodge_log');
        if (log) {
            log.textContent = '🔴 Sistema desativado';
            log.style.color = '#ff6b6b';
        }
        
        this._updateAttacksList();
    }

    _updateTitle() {
        const filter = this._active ? 'brightness(100%) saturate(186%) hue-rotate(241deg)' : '';
        uw.$('#dodge_title').css('filter', filter);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🧪 TESTE
    // ═══════════════════════════════════════════════════════════════════════

    _testDodge() {
        const towns = Object.keys(this.CIDADES);
        if (towns.length === 0) return;
        
        const townId = parseInt(towns[0]);
        const destino = this.CIDADES[townId];
        const now = this._gameNow();

        const tempos = [10, 11, 24, 27, 40];
        const attacks = [];
        
        for (let i = 0; i < tempos.length; i++) {
            const arrival = now + tempos[i];
            const key = 'sim_' + Date.now() + '_' + i;
            attacks.push({
                cmdId: key,
                arrival: arrival,
                type: 'mixed'
            });
        }

        const groups = [];
        let currentGroup = [attacks[0]];
        for (let i = 1; i < attacks.length; i++) {
            const gap = attacks[i].arrival - attacks[i-1].arrival;
            if (gap <= this.CONFIG.JANELA_GRUPO) {
                currentGroup.push(attacks[i]);
            } else {
                groups.push(currentGroup);
                currentGroup = [attacks[i]];
            }
        }
        groups.push(currentGroup);

        for (let g = 0; g < groups.length; g++) {
            const group = groups[g];
            const firstTime = group[0].arrival;
            const lastTime = group[group.length - 1].arrival;
            const groupKey = townId + '_group_' + firstTime + '_' + g;
            const isGroup = group.length > 1;

            this.dodgeState.groupStatus[groupKey] = {
                townId: townId,
                destino: destino,
                firstTime: firstTime,
                lastTime: lastTime,
                attacks: group,
                isGroup: isGroup,
                status: 'waiting',
                dodged: false
            };

            const dodgeDelay = Math.max(firstTime - now - this.CONFIG.TEMPO_ANTECEDENCIA, 0) * 1000;
            setTimeout((data, key) => {
                this._executeDodgeForGroup(data.townId, data.destino, data.firstTime, data.lastTime, data.attacks, key, data.isGroup);
            }, dodgeDelay, this.dodgeState.groupStatus[groupKey], groupKey);
        }

        this._updateAttacksList();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔍 FUNÇÕES AUXILIARES (SEM LOGS)
    // ═══════════════════════════════════════════════════════════════════════

    _gameNow() {
        try {
            if (typeof unsafeWindow !== 'undefined' && unsafeWindow.Timestamp && unsafeWindow.Timestamp.server) {
                return unsafeWindow.Timestamp.server();
            }
            return Date.now() / 1000;
        } catch(e) { return Date.now() / 1000; }
    }

    _getGame() {
        try {
            if (typeof unsafeWindow !== 'undefined' && unsafeWindow.Game) return unsafeWindow.Game;
            if (typeof window !== 'undefined' && window.Game) return window.Game;
        } catch(e) {}
        return null;
    }

    _getMM() {
        try {
            if (typeof unsafeWindow !== 'undefined' && unsafeWindow.MM) return unsafeWindow.MM;
            if (typeof window !== 'undefined' && window.MM) return window.MM;
        } catch(e) {}
        return null;
    }

    _getITowns() {
        try {
            if (typeof unsafeWindow !== 'undefined' && unsafeWindow.ITowns) return unsafeWindow.ITowns;
            if (typeof window !== 'undefined' && window.ITowns) return window.ITowns;
        } catch(e) {}
        return null;
    }

    _playSound(type = 'warning') {
        if (!this.CONFIG.SOUND_ALERTS) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = type === 'danger' ? 800 : 600;
            osc.type = 'sine';
            gain.gain.value = 0.1;
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        } catch(e) {}
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🧬 DETETAR TIPO DE ATAQUE
    // ═══════════════════════════════════════════════════════════════════════

    _detectAttackType(attrs) {
        const UNIDADES_NAVAIS = ['bireme', 'trireme', 'attack_ship', 'demolition_ship', 'colonize_ship', 'small_transporter', 'big_transporter'];
        const UNIDADES_TERRESTRES = ['sword', 'archer', 'hoplite', 'slinger', 'rider', 'chariot', 'catapult', 'militia'];
        
        if (attrs.type === 'attack_sea' || attrs.type === 'naval_attack') return 'naval';
        if (attrs.type === 'attack_land' || attrs.type === 'ground_attack') return 'ground';
        if (attrs.units) {
            let hasNaval = false, hasGround = false;
            for (let u in attrs.units) {
                if (UNIDADES_NAVAIS.indexOf(u) !== -1) hasNaval = true;
                else if (UNIDADES_TERRESTRES.indexOf(u) !== -1) hasGround = true;
            }
            if (hasNaval && !hasGround) return 'naval';
            if (hasGround && !hasNaval) return 'ground';
            if (hasNaval && hasGround) return 'mixed';
        }
        return 'mixed';
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🪖 OBTER UNIDADES DA CIDADE
    // ═══════════════════════════════════════════════════════════════════════

    _getUnitsFromTown(townId, attackType) {
        var units = {};
        var total = 0;
        var MM = this._getMM();
        const UNIDADES_NAVAIS = ['bireme', 'trireme', 'attack_ship', 'demolition_ship', 'colonize_ship', 'small_transporter', 'big_transporter'];
        const UNIDADES_TERRESTRES = ['sword', 'archer', 'hoplite', 'slinger', 'rider', 'chariot', 'catapult', 'militia'];

        try {
            if (MM && MM.getModels && MM.getModels().Units) {
                var models = MM.getModels().Units;
                for (var key in models) {
                    if (!models.hasOwnProperty(key)) continue;
                    var attrs = models[key].attributes || models[key];
                    if (String(attrs.home_town_id) !== String(townId)) continue;
                    if (attrs.current_town_id && String(attrs.current_town_id) !== String(townId)) continue;

                    for (var u in attrs) {
                        if (!attrs.hasOwnProperty(u)) continue;
                        if (u === 'id' || u === 'home_town_id' || u === 'current_town_id' ||
                            u === 'current_town_player_id' || u === 'island_x' || u === 'island_y' ||
                            u === 'number_on_island' || u === 'militia' || u === 'heroes' ||
                            u === 'home_town_link' || u === 'current_town_link' ||
                            u === 'current_player_link' || u === 'home_town_name' ||
                            u === 'current_town_name' || u === 'same_island' ||
                            u === 'god_favor' || u === 'god_power') continue;
                        if (typeof attrs[u] === 'number' && attrs[u] > 0) {
                            var isNaval = UNIDADES_NAVAIS.indexOf(u) !== -1;
                            var isGround = UNIDADES_TERRESTRES.indexOf(u) !== -1;
                            if (attackType === 'naval' && isNaval) {
                                units[u] = (units[u] || 0) + attrs[u];
                                total += attrs[u];
                            } else if (attackType === 'ground' && isGround) {
                                units[u] = (units[u] || 0) + attrs[u];
                                total += attrs[u];
                            } else if (attackType === 'mixed' || !attackType) {
                                units[u] = (units[u] || 0) + attrs[u];
                                total += attrs[u];
                            }
                        }
                    }
                    break;
                }
            }
        } catch(e) {}

        return { units: units, total: total };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📤 ENVIAR SUPORTE (SEM LOGS)
    // ═══════════════════════════════════════════════════════════════════════

    _sendSupportForGroup(fromTownId, targetTownId, firstTime, lastTime, groupKey, attackType) {
        var timerKey = groupKey + '_' + attackType;

        if (this.troopsSent[timerKey]) return;

        var Game = this._getGame();
        if (!Game || !Game.csrfToken) return;

        var result = this._getUnitsFromTown(fromTownId, attackType);
        if (result.total === 0) return;

        var limitedUnits = {};
        var limitedTotal = 0;
        for (var u in result.units) {
            if (result.units.hasOwnProperty(u) && result.units[u] > 0) {
                var amount = Math.min(result.units[u], this.CONFIG.MAX_TROOPS_TO_SEND);
                limitedUnits[u] = amount;
                limitedTotal += amount;
            }
        }

        var departTime = Math.ceil(this._gameNow()) + 1;
        var payload = {
            id: Number(targetTownId),
            town_id: Number(fromTownId),
            type: 'support',
            departure_time: departTime,
            nl_init: true
        };

        for (var u in limitedUnits) {
            if (limitedUnits.hasOwnProperty(u) && limitedUnits[u] > 0) {
                payload[u] = limitedUnits[u];
            }
        }

        var url = '/game/town_info?action=send_units&h=' + Game.csrfToken;
        var commandId = null;

        var xhr = new XMLHttpRequest();
        xhr.open('POST', url, false);
        xhr.withCredentials = true;
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

        try {
            xhr.send('json=' + encodeURIComponent(JSON.stringify(payload)));

            if (xhr.responseText.indexOf('sucesso') !== -1 || xhr.responseText.indexOf('success') !== -1) {
                this._playSound('success');
                this.troopsSent[timerKey] = true;

                try {
                    var response = JSON.parse(xhr.responseText);
                    if (response && response.json && response.json.notifications) {
                        for (var i = 0; i < response.json.notifications.length; i++) {
                            var notif = response.json.notifications[i];
                            if (notif && notif.param_str) {
                                try {
                                    var data = JSON.parse(notif.param_str);
                                    if (data && data.MovementsUnits && data.MovementsUnits.command_id) {
                                        commandId = data.MovementsUnits.command_id;
                                        break;
                                    }
                                } catch(e) {}
                            }
                        }
                    }
                } catch(e) {}

                if (commandId) {
                    var cmdKey = groupKey + '_' + attackType;
                    this.attackCommands[cmdKey] = commandId;

                    var cancelDelay = (lastTime - this._gameNow() + this.CONFIG.MARGEM_SEGURANCA_RETORNO) * 1000;
                    cancelDelay = Math.max(cancelDelay, 1000);

                    var timerKey2 = groupKey + '_' + attackType;
                    if (this.dodgeState.returnTimers[timerKey2]) {
                        clearTimeout(this.dodgeState.returnTimers[timerKey2]);
                    }

                    this.dodgeState.returnTimers[timerKey2] = setTimeout(() => {
                        this._cancelCommand(commandId, fromTownId, attackType, groupKey);
                        delete this.troopsSent[timerKey2];
                    }, cancelDelay);

                    return commandId;
                }
            }
        } catch(e) {}

        return null;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🚫 CANCELAR COMANDO (SEM LOGS)
    // ═══════════════════════════════════════════════════════════════════════

    _cancelCommand(commandId, townId, attackType, groupKey) {
        var Game = this._getGame();
        if (!Game || !Game.csrfToken) return;

        var payload = {
            model_url: 'Commands',
            action_name: 'cancelCommand',
            captcha: null,
            arguments: { id: commandId },
            town_id: Number(townId),
            nl_init: true
        };

        var url = '/game/frontend_bridge?action=execute&h=' + Game.csrfToken;

        var xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.withCredentials = true;
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

        xhr.onload = () => {
            if (xhr.responseText.indexOf('success') !== -1 || xhr.responseText.indexOf('ok') !== -1) {
                this._playSound('success');

                var timerKey = groupKey + '_' + attackType;
                if (this.dodgeState.returnTimers[timerKey]) {
                    clearTimeout(this.dodgeState.returnTimers[timerKey]);
                    delete this.dodgeState.returnTimers[timerKey];
                }

                if (this.dodgeState.groupStatus[groupKey]) {
                    this.dodgeState.groupStatus[groupKey].status = 'cancelled';
                }
                this._updateAttacksList();
            }
        };

        xhr.send('json=' + encodeURIComponent(JSON.stringify(payload)));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔍 SCAN DE ATAQUES (SEM LOGS)
    // ═══════════════════════════════════════════════════════════════════════

    _scanAttacks() {
        if (!this._active || !this.CONFIG.AUTO_DODGE) return;
        
        var now = Date.now();
        if (this.dodgeState.isScanning || (now - this.dodgeState.lastScan < 200)) return;
        this.dodgeState.isScanning = true;
        this.dodgeState.lastScan = now;

        try {
            var MM = this._getMM();
            if (!MM) { this.dodgeState.isScanning = false; return; }
            var mu = MM.getModels && MM.getModels().MovementsUnits;
            if (!mu) { this.dodgeState.isScanning = false; return; }

            var nowTime = this._gameNow();
            var ITowns = this._getITowns();
            var myTowns = ITowns && ITowns.getTowns ? ITowns.getTowns() : {};

            var cityAttacks = {};

            for (var key in mu) {
                if (!mu.hasOwnProperty(key)) continue;
                var attrs = mu[key].attributes || mu[key];
                if (!attrs || !attrs.target_town_id) continue;

                var targetIsMine = !!myTowns[attrs.target_town_id];
                var isAttack = (attrs.type === 'attack' || attrs.type === 'attack_sea' || attrs.type === 'attack_land');
                var isReturn = attrs.is_returning === true || (attrs.home_town_id === attrs.target_town_id);

                if (!targetIsMine || !isAttack || isReturn) continue;
                if (!attrs.arrival_at || attrs.arrival_at < nowTime) continue;

                var townId = attrs.target_town_id;
                if (this.CIDADES[townId] === undefined) continue;

                if (!cityAttacks[townId]) {
                    cityAttacks[townId] = [];
                }
                cityAttacks[townId].push({
                    cmdId: key,
                    arrival: attrs.arrival_at,
                    type: this._detectAttackType(attrs)
                });
            }

            for (var townId in cityAttacks) {
                if (!cityAttacks.hasOwnProperty(townId)) continue;

                var attacks = cityAttacks[townId];
                if (attacks.length === 0) continue;

                attacks.sort(function(a, b) { return a.arrival - b.arrival; });

                var destino = this.CIDADES[townId];
                if (!destino) continue;

                var groups = [];
                var currentGroup = [attacks[0]];

                for (var i = 1; i < attacks.length; i++) {
                    var gap = attacks[i].arrival - attacks[i-1].arrival;
                    if (gap <= this.CONFIG.JANELA_GRUPO) {
                        currentGroup.push(attacks[i]);
                    } else {
                        groups.push(currentGroup);
                        currentGroup = [attacks[i]];
                    }
                }
                groups.push(currentGroup);

                for (var g = 0; g < groups.length; g++) {
                    var group = groups[g];
                    var firstTime = group[0].arrival;
                    var lastTime = group[group.length - 1].arrival;
                    var groupKey = townId + '_group_' + firstTime + '_' + g;

                    if (this.dodgeState.executedGroups[groupKey]) continue;

                    var isGroup = group.length > 1;
                    var timeToFirst = firstTime - nowTime;

                    if (timeToFirst > 60) continue;

                    var existingGroupKey = null;
                    for (var existingKey in this.dodgeState.groupStatus) {
                        if (this.dodgeState.groupStatus.hasOwnProperty(existingKey)) {
                            var data = this.dodgeState.groupStatus[existingKey];
                            if (data && data.townId == townId && !data.dodged) {
                                if (Math.abs(data.lastTime - lastTime) <= this.CONFIG.JANELA_GRUPO) {
                                    existingGroupKey = existingKey;
                                    break;
                                }
                            }
                        }
                    }

                    if (existingGroupKey) {
                        var existingData = this.dodgeState.groupStatus[existingGroupKey];
                        for (var a = 0; a < group.length; a++) {
                            var exists = existingData.attacks.some(function(att) { return att.cmdId === group[a].cmdId; });
                            if (!exists) {
                                existingData.attacks.push(group[a]);
                            }
                        }
                        existingData.attacks.sort(function(a, b) { return a.arrival - b.arrival; });
                        existingData.firstTime = existingData.attacks[0].arrival;
                        existingData.lastTime = existingData.attacks[existingData.attacks.length - 1].arrival;
                        existingData.isGroup = existingData.attacks.length > 1;

                        if (this.dodgeState.groupTimers[existingGroupKey]) {
                            clearTimeout(this.dodgeState.groupTimers[existingGroupKey]);
                        }

                        var newDodgeDelay = Math.max(existingData.firstTime - nowTime - this.CONFIG.TEMPO_ANTECEDENCIA, 0) * 1000;
                        this.dodgeState.groupTimers[existingGroupKey] = setTimeout(() => {
                            this._executeDodgeForGroup(existingData.townId, existingData.destino, existingData.firstTime, existingData.lastTime, existingData.attacks, existingGroupKey, existingData.isGroup);
                        }, newDodgeDelay);

                        continue;
                    }

                    this.dodgeState.groupStatus[groupKey] = {
                        townId: townId,
                        destino: destino,
                        firstTime: firstTime,
                        lastTime: lastTime,
                        attacks: group,
                        isGroup: isGroup,
                        status: 'waiting',
                        dodged: false
                    };

                    var dodgeDelay = Math.max(firstTime - nowTime - this.CONFIG.TEMPO_ANTECEDENCIA, 0) * 1000;

                    if (this.dodgeState.groupTimers[groupKey]) {
                        clearTimeout(this.dodgeState.groupTimers[groupKey]);
                    }

                    this.dodgeState.groupTimers[groupKey] = setTimeout(() => {
                        this._executeDodgeForGroup(townId, destino, firstTime, lastTime, group, groupKey, isGroup);
                    }, dodgeDelay);
                }
            }

            this._updateAttacksList();

        } catch(e) {}

        this.dodgeState.isScanning = false;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ⚡ EXECUTAR DODGE PARA UM GRUPO (SEM LOGS)
    // ═══════════════════════════════════════════════════════════════════════

    _executeDodgeForGroup(townId, destino, firstTime, lastTime, attacks, groupKey, isGroup) {
        try {
            if (this.dodgeState.executedGroups[groupKey]) return;

            var troops = this._getUnitsFromTown(townId, 'mixed');
            if (troops.total < this.CONFIG.MIN_TROOPS_TO_DODGE) {
                if (this.dodgeState.groupStatus[groupKey]) {
                    this.dodgeState.groupStatus[groupKey].status = 'failed';
                }
                this._updateAttacksList();
                return;
            }

            this._playSound('danger');
            this.dodgeState.executedGroups[groupKey] = true;

            this._sendSupportForGroup(townId, destino, firstTime, lastTime, groupKey, 'ground');

            setTimeout(() => {
                this._sendSupportForGroup(townId, destino, firstTime, lastTime, groupKey, 'naval');
            }, this.CONFIG.DIFERENCA_ENVIO * 1000);

            if (this.dodgeState.groupStatus[groupKey]) {
                this.dodgeState.groupStatus[groupKey].dodged = true;
                this.dodgeState.groupStatus[groupKey].status = 'dodged';
            }

        } catch(e) {
            if (this.dodgeState.groupStatus[groupKey]) {
                this.dodgeState.groupStatus[groupKey].status = 'failed';
            }
        }
        this._updateAttacksList();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔄 RECONCILIAÇÃO DE RECALLS
    // ═══════════════════════════════════════════════════════════════════════

    _loadPendingRecallsStore() {
        return this.storage.load('dodge_pending_recalls_herald_original', {});
    }

    _savePendingRecall(recallKey, entry) {
        const store = this._loadPendingRecallsStore();
        store[recallKey] = entry;
        this.storage.save('dodge_pending_recalls_herald_original', store);
    }

    _removePendingRecall(recallKey) {
        const store = this._loadPendingRecallsStore();
        if (store[recallKey]) {
            delete store[recallKey];
            this.storage.save('dodge_pending_recalls_herald_original', store);
        }
    }

    _reconcilePendingRecalls() {
        try {
            const store = this._loadPendingRecallsStore();
            const keys = Object.keys(store);
            if (keys.length === 0) return;

            for (const recallKey of keys) {
                const entry = store[recallKey];
                if (!entry || !entry.commandId) {
                    this._removePendingRecall(recallKey);
                    continue;
                }

                const remaining = entry.dueAt - Date.now();

                if (remaining <= 0) {
                    this._removePendingRecall(recallKey);
                    this._cancelCommand(entry.commandId, entry.townId, 'pending', entry.label);
                } else {
                    const timeoutId = setTimeout(() => {
                        this._pendingRecalls.delete(recallKey);
                        this._removePendingRecall(recallKey);
                        this._cancelCommand(entry.commandId, entry.townId, 'pending', entry.label);
                    }, remaining);
                    this._pendingRecalls.set(recallKey, { timeoutId: timeoutId, commandId: entry.commandId });
                }
            }
        } catch(e) {}
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
