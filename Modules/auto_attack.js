// ══════════════════════════════════════════════════════
//  MODULE: AutoDodge - Versão com Lógica Herald SO
//  Substitui completamente a lógica original do AutoDodge
//  pela lógica do Herald SO (agrupamento, envio separado)
// ══════════════════════════════════════════════════════
var AutoDodge = class extends MultUtil {
    // ═══════════════════════════════════════════════════════════════════════
    // ⚙️ CONFIGURAÇÃO (HERDADA DO HERALD SO)
    // ═══════════════════════════════════════════════════════════════════════
    CIDADES = {
        2677: 2470,
        154: 156,
        2195: 2280,
        197: 234,
        2165: 288,
        97: 13,
        2263: 2273,
    };

    CONFIG = {
        TEMPO_ANTECEDENCIA: 4,
        INTERVALO_REFRESH_ATAQUES: 2,
        MARGEM_SEGURANCA_RETORNO: 2,
        DIFERENCA_ENVIO: 0.5,
        JANELA_GRUPO: 10,
        MIN_TROOPS_TO_DODGE: 1,
        MAX_TROOPS_TO_SEND: 1000,
        SOUND_ALERTS: true,
        DEBUG: true,
        AUTO_DODGE: true,
    };

    constructor(c, s) {
        super(c, s);
        this._active = false;
        this._intervalId = null;
        
        // ═══════════════════════════════════════════════════════════════════
        // ESTADO DO DODGE (HERDADO DO HERALD SO)
        // ═══════════════════════════════════════════════════════════════════
        this._dodgeState = {
            groupTimers: new Map(),
            returnTimers: new Map(),
            groupStatus: new Map(),
            executedGroups: new Set(),
            isScanning: false,
            lastScan: 0,
        };
        
        this._troopsSent = new Set();
        this._attackCommands = new Map();
        this._pendingRecalls = new Map();
        this._islandScraperObserver = null;
        this._islandCache = this.storage.load('dodge_island_cache', {});
        
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
            const saved = this.storage.load('dodge_cidades_herald', null);
            if (saved && typeof saved === 'object') {
                this.CIDADES = saved;
                this.console.log('[AutoDodge] Cidades carregadas:', Object.keys(this.CIDADES).length);
            }
            
            const configSaved = this.storage.load('dodge_config_herald', null);
            if (configSaved && typeof configSaved === 'object') {
                Object.assign(this.CONFIG, configSaved);
                this.console.log('[AutoDodge] Configuração carregada');
            }
        } catch(e) {
            this.console.log('[AutoDodge] Erro ao carregar config:', e);
        }
    }

    _saveConfig() {
        try {
            this.storage.save('dodge_cidades_herald', this.CIDADES);
            this.storage.save('dodge_config_herald', this.CONFIG);
        } catch(e) {
            this.console.log('[AutoDodge] Erro ao salvar config:', e);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🎨 INTERFACE DO MÓDULO
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
                
                ${this.getTitleHtml('dodge_title', '🛡️ Auto Dodge (Herald SO)', this.toggle, '', this._active)}
                
                <div style="padding:5px 10px;font-weight:bold;font-size:12px;color:#a29bfe;border-bottom:1px solid #333;">
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
                </div>
                
                <div style="padding:5px 10px;border-top:1px solid #333;margin-top:5px;">
                    <div style="font-size:10px;color:#888;">⚙️ Configurações Avançadas</div>
                    <div style="display:flex;flex-wrap:wrap;gap:10px;font-size:11px;margin-top:3px;">
                        <label style="color:#aaa;">Antecedência: <input type="number" value="${this.CONFIG.TEMPO_ANTECEDENCIA}" class="dodge_config_lead" style="width:40px;background:#2a2a3e;color:#eee;border:1px solid #444;border-radius:4px;padding:2px 5px;">s</label>
                        <label style="color:#aaa;">Retorno: <input type="number" value="${this.CONFIG.MARGEM_SEGURANCA_RETORNO}" class="dodge_config_return" style="width:40px;background:#2a2a3e;color:#eee;border:1px solid #444;border-radius:4px;padding:2px 5px;">s</label>
                        <label style="color:#aaa;">Janela Grupo: <input type="number" value="${this.CONFIG.JANELA_GRUPO}" class="dodge_config_window" style="width:40px;background:#2a2a3e;color:#eee;border:1px solid #444;border-radius:4px;padding:2px 5px;">s</label>
                        <label style="color:#aaa;">Max Tropas: <input type="number" value="${this.CONFIG.MAX_TROOPS_TO_SEND}" class="dodge_config_max" style="width:40px;background:#2a2a3e;color:#eee;border:1px solid #444;border-radius:4px;padding:2px 5px;"></label>
                    </div>
                </div>
                
                <div id="dodge_log" style="padding:2px 10px 8px;font-size:11px;color:#5a3a0a;min-height:16px;">
                    🛡️ Sistema Herald SO - ${Object.keys(this.CIDADES).length} cidades protegidas
                </div>
            </div>
        `;
    };

    // ═══════════════════════════════════════════════════════════════════════
    // 🎮 MÉTODOS DE CONTROLE EXPORTADOS PARA O WINDOW
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
            self.console.log('[AutoDodge] Cidades salvas:', Object.keys(newCities).length);
            
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
            
            // Limpar timers
            for (const timer of self._dodgeState.groupTimers.values()) {
                clearTimeout(timer);
            }
            for (const timer of self._dodgeState.returnTimers.values()) {
                clearTimeout(timer);
            }
            
            self._dodgeState.groupStatus.clear();
            self._dodgeState.groupTimers.clear();
            self._dodgeState.returnTimers.clear();
            self._dodgeState.executedGroups.clear();
            self._troopsSent.clear();
            self._attackCommands.clear();
            
            const log = document.getElementById('dodge_log');
            if (log) {
                log.textContent = '🗑️ Todos os ataques limpos!';
                log.style.color = '#fcd34d';
            }
            
            self.console.log('[AutoDodge] Todos os ataques limpos');
        };
        
        // Configurar observer para salvar configurações avançadas
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
            if (!towns) {
                this.console.log('[AutoDodge] Nenhuma cidade encontrada');
                return;
            }
            
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
            this.console.log('[AutoDodge] Detectadas ' + detected + ' cidades');
            
            const log = document.getElementById('dodge_log');
            if (log) {
                log.textContent = `🔍 Detectadas ${detected} cidades na mesma ilha!`;
                log.style.color = '#fdcb6e';
            }
            
            if (uw.HumanMessage) {
                uw.HumanMessage.success('AutoDodge: ' + detected + ' cidades detectadas!');
            }
            
            this._reloadSettings();
        } catch(e) {
            this.console.log('[AutoDodge] Erro na detecção:', e);
        }
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
        this.console.log('[AutoDodge] 🚀 Iniciado com lógica Herald SO!');
        
        this._setupWindowMethods();
        this._scanAttacks();
        this._intervalId = this.createGuardedInterval(() => this._scanAttacks(), this.CONFIG.INTERVALO_REFRESH_ATAQUES * 1000);
        this._setupIslandScraper();
        
        const log = document.getElementById('dodge_log');
        if (log) {
            log.textContent = '🟢 Sistema ativo - Monitorando ' + Object.keys(this.CIDADES).length + ' cidades';
            log.style.color = '#00b894';
        }
    }

    stop() {
        this._active = false;
        this.storage.save('dodge_active', false);

        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }

        // Limpar todos os timers
        for (const timer of this._dodgeState.groupTimers.values()) {
            clearTimeout(timer);
        }
        for (const timer of this._dodgeState.returnTimers.values()) {
            clearTimeout(timer);
        }
        for (const entry of this._pendingRecalls.values()) {
            clearTimeout(entry.timeoutId);
        }
        
        this._dodgeState.groupTimers.clear();
        this._dodgeState.returnTimers.clear();
        this._dodgeState.groupStatus.clear();
        this._dodgeState.executedGroups.clear();
        this._troopsSent.clear();
        this._pendingRecalls.clear();

        this._teardownIslandScraper();
        this._updateTitle();
        this.console.log('[AutoDodge] ⏹️ Parado');
        
        const log = document.getElementById('dodge_log');
        if (log) {
            log.textContent = '🔴 Sistema desativado';
            log.style.color = '#ff6b6b';
        }
    }

    _updateTitle() {
        const filter = this._active ? 'brightness(100%) saturate(186%) hue-rotate(241deg)' : '';
        uw.$('#dodge_title').css('filter', filter);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔍 SCAN DE ATAQUES (LÓGICA COMPLETA DO HERALD SO)
    // ═══════════════════════════════════════════════════════════════════════

    _scanAttacks() {
        if (!this._active || !this.CONFIG.AUTO_DODGE) return;
        if (this._dodgeState.isScanning) return;
        if (window.__multbot_captcha_active) return;
        
        const now = Date.now();
        if (now - this._dodgeState.lastScan < 200) return;
        
        this._dodgeState.isScanning = true;
        this._dodgeState.lastScan = now;

        try {
            const models = uw.MM.getModels().MovementsUnits;
            if (!models) {
                this._dodgeState.isScanning = false;
                return;
            }

            const nowTime = Math.floor(Date.now() / 1000);
            const towns = uw.ITowns.towns;
            const cityAttacks = {};

            // 1. COLETAR TODOS OS ATAQUES POR CIDADE
            for (const key in models) {
                const mv = models[key].attributes;
                if (!mv || !mv.target_town_id) continue;

                const targetIsMine = !!towns[mv.target_town_id];
                const isAttack = mv.type === 'attack' || mv.type === 'attack_with_spy';
                const isReturn = mv.is_returning === true || mv.home_town_id === mv.target_town_id;

                if (!targetIsMine || !isAttack || isReturn) continue;
                if (!mv.arrival_at || mv.arrival_at < nowTime) continue;

                const townId = String(mv.target_town_id);
                if (!this.CIDADES[townId]) continue;

                if (!cityAttacks[townId]) {
                    cityAttacks[townId] = [];
                }
                
                cityAttacks[townId].push({
                    cmdId: mv.command_id || key,
                    arrival: mv.arrival_at,
                    type: this._detectAttackType(mv)
                });
            }

            // 2. AGRUPAR ATAQUES POR CIDADE
            for (const [townId, attacks] of Object.entries(cityAttacks)) {
                if (attacks.length === 0) continue;
                
                attacks.sort((a, b) => a.arrival - b.arrival);
                const destino = this.CIDADES[townId];
                
                if (!destino) {
                    this.console.log('[AutoDodge] ⚠️ Cidade ' + townId + ' sem destino configurado!');
                    continue;
                }

                // 3. CRIAR GRUPOS
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

                // 4. PROCESSAR CADA GRUPO
                for (let g = 0; g < groups.length; g++) {
                    const group = groups[g];
                    const firstTime = group[0].arrival;
                    const lastTime = group[group.length - 1].arrival;
                    const groupKey = townId + '_group_' + firstTime + '_' + g;

                    if (this._dodgeState.executedGroups.has(groupKey)) continue;

                    const isGroup = group.length > 1;
                    const timeToFirst = firstTime - nowTime;

                    if (timeToFirst > 60) continue;

                    // ⭐ VERIFICAR SE JÁ EXISTE UM GRUPO PARA ESTA CIDADE E ATUALIZAR
                    let existingGroupKey = null;
                    for (const [key, data] of this._dodgeState.groupStatus) {
                        if (data && data.townId === townId && !data.dodged) {
                            if (Math.abs(data.lastTime - lastTime) <= this.CONFIG.JANELA_GRUPO) {
                                existingGroupKey = key;
                                break;
                            }
                        }
                    }

                    if (existingGroupKey) {
                        // ⭐ ATUALIZAR GRUPO EXISTENTE
                        const existingData = this._dodgeState.groupStatus.get(existingGroupKey);
                        for (const attack of group) {
                            const exists = existingData.attacks.some(a => a.cmdId === attack.cmdId);
                            if (!exists) {
                                existingData.attacks.push(attack);
                            }
                        }
                        existingData.attacks.sort((a, b) => a.arrival - b.arrival);
                        existingData.firstTime = existingData.attacks[0].arrival;
                        existingData.lastTime = existingData.attacks[existingData.attacks.length - 1].arrival;
                        existingData.isGroup = existingData.attacks.length > 1;

                        this.console.log('[AutoDodge] 📦 GRUPO ATUALIZADO para ' + townId + ': ' + existingData.attacks.length + ' ataques');

                        // Reagendar dodge com novo tempo
                        if (this._dodgeState.groupTimers.has(existingGroupKey)) {
                            clearTimeout(this._dodgeState.groupTimers.get(existingGroupKey));
                        }

                        const newDodgeDelay = Math.max(existingData.firstTime - nowTime - this.CONFIG.TEMPO_ANTECEDENCIA, 0) * 1000;
                        const timer = setTimeout(() => {
                            this._executeDodgeGroup(
                                existingData.townId,
                                existingData.destino,
                                existingData.firstTime,
                                existingData.lastTime,
                                existingData.attacks,
                                existingGroupKey,
                                existingData.isGroup
                            );
                        }, newDodgeDelay);
                        this._dodgeState.groupTimers.set(existingGroupKey, timer);

                        continue;
                    }

                    // 5. CRIAR NOVO GRUPO
                    const groupData = {
                        townId: townId,
                        destino: destino,
                        firstTime: firstTime,
                        lastTime: lastTime,
                        attacks: group,
                        isGroup: isGroup,
                        status: 'waiting',
                        dodged: false
                    };

                    this._dodgeState.groupStatus.set(groupKey, groupData);

                    const typeLabel = isGroup ? '📦 GRUPO' : '🎯 INDIVIDUAL';
                    this.console.log('[AutoDodge] ' + typeLabel + ' para ' + townId + ' (' + group.length + ' ataques)');
                    this.console.log('[AutoDodge]    ├─ Primeiro: ' + new Date(firstTime * 1000).toLocaleTimeString());
                    this.console.log('[AutoDodge]    ├─ Último: ' + new Date(lastTime * 1000).toLocaleTimeString());
                    this.console.log('[AutoDodge]    ├─ ⭐ Enviar ' + this.CONFIG.TEMPO_ANTECEDENCIA + 's ANTES');
                    this.console.log('[AutoDodge]    └─ Voltar ' + this.CONFIG.MARGEM_SEGURANCA_RETORNO + 's APÓS');

                    // 6. AGENDAR DODGE
                    const dodgeDelay = Math.max(firstTime - nowTime - this.CONFIG.TEMPO_ANTECEDENCIA, 0) * 1000;

                    if (this._dodgeState.groupTimers.has(groupKey)) {
                        clearTimeout(this._dodgeState.groupTimers.get(groupKey));
                    }

                    const timer = setTimeout(() => {
                        this._executeDodgeGroup(townId, destino, firstTime, lastTime, group, groupKey, isGroup);
                    }, dodgeDelay);
                    this._dodgeState.groupTimers.set(groupKey, timer);
                }
            }

            // 7. LIMPAR GRUPOS EXPIRADOS
            this._cleanupExpiredGroups();

        } catch(e) {
            this.console.log('[AutoDodge] ⚠️ Erro no scan: ' + e.message);
        }

        this._dodgeState.isScanning = false;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🧬 DETECTAR TIPO DE ATAQUE
    // ═══════════════════════════════════════════════════════════════════════

    _detectAttackType(attrs) {
        const navalUnits = ['bireme', 'trireme', 'attack_ship', 'demolition_ship', 'colonize_ship', 'small_transporter', 'big_transporter'];
        const groundUnits = ['sword', 'archer', 'hoplite', 'slinger', 'rider', 'chariot', 'catapult', 'militia'];
        
        if (attrs.type === 'attack_sea' || attrs.type === 'naval_attack') return 'naval';
        if (attrs.type === 'attack_land' || attrs.type === 'ground_attack') return 'ground';
        
        if (attrs.units) {
            let hasNaval = false, hasGround = false;
            for (const u in attrs.units) {
                if (navalUnits.indexOf(u) !== -1) hasNaval = true;
                else if (groundUnits.indexOf(u) !== -1) hasGround = true;
            }
            if (hasNaval && !hasGround) return 'naval';
            if (hasGround && !hasNaval) return 'ground';
            if (hasNaval && hasGround) return 'mixed';
        }
        
        return 'mixed';
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ⚡ EXECUTAR DODGE PARA UM GRUPO (LÓGICA COMPLETA DO HERALD SO)
    // ═══════════════════════════════════════════════════════════════════════

    _executeDodgeGroup(townId, destino, firstTime, lastTime, attacks, groupKey, isGroup) {
        try {
            if (this._dodgeState.executedGroups.has(groupKey)) {
                this.console.log('[AutoDodge] ℹ️ Grupo ' + groupKey + ' já executado');
                return;
            }

            const town = uw.ITowns.towns[townId];
            if (!town) return;
            
            const townName = town.getName ? town.getName() : ('#' + townId);
            
            // Obter tropas
            const troops = this._getUnitsFromTown(townId);
            const totalTroops = Object.values(troops).reduce((a, b) => a + b, 0);
            
            if (totalTroops < this.CONFIG.MIN_TROOPS_TO_DODGE) {
                this.console.log('[AutoDodge] ⚠️ Tropas insuficientes em ' + townName + ': ' + totalTroops);
                if (this._dodgeState.groupStatus.has(groupKey)) {
                    this._dodgeState.groupStatus.get(groupKey).status = 'failed';
                }
                return;
            }

            const typeLabel = isGroup ? '📦 GRUPO' : '🎯 INDIVIDUAL';
            const numAttacks = attacks.length;
            this.console.log('[AutoDodge] ⚡ EXECUTANDO DODGE ' + typeLabel + ' para ' + townName + ' (' + numAttacks + ' ataques)');
            this.console.log('[AutoDodge] ⏱️ Primeiro ataque: ' + new Date(firstTime * 1000).toLocaleTimeString());
            this.console.log('[AutoDodge] ⏱️ Último ataque: ' + new Date(lastTime * 1000).toLocaleTimeString());
            this.console.log('[AutoDodge] ⏱️ Enviar ' + this.CONFIG.TEMPO_ANTECEDENCIA + 's ANTES');
            this.console.log('[AutoDodge] ⏱️ Voltar ' + this.CONFIG.MARGEM_SEGURANCA_RETORNO + 's APÓS');
            
            this._playSound('danger');

            this._dodgeState.executedGroups.add(groupKey);
            if (this._dodgeState.groupStatus.has(groupKey)) {
                this._dodgeState.groupStatus.get(groupKey).dodged = true;
                this._dodgeState.groupStatus.get(groupKey).status = 'dodged';
            }

            // ENVIAR TERRESTRES
            const landUnits = this._filterUnits(troops, false);
            if (Object.keys(landUnits).length > 0) {
                this._sendSupportForGroup(townId, destino, firstTime, lastTime, groupKey, 'ground', landUnits);
            } else {
                this.console.log('[AutoDodge] ⚠️ Nenhuma unidade terrestre disponível');
            }

            // ENVIAR NAVAIS COM DELAY
            const navalUnits = this._filterUnits(troops, true);
            if (Object.keys(navalUnits).length > 0) {
                setTimeout(() => {
                    this._sendSupportForGroup(townId, destino, firstTime, lastTime, groupKey, 'naval', navalUnits);
                }, this.CONFIG.DIFERENCA_ENVIO * 1000);
            } else {
                this.console.log('[AutoDodge] ⚠️ Nenhuma unidade naval disponível');
            }

            const log = document.getElementById('dodge_log');
            if (log) {
                log.textContent = `🛡️ ${townName} evacuada para ${destino}! (${numAttacks} ataques)`;
                log.style.color = '#00b894';
            }

            this.console.log('[AutoDodge] ✅ Dodge executado para ' + groupKey + '!');

        } catch(e) {
            this.console.log('[AutoDodge] ❌ Erro ao executar dodge: ' + e.message);
            if (this._dodgeState.groupStatus.has(groupKey)) {
                this._dodgeState.groupStatus.get(groupKey).status = 'failed';
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📤 ENVIAR SUPORTE PARA GRUPO (LÓGICA COMPLETA DO HERALD SO)
    // ═══════════════════════════════════════════════════════════════════════

    _sendSupportForGroup(fromTownId, targetTownId, firstTime, lastTime, groupKey, attackType, units) {
        const timerKey = groupKey + '_' + attackType;

        if (this._troopsSent.has(timerKey)) {
            this.console.log('[AutoDodge] ⏳ Tropas ' + attackType + ' já enviadas para este grupo');
            return;
        }

        const typeLabel = attackType === 'naval' ? '🚢 NAVAL' : '⚔️ TERRESTRE';
        const totalUnits = Object.values(units).reduce((a, b) => a + b, 0);
        
        if (totalUnits === 0) {
            this.console.log('[AutoDodge] ⚠️ Nenhuma unidade ' + typeLabel + ' disponível em ' + fromTownId);
            return;
        }

        this.console.log('[AutoDodge] 🪖 Enviando ' + totalUnits + ' ' + typeLabel + ' tropas de ' + fromTownId + ' para ' + targetTownId);
        this.console.log('[AutoDodge] ⏱️ Voltar ' + this.CONFIG.MARGEM_SEGURANCA_RETORNO + 's APÓS o último ataque');

        // Enviar tropas
        this._sendUnits(fromTownId, targetTownId, units)
            .then(async (result) => {
                this.console.log('[AutoDodge] Resposta do servidor (' + typeLabel + '):', result);
                
                await this.sleep(2500);
                const commandId = this._findSupportCommandId(fromTownId, targetTownId);
                
                if (commandId) {
                    this.console.log('[AutoDodge] 📋 Command ID ' + typeLabel + ': #' + commandId);
                    this._troopsSent.add(timerKey);
                    this._attackCommands.set(timerKey, commandId);
                    
                    // Agendar retorno
                    const now = Math.floor(Date.now() / 1000);
                    const recallDelay = (lastTime - now + this.CONFIG.MARGEM_SEGURANCA_RETORNO) * 1000;
                    const finalDelay = Math.max(recallDelay, 1000);
                    
                    if (this._dodgeState.returnTimers.has(timerKey)) {
                        clearTimeout(this._dodgeState.returnTimers.get(timerKey));
                    }
                    
                    const timer = setTimeout(() => {
                        this._cancelCommand(commandId, fromTownId, groupKey, attackType);
                        this._troopsSent.delete(timerKey);
                    }, finalDelay);
                    this._dodgeState.returnTimers.set(timerKey, timer);
                    
                    this.console.log('[AutoDodge] ⏱️ ' + typeLabel + ' programado para voltar em ' + Math.round(finalDelay/1000) + 's');
                } else {
                    this.console.log('[AutoDodge] ⚠️ Não foi possível extrair command_id para ' + typeLabel);
                }
            })
            .catch((e) => {
                this.console.log('[AutoDodge] ❌ Erro ao enviar ' + typeLabel + ': ' + e);
            });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🚫 CANCELAR COMANDO (LÓGICA COMPLETA DO HERALD SO)
    // ═══════════════════════════════════════════════════════════════════════

    _cancelCommand(commandId, townId, groupKey, attackType) {
        const typeLabel = attackType === 'naval' ? '🚢 NAVAL' : '⚔️ TERRESTRE';
        this.console.log('[AutoDodge] 🚫 CANCELANDO ' + typeLabel + ' comando #' + commandId);

        const data = {
            model_url: 'Commands',
            action_name: 'cancelCommand',
            captcha: null,
            arguments: { id: commandId },
        };

        this.ajaxPostWithTimeout('frontend_bridge', 'execute', data, 15000)
            .then((res) => {
                if (res && !res.error) {
                    this.console.log('[AutoDodge] ✅ TROPAS ' + typeLabel + ' VOLTARAM!');
                    this._playSound('success');
                    
                    const timerKey = groupKey + '_' + attackType;
                    if (this._dodgeState.returnTimers.has(timerKey)) {
                        clearTimeout(this._dodgeState.returnTimers.get(timerKey));
                        this._dodgeState.returnTimers.delete(timerKey);
                    }
                    
                    if (this._dodgeState.groupStatus.has(groupKey)) {
                        this._dodgeState.groupStatus.get(groupKey).status = 'cancelled';
                    }
                    
                    const log = document.getElementById('dodge_log');
                    if (log) {
                        log.textContent = '✅ Tropas ' + typeLabel + ' retornando!';
                        log.style.color = '#00b894';
                    }
                } else {
                    this.console.log('[AutoDodge] ❌ Erro ao cancelar ' + typeLabel + ': ' + JSON.stringify(res));
                }
            })
            .catch((e) => {
                this.console.log('[AutoDodge] ❌ Erro de rede ao cancelar ' + typeLabel + ': ' + e);
            });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🪖 FUNÇÕES AUXILIARES DE UNIDADES
    // ═══════════════════════════════════════════════════════════════════════

    _getUnitsFromTown(townId) {
        const units = {};
        try {
            const town = uw.ITowns.towns[townId];
            if (!town) return units;
            
            const allUnits = town.units();
            for (const [unit, count] of Object.entries(allUnits)) {
                if (unit === 'militia') continue;
                if (count > 0) {
                    units[unit] = count;
                }
            }
        } catch(e) {
            this.console.log('[AutoDodge] Erro ao obter unidades:', e);
        }
        return units;
    }

    _filterUnits(units, naval) {
        const navalUnits = ['bireme', 'trireme', 'attack_ship', 'demolition_ship', 'colonize_ship', 'small_transporter', 'big_transporter'];
        const result = {};
        
        for (const [unit, count] of Object.entries(units)) {
            const isNaval = navalUnits.indexOf(unit) !== -1;
            if (isNaval === naval && count > 0) {
                result[unit] = Math.min(count, this.CONFIG.MAX_TROOPS_TO_SEND);
            }
        }
        
        return result;
    }

    _findSupportCommandId(fromTownId, toTownId) {
        try {
            const models = uw.MM.getModels().MovementsUnits;
            if (!models) return null;

            for (const key in models) {
                const mv = models[key].attributes;
                if (!mv) continue;
                if (mv.type !== 'support') continue;
                if (String(mv.home_town_id) !== String(fromTownId)) continue;
                if (String(mv.target_town_id) !== String(toTownId)) continue;

                const cmdId = mv.command_id;
                if (!cmdId) continue;

                return cmdId;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    _sendUnits(fromTownId, toTownId, units) {
        return this._withTownId(fromTownId, () => {
            const data = Object.assign(
                { id: parseInt(toTownId, 10), type: 'support' },
                units
            );
            return this.ajaxPostWithTimeout('town_info', 'send_units', data, 15000);
        });
    }

    async _withTownId(townId, fn) {
        const orig = uw.Game.townId;
        const origStr = uw.Game.town_id;
        uw.Game.townId = parseInt(townId, 10);
        uw.Game.town_id = parseInt(townId, 10);

        try {
            const result = await fn();
            return result;
        } finally {
            uw.Game.townId = orig;
            uw.Game.town_id = origStr;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔊 SONS
    // ═══════════════════════════════════════════════════════════════════════

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
        } catch(e) { /* Silencioso */ }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🧹 CLEANUP
    // ═══════════════════════════════════════════════════════════════════════

    _cleanupExpiredGroups() {
        const now = Math.floor(Date.now() / 1000);
        const toRemove = [];
        
        for (const [key, data] of this._dodgeState.groupStatus) {
            if (data.lastTime + 60 < now) {
                toRemove.push(key);
            }
        }
        
        for (const key of toRemove) {
            this._dodgeState.groupStatus.delete(key);
            if (this._dodgeState.groupTimers.has(key)) {
                clearTimeout(this._dodgeState.groupTimers.get(key));
                this._dodgeState.groupTimers.delete(key);
            }
        }
        
        if (toRemove.length > 0) {
            this.console.log('[AutoDodge] Removidos ' + toRemove.length + ' grupos expirados');
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🏝️ ISLAND SCRAPER
    // ═══════════════════════════════════════════════════════════════════════

    _setupIslandScraper() {
        if (this._islandScraperObserver) return;

        this._islandScraperObserver = new MutationObserver((mutations) => {
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (!node || node.nodeType !== 1) continue;

                    let links = [];
                    try {
                        if (node.matches && node.matches('a.gp_town_link')) {
                            links = [node];
                        } else if (node.querySelectorAll) {
                            links = Array.from(node.querySelectorAll('a.gp_town_link'));
                        }
                    } catch (e) { continue; }

                    if (links.length > 0) {
                        setTimeout(() => this._harvestTownLinks(links), 400);
                    }
                }
            }
        });

        this._islandScraperObserver.observe(document.body, { childList: true, subtree: true });
        this.console.log('[AutoDodge] 🌐 Aprendizado de ilhas ativo');
    }

    _teardownIslandScraper() {
        if (this._islandScraperObserver) {
            this._islandScraperObserver.disconnect();
            this._islandScraperObserver = null;
        }
    }

    _harvestTownLinks(links) {
        let added = 0;
        for (const el of links) {
            try {
                const href = el.getAttribute('href') || '';
                const match = href.match(/#([A-Za-z0-9+/=]{8,})/);
                if (!match) continue;

                const decoded = JSON.parse(atob(match[1]));
                if (decoded.tp !== 'town') continue;
                if (!decoded.id || decoded.ix === undefined || decoded.iy === undefined) continue;

                const key = decoded.ix + ',' + decoded.iy;
                if (!this._islandCache[key]) this._islandCache[key] = {};

                const idStr = String(decoded.id);
                if (!this._islandCache[key][idStr]) {
                    this._islandCache[key][idStr] = { id: decoded.id, name: decoded.name || ('#' + decoded.id) };
                    added++;
                }
            } catch (e) {}
        }

        if (added > 0) {
            this.storage.save('dodge_island_cache', this._islandCache);
            this.console.log('[AutoDodge] Aprendidas ' + added + ' cidade(s)');
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔄 RECONCILIAÇÃO DE RECALLS (PERSISTÊNCIA)
    // ═══════════════════════════════════════════════════════════════════════

    _loadPendingRecallsStore() {
        return this.storage.load('dodge_pending_recalls_herald', {});
    }

    _savePendingRecall(recallKey, entry) {
        const store = this._loadPendingRecallsStore();
        store[recallKey] = entry;
        this.storage.save('dodge_pending_recalls_herald', store);
    }

    _removePendingRecall(recallKey) {
        const store = this._loadPendingRecallsStore();
        if (store[recallKey]) {
            delete store[recallKey];
            this.storage.save('dodge_pending_recalls_herald', store);
        }
    }

    _reconcilePendingRecalls() {
        try {
            const store = this._loadPendingRecallsStore();
            const keys = Object.keys(store);
            if (keys.length === 0) return;

            this.console.log('[AutoDodge] Reconciliando ' + keys.length + ' recall(s) pendente(s)...');

            for (const recallKey of keys) {
                const entry = store[recallKey];
                if (!entry || !entry.commandId) {
                    this._removePendingRecall(recallKey);
                    continue;
                }

                const remaining = entry.dueAt - Date.now();

                if (remaining <= 0) {
                    this.console.log('[AutoDodge] Recall de ' + entry.townName + ' (' + entry.label + ') disparando agora.');
                    this._removePendingRecall(recallKey);
                    this._cancelCommand(entry.commandId, entry.townId, 'pending', entry.label);
                } else {
                    this.console.log('[AutoDodge] Recall de ' + entry.townName + ' (' + entry.label + ') reagendado para ' + Math.round(remaining / 1000) + 's.');
                    const timeoutId = setTimeout(() => {
                        this._pendingRecalls.delete(recallKey);
                        this._removePendingRecall(recallKey);
                        this._cancelCommand(entry.commandId, entry.townId, 'pending', entry.label);
                    }, remaining);
                    this._pendingRecalls.set(recallKey, { timeoutId: timeoutId, commandId: entry.commandId });
                }
            }
        } catch (e) {
            this.console.log('[AutoDodge] Erro ao reconciliar recalls:', e);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
