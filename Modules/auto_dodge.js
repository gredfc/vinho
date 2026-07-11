// ══════════════════════════════════════════════════════
//  MODULE: AutoDodge
//  Detecta ataques chegando e agenda a evacuacao das tropas
//  com AGRUPAMENTO e ENVIO PARA CIDADES CONFIGURADAS
//  
//  LOGICA DO DODGE ULTIMATE V49.2:
//  - Ataques com menos de JANELA_GRUPO segundos = GRUPO
//  - Envia TEMPO_ANTECEDENCIA segundos ANTES do primeiro ataque
//  - Volta MARGEM_SEGURANCA_RETORNO segundos APÓS o último
//  - Envia TERRESTRES e NAVAIS separadamente
//  - Usa cidades configuradas manualmente (CIDADES)
// ══════════════════════════════════════════════════════
var AutoDodge = class extends MultUtil {
    // Configurações do Dodge V49.2
    TEMPO_ANTECEDENCIA = 4;
    INTERVALO_REFRESH_ATAQUES = 2;
    MARGEM_SEGURANCA_RETORNO = 2;
    DIFERENCA_ENVIO = 0.5;
    JANELA_GRUPO = 10;
    MIN_TROOPS_TO_DODGE = 1;
    MAX_TROOPS_TO_SEND = 1000;
    SOUND_ALERTS = true;
    DEBUG = true;
    AUTO_DODGE = true;

    // CIDADES CONFIGURADAS: { cidade_ataque: cidade_destino }
    CIDADES = {
        2677: 2470,
        154: 156,
        2195: 2280,
        197: 234,
        2165: 288,
        97: 13,
        2263: 2273,
    };

    // Unidades para detecção de tipo
    UNIDADES_NAVAIS = ['bireme', 'trireme', 'attack_ship', 'demolition_ship', 'colonize_ship', 'small_transporter', 'big_transporter'];
    UNIDADES_TERRESTRES = ['sword', 'archer', 'hoplite', 'slinger', 'rider', 'chariot', 'catapult', 'militia'];

    constructor(c, s) {
        super(c, s);
        this._active = false;
        this._intervalId = null;
        this._scanIntervalId = null;
        
        // Estado do Dodge V49.2
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

        // Reconciliar recalls pendentes
        this._reconcilePendingRecalls();

        if (this.storage.load('dodge_active', false)) {
            setTimeout(() => {
                this.start();
            }, 2000);
        }
    }

    settings = () => {
        requestAnimationFrame(() => {
            this._updateTitle();
        });
        return (
            '<div class="game_border" style="margin-bottom:20px;">' +
            '<div class="game_border_top"></div><div class="game_border_bottom"></div>' +
            '<div class="game_border_left"></div><div class="game_border_right"></div>' +
            '<div class="game_border_corner corner1"></div><div class="game_border_corner corner2"></div>' +
            '<div class="game_border_corner corner3"></div><div class="game_border_corner corner4"></div>' +
            this.getTitleHtml('dodge_title', 'Auto Fuga (Dodge V49.2)', this.toggle, '', this._active) +
            '<div style="padding:5px 10px;font-weight:bold;">' +
            '📦 Ataques com menos de ' + this.JANELA_GRUPO + 's = GRUPO<br>' +
            '⭐ Envia ' + this.TEMPO_ANTECEDENCIA + 's ANTES do primeiro<br>' +
            '⭐ Volta ' + this.MARGEM_SEGURANCA_RETORNO + 's APÓS o último<br>' +
            '🏙️ ' + Object.keys(this.CIDADES).length + ' cidades protegidas' +
            '</div>' +
            '<div id="dodge_log" style="padding:2px 10px 8px;font-size:11px;color:#5a3a0a;min-height:16px;"></div>' +
            '<div id="dodge_attacks" style="padding:2px 10px 8px;font-size:11px;max-height:200px;overflow-y:auto;"></div>' +
            '</div>'
        );
    };

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
        this.console.log('[AutoDodge V49.2] Iniciado. Monitorando ataques...');
        this._scanAttacks();
        this._intervalId = this.createGuardedInterval(() => this._scanAttacks(), this.INTERVALO_REFRESH_ATAQUES * 1000);
        this._updatePanel();
    }

    stop() {
        this._active = false;
        this.storage.save('dodge_active', false);

        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }

        // Limpar timers
        for (const key in this.dodgeState.groupTimers) {
            clearTimeout(this.dodgeState.groupTimers[key]);
        }
        for (const key in this.dodgeState.returnTimers) {
            clearTimeout(this.dodgeState.returnTimers[key]);
        }

        this.dodgeState.groupTimers = {};
        this.dodgeState.returnTimers = {};
        this.dodgeState.groupStatus = {};
        this.dodgeState.executedGroups = {};
        this.troopsSent = {};
        this.attackCommands = {};

        this._updateTitle();
        this.console.log('[AutoDodge V49.2] Parado.');
        this._updatePanel();
    }

    _updateTitle() {
        const filter = this._active ? 'brightness(100%) saturate(186%) hue-rotate(241deg)' : '';
        uw.$('#dodge_title').css('filter', filter);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔍 SCAN DE ATAQUES - LÓGICA V49.2
    // ═══════════════════════════════════════════════════════════════════════

    _scanAttacks() {
        if (!this._active) return;
        if (window.__multbot_captcha_active) return;

        const now = Date.now();
        if (this.dodgeState.isScanning || (now - this.dodgeState.lastScan < 200)) return;
        this.dodgeState.isScanning = true;
        this.dodgeState.lastScan = now;

        try {
            const nowTime = this._gameNow();
            const myTowns = this._getMyTowns();

            // 1. COLETAR TODOS OS ATAQUES POR CIDADE
            const cityAttacks = this._collectCityAttacks(nowTime, myTowns);

            // 2. AGRUPAR E PROCESSAR ATAQUES POR CIDADE
            for (const townId in cityAttacks) {
                const attacks = cityAttacks[townId];
                if (attacks.length === 0) continue;

                const destino = this.CIDADES[townId];
                if (!destino) {
                    this.console.log('[AutoDodge] ⚠️ Cidade ' + townId + ' sem destino configurado!');
                    continue;
                }

                // Ordenar ataques por tempo
                attacks.sort((a, b) => a.arrival - b.arrival);

                // 3. CRIAR GRUPOS
                const groups = this._createGroups(attacks);

                // 4. PROCESSAR CADA GRUPO
                this._processGroups(townId, destino, groups, nowTime);
            }

            this._updatePanel();

        } catch (e) {
            this.console.log('[AutoDodge] ⚠️ Erro no scan: ' + (e && e.message ? e.message : e));
        }

        this.dodgeState.isScanning = false;
    }

    _collectCityAttacks(nowTime, myTowns) {
        const cityAttacks = {};

        try {
            const models = uw.MM.getModels().MovementsUnits;
            if (!models) return cityAttacks;

            for (const key in models) {
                const attrs = models[key].attributes;
                if (!attrs || !attrs.target_town_id) continue;

                const targetIsMine = !!myTowns[attrs.target_town_id];
                const isAttack = (attrs.type === 'attack' || attrs.type === 'attack_sea' || attrs.type === 'attack_land');
                const isReturn = attrs.is_returning === true || (attrs.home_town_id === attrs.target_town_id);

                if (!targetIsMine || !isAttack || isReturn) continue;
                if (!attrs.arrival_at || attrs.arrival_at < nowTime) continue;

                const townId = attrs.target_town_id;
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
        } catch (e) {
            this.console.log('[AutoDodge] Erro ao coletar ataques: ' + (e && e.message ? e.message : e));
        }

        return cityAttacks;
    }

    _detectAttackType(attrs) {
        if (attrs.type === 'attack_sea' || attrs.type === 'naval_attack') return 'naval';
        if (attrs.type === 'attack_land' || attrs.type === 'ground_attack') return 'ground';
        if (attrs.units) {
            let hasNaval = false, hasGround = false;
            for (const u in attrs.units) {
                if (this.UNIDADES_NAVAIS.indexOf(u) !== -1) hasNaval = true;
                else if (this.UNIDADES_TERRESTRES.indexOf(u) !== -1) hasGround = true;
            }
            if (hasNaval && !hasGround) return 'naval';
            if (hasGround && !hasNaval) return 'ground';
            if (hasNaval && hasGround) return 'mixed';
        }
        return 'mixed';
    }

    _createGroups(attacks) {
        const groups = [];
        let currentGroup = [attacks[0]];

        for (let i = 1; i < attacks.length; i++) {
            const gap = attacks[i].arrival - attacks[i-1].arrival;
            if (gap <= this.JANELA_GRUPO) {
                currentGroup.push(attacks[i]);
            } else {
                groups.push(currentGroup);
                currentGroup = [attacks[i]];
            }
        }
        groups.push(currentGroup);
        return groups;
    }

    _processGroups(townId, destino, groups, nowTime) {
        for (let g = 0; g < groups.length; g++) {
            const group = groups[g];
            const firstTime = group[0].arrival;
            const lastTime = group[group.length - 1].arrival;
            const groupKey = townId + '_group_' + firstTime + '_' + g;

            if (this.dodgeState.executedGroups[groupKey]) {
                continue;
            }

            const isGroup = group.length > 1;
            const timeToFirst = firstTime - nowTime;

            if (timeToFirst > 60) {
                continue;
            }

            // ⭐ VERIFICAR SE JÁ EXISTE UM GRUPO PARA ESTA CIDADE
            const existingGroupKey = this._findExistingGroup(townId, lastTime);
            if (existingGroupKey) {
                this._updateExistingGroup(existingGroupKey, group);
                continue;
            }

            // CRIAR NOVO GRUPO
            this._createNewGroup(townId, destino, group, groupKey, firstTime, lastTime, isGroup, nowTime);
        }
    }

    _findExistingGroup(townId, lastTime) {
        for (const existingKey in this.dodgeState.groupStatus) {
            const data = this.dodgeState.groupStatus[existingKey];
            if (data && data.townId == townId && !data.dodged) {
                if (Math.abs(data.lastTime - lastTime) <= this.JANELA_GRUPO) {
                    return existingKey;
                }
            }
        }
        return null;
    }

    _updateExistingGroup(existingGroupKey, group) {
        const existingData = this.dodgeState.groupStatus[existingGroupKey];
        
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

        this.console.log('[AutoDodge] 📦 GRUPO ATUALIZADO: ' + existingData.attacks.length + ' ataques');

        // Reagendar
        if (this.dodgeState.groupTimers[existingGroupKey]) {
            clearTimeout(this.dodgeState.groupTimers[existingGroupKey]);
        }
        this._scheduleDodge(existingGroupKey, existingData);
    }

    _createNewGroup(townId, destino, group, groupKey, firstTime, lastTime, isGroup, nowTime) {
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

        const typeLabel = isGroup ? '📦 GRUPO' : '🎯 INDIVIDUAL';
        this.console.log('[AutoDodge] ' + typeLabel + ' para ' + townId + ' (' + group.length + ' ataques)');

        this._scheduleDodge(groupKey, this.dodgeState.groupStatus[groupKey]);
    }

    _scheduleDodge(groupKey, data) {
        const now = this._gameNow();
        const dodgeDelay = Math.max(data.firstTime - now - this.TEMPO_ANTECEDENCIA, 0) * 1000;

        if (this.dodgeState.groupTimers[groupKey]) {
            clearTimeout(this.dodgeState.groupTimers[groupKey]);
        }

        this.dodgeState.groupTimers[groupKey] = setTimeout(() => {
            this._executeDodgeForGroup(groupKey);
        }, dodgeDelay);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ⚡ EXECUTAR DODGE - LÓGICA V49.2
    // ═══════════════════════════════════════════════════════════════════════

    async _executeDodgeForGroup(groupKey) {
        try {
            if (this.dodgeState.executedGroups[groupKey]) {
                return;
            }

            const data = this.dodgeState.groupStatus[groupKey];
            if (!data) return;

            const { townId, destino, firstTime, lastTime, attacks, isGroup } = data;

            // Verificar tropas
            const troops = this._getUnitsFromTown(townId, 'mixed');
            if (troops.total < this.MIN_TROOPS_TO_DODGE) {
                this.console.log('[AutoDodge] ⚠️ Tropas insuficientes em ' + townId + ': ' + troops.total);
                data.status = 'failed';
                this._updatePanel();
                return;
            }

            const typeLabel = isGroup ? '📦 GRUPO' : '🎯 INDIVIDUAL';
            this.console.log('[AutoDodge] ⚡ EXECUTANDO DODGE ' + typeLabel + ' para ' + townId);
            this.console.log('[AutoDodge] ⏱️ Primeiro: ' + new Date(firstTime * 1000).toLocaleTimeString());
            this.console.log('[AutoDodge] ⏱️ Último: ' + new Date(lastTime * 1000).toLocaleTimeString());

            this.dodgeState.executedGroups[groupKey] = true;

            // ENVIAR TERRESTRES
            await this._sendSupportForGroup(townId, destino, firstTime, lastTime, groupKey, 'ground');

            // ENVIAR NAVAIS com pequeno delay
            setTimeout(() => {
                this._sendSupportForGroup(townId, destino, firstTime, lastTime, groupKey, 'naval');
            }, this.DIFERENCA_ENVIO * 1000);

            data.dodged = true;
            data.status = 'dodged';

            this.console.log('[AutoDodge] ✅ Dodge executado para ' + groupKey + '!');
            this._updatePanel();

        } catch (e) {
            this.console.log('[AutoDodge] ❌ Erro ao executar dodge: ' + (e && e.message ? e.message : e));
            if (this.dodgeState.groupStatus[groupKey]) {
                this.dodgeState.groupStatus[groupKey].status = 'failed';
            }
            this._updatePanel();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📤 ENVIAR SUPORTE - LÓGICA V49.2
    // ═══════════════════════════════════════════════════════════════════════

    async _sendSupportForGroup(fromTownId, targetTownId, firstTime, lastTime, groupKey, attackType) {
        const timerKey = groupKey + '_' + attackType;

        if (this.troopsSent[timerKey]) {
            this.console.log('[AutoDodge] ⏳ Tropas ' + attackType + ' já enviadas');
            return;
        }

        const typeLabel = attackType === 'naval' ? '🚢 NAVAL' : attackType === 'ground' ? '⚔️ TERRESTRE' : '🔄 MISTO';

        try {
            const result = this._getUnitsFromTown(fromTownId, attackType);
            if (result.total === 0) {
                this.console.log('[AutoDodge] ⚠️ Nenhuma unidade ' + typeLabel + ' disponível');
                return;
            }

            // Limitar unidades
            const limitedUnits = {};
            let limitedTotal = 0;
            for (const u in result.units) {
                if (result.units[u] > 0) {
                    const amount = Math.min(result.units[u], this.MAX_TROOPS_TO_SEND);
                    limitedUnits[u] = amount;
                    limitedTotal += amount;
                }
            }

            this.console.log('[AutoDodge] 🪖 Enviando ' + limitedTotal + ' ' + typeLabel + ' tropas');

            // Enviar suporte
            const commandId = await this._sendUnitsWithCallback(fromTownId, targetTownId, limitedUnits);

            if (commandId) {
                this.troopsSent[timerKey] = true;
                this.attackCommands[timerKey] = commandId;

                // Agendar retorno
                this._scheduleReturn(timerKey, commandId, fromTownId, lastTime, attackType, groupKey);
            }

        } catch (e) {
            this.console.log('[AutoDodge] ❌ Erro ' + typeLabel + ': ' + (e && e.message ? e.message : e));
        }
    }

    _sendUnitsWithCallback(fromTownId, toTownId, units) {
        return new Promise((resolve, reject) => {
            try {
                const Game = uw.Game;
                if (!Game || !Game.csrfToken) {
                    reject(new Error('Game não disponível'));
                    return;
                }

                const payload = {
                    id: Number(toTownId),
                    town_id: Number(fromTownId),
                    type: 'support',
                    departure_time: Math.ceil(this._gameNow()) + 1,
                    nl_init: true
                };

                for (const u in units) {
                    if (units[u] > 0) {
                        payload[u] = units[u];
                    }
                }

                const url = '/game/town_info?action=send_units&h=' + Game.csrfToken;
                const xhr = new XMLHttpRequest();
                xhr.open('POST', url, true);
                xhr.withCredentials = true;
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

                xhr.onload = function() {
                    try {
                        if (xhr.responseText.indexOf('sucesso') !== -1 || xhr.responseText.indexOf('success') !== -1) {
                            // Tentar extrair commandId
                            let commandId = null;
                            try {
                                const response = JSON.parse(xhr.responseText);
                                if (response && response.json && response.json.notifications) {
                                    for (const notif of response.json.notifications) {
                                        if (notif && notif.param_str) {
                                            try {
                                                const data = JSON.parse(notif.param_str);
                                                if (data && data.MovementsUnits && data.MovementsUnits.command_id) {
                                                    commandId = data.MovementsUnits.command_id;
                                                    break;
                                                }
                                            } catch (e) {}
                                        }
                                    }
                                }
                            } catch (e) {}

                            resolve(commandId);
                        } else {
                            reject(new Error('Erro no envio: ' + xhr.responseText));
                        }
                    } catch (e) {
                        reject(e);
                    }
                };

                xhr.onerror = function() {
                    reject(new Error('Erro de rede'));
                };

                xhr.send('json=' + encodeURIComponent(JSON.stringify(payload)));

            } catch (e) {
                reject(e);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🚫 RETORNAR TROPAS - LÓGICA V49.2
    // ═══════════════════════════════════════════════════════════════════════

    _scheduleReturn(timerKey, commandId, townId, lastTime, attackType, groupKey) {
        const typeLabel = attackType === 'naval' ? '🚢 NAVAL' : attackType === 'ground' ? '⚔️ TERRESTRE' : '🔄 MISTO';
        const now = this._gameNow();
        const returnDelay = (lastTime - now + this.MARGEM_SEGURANCA_RETORNO) * 1000;
        const safeDelay = Math.max(returnDelay, 1000);

        this.console.log('[AutoDodge] ⏱️ ' + typeLabel + ' retorna em ' + Math.round(safeDelay / 1000) + 's');

        if (this.dodgeState.returnTimers[timerKey]) {
            clearTimeout(this.dodgeState.returnTimers[timerKey]);
        }

        // Persistir recall pendente
        const recallKey = townId + ':' + attackType;
        const dueAt = Date.now() + safeDelay;
        this._savePendingRecall(recallKey, {
            townId: townId,
            commandId: commandId,
            label: attackType,
            dueAt: dueAt
        });

        this.dodgeState.returnTimers[timerKey] = setTimeout(() => {
            this._cancelCommand(commandId, townId, attackType, groupKey);
            delete this.troopsSent[timerKey];
            this._removePendingRecall(recallKey);
        }, safeDelay);
    }

    _cancelCommand(commandId, townId, attackType, groupKey) {
        const typeLabel = attackType === 'naval' ? '🚢 NAVAL' : attackType === 'ground' ? '⚔️ TERRESTRE' : '🔄 MISTO';
        this.console.log('[AutoDodge] 🚫 CANCELANDO ' + typeLabel + ' comando #' + commandId);

        try {
            const Game = uw.Game;
            if (!Game || !Game.csrfToken) {
                this.console.log('[AutoDodge] ❌ Game não disponível');
                return;
            }

            const data = {
                model_url: 'Commands',
                action_name: 'cancelCommand',
                captcha: null,
                arguments: { id: commandId },
                town_id: Number(townId),
                nl_init: true
            };

            const url = '/game/frontend_bridge?action=execute&h=' + Game.csrfToken;
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);
            xhr.withCredentials = true;
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

            xhr.onload = function() {
                if (xhr.responseText.indexOf('success') !== -1 || xhr.responseText.indexOf('ok') !== -1) {
                    this.console.log('[AutoDodge] ✅ TROPAS ' + typeLabel + ' VOLTARAM!');
                    const timerKey = groupKey + '_' + attackType;
                    if (this.dodgeState.returnTimers[timerKey]) {
                        clearTimeout(this.dodgeState.returnTimers[timerKey]);
                        delete this.dodgeState.returnTimers[timerKey];
                    }
                    if (this.dodgeState.groupStatus[groupKey]) {
                        this.dodgeState.groupStatus[groupKey].status = 'cancelled';
                    }
                    this._updatePanel();
                } else {
                    this.console.log('[AutoDodge] ❌ Erro ao cancelar: ' + xhr.responseText);
                }
            }.bind(this);

            xhr.onerror = function(e) {
                this.console.log('[AutoDodge] ❌ Erro de rede ao cancelar');
            }.bind(this);

            xhr.send('json=' + encodeURIComponent(JSON.stringify(data)));

        } catch (e) {
            this.console.log('[AutoDodge] ❌ Erro ao cancelar: ' + (e && e.message ? e.message : e));
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🪖 OBTER UNIDADES - LÓGICA V49.2
    // ═══════════════════════════════════════════════════════════════════════

    _getUnitsFromTown(townId, attackType) {
        const units = {};
        let total = 0;

        try {
            const town = uw.ITowns.towns[townId];
            if (!town) return { units, total };

            const allUnits = town.units ? town.units() : {};
            if (!allUnits) return { units, total };

            for (const u in allUnits) {
                if (allUnits[u] > 0) {
                    const isNaval = this.UNIDADES_NAVAIS.indexOf(u) !== -1;
                    const isGround = this.UNIDADES_TERRESTRES.indexOf(u) !== -1;

                    if (attackType === 'naval' && isNaval) {
                        units[u] = allUnits[u];
                        total += allUnits[u];
                    } else if (attackType === 'ground' && isGround) {
                        units[u] = allUnits[u];
                        total += allUnits[u];
                    } else if (attackType === 'mixed' || !attackType) {
                        if (isNaval || isGround) {
                            units[u] = allUnits[u];
                            total += allUnits[u];
                        }
                    }
                }
            }
        } catch (e) {
            this.console.log('[AutoDodge] ❌ Erro ao ler unidades: ' + (e && e.message ? e.message : e));
        }

        return { units, total };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔄 RECONCILIAR RECALLS PENDENTES
    // ═══════════════════════════════════════════════════════════════════════

    _loadPendingRecallsStore() {
        return this.storage.load('dodge_pending_recalls', {});
    }

    _savePendingRecall(recallKey, entry) {
        const store = this._loadPendingRecallsStore();
        store[recallKey] = entry;
        this.storage.save('dodge_pending_recalls', store);
    }

    _removePendingRecall(recallKey) {
        const store = this._loadPendingRecallsStore();
        if (store[recallKey]) {
            delete store[recallKey];
            this.storage.save('dodge_pending_recalls', store);
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
                    this.console.log('[AutoDodge] Recall de comando #' + entry.commandId + ' já deveria ter disparado');
                    this._removePendingRecall(recallKey);
                    this._cancelCommand(entry.commandId, entry.townId, entry.label || 'mixed', 'reconcile');
                } else {
                    this.console.log('[AutoDodge] Recall reagendado para ' + Math.round(remaining / 1000) + 's');
                    const timerKey = 'reconcile_' + recallKey;
                    this.dodgeState.returnTimers[timerKey] = setTimeout(() => {
                        this._cancelCommand(entry.commandId, entry.townId, entry.label || 'mixed', 'reconcile');
                        this._removePendingRecall(recallKey);
                        delete this.dodgeState.returnTimers[timerKey];
                    }, remaining);
                }
            }
        } catch (e) {
            this.console.log('[AutoDodge] Erro ao reconciliar recalls: ' + (e && e.message ? e.message : e));
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🛠️ FUNÇÕES AUXILIARES
    // ═══════════════════════════════════════════════════════════════════════

    _gameNow() {
        try {
            if (typeof uw !== 'undefined' && uw.Timestamp && uw.Timestamp.server) {
                return uw.Timestamp.server();
            }
            return Date.now() / 1000;
        } catch(e) { return Date.now() / 1000; }
    }

    _getMyTowns() {
        try {
            if (uw.ITowns && uw.ITowns.towns) {
                return uw.ITowns.towns;
            }
            return {};
        } catch(e) { return {}; }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📋 UPDATE PANEL
    // ═══════════════════════════════════════════════════════════════════════

    _updatePanel() {
        try {
            const now = this._gameNow();
            const list = document.getElementById('dodge_attacks');
            if (!list) return;

            let html = '';
            let attackCount = 0;

            const groups = [];
            for (const key in this.dodgeState.groupStatus) {
                const data = this.dodgeState.groupStatus[key];
                if (data && data.lastTime > now - 10) {
                    groups.push(data);
                }
            }

            if (groups.length === 0) {
                html = '<div style="color:#666;text-align:center;padding:10px;">🛡️ Nenhum ataque detectado</div>';
            } else {
                groups.sort((a, b) => a.firstTime - b.firstTime);

                for (const data of groups) {
                    const timeLeft = Math.round(data.firstTime - now);
                    const timeStr = timeLeft > 0 ? (timeLeft > 60 ? Math.round(timeLeft / 60) + 'm ' + (timeLeft % 60) + 's' : timeLeft + 's') : '💥';

                    const statusMap = {
                        'waiting': '⏳',
                        'dodged': '🌀',
                        'cancelled': '✅',
                        'failed': '❌'
                    };
                    const statusIcon = statusMap[data.status] || '⏳';
                    const typeLabel = data.isGroup ? '📦' : '🎯';
                    const count = data.attacks ? data.attacks.length : 1;

                    html += '<div style="padding:4px 8px;border-bottom:1px solid #333;font-size:11px;">';
                    html += typeLabel + ' 🏙️ ' + data.townId + '→' + data.destino;
                    html += ' ⏱️ ' + timeStr;
                    html += ' ' + statusIcon;
                    if (data.isGroup) {
                        html += ' (' + count + ' ataques)';
                    }
                    html += '</div>';
                    attackCount++;
                }
            }

            list.innerHTML = html;

            // Atualizar log
            const log = document.getElementById('dodge_log');
            if (log && attackCount > 0) {
                log.textContent = '⚔️ ' + attackCount + ' grupo(s) detectado(s)';
                log.style.color = '#eab308';
            }

        } catch (e) {
            // Silencioso
        }
    }
};
