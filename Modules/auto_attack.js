// ══════════════════════════════════════════════════════
//  MODULE: AutoAttack + Dodge (Herald SO V49.2)
//  Ataque automático + Sistema de Defesa Dodge
//  Integrado na aba "Attack" do MultBot
// ══════════════════════════════════════════════════════

var AutoAttack = class extends MultUtil {
    CHECK_INTERVAL_MS = 20000;
    SEND_DELAY_MS = 800;
    JITTER_PERCENT = 0.10;
    PLANS_LIST_MAX_HEIGHT = 110;

    // ═══ CONFIGURAÇÃO DO DODGE - COLOQUE AQUI SUAS CIDADES ═══
    DODGE_CIDADES = {
        2677: 2470,  // Cidade atacada: Cidade que envia suporte
        154: 156,
        2195: 2280,
        197: 234,
        2165: 288,
        97: 13,
        2263: 2273,
        // Adicione mais cidades aqui no formato: atacada: suporte
    };

    DODGE_CONFIG = {
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

    UNIDADES_NAVAIS = ['bireme', 'trireme', 'attack_ship', 'demolition_ship', 'colonize_ship', 'small_transporter', 'big_transporter'];
    UNIDADES_TERRESTRES = ['sword', 'archer', 'hoplite', 'slinger', 'rider', 'chariot', 'catapult', 'militia'];

    constructor(c, s) {
        super(c, s);
        this._active = false;
        this._intervalId = null;
        this._plans = this.storage.load('attack_plans', []);
        this._stagingUnits = [];

        // ═══ Carregar cidades Dodge do storage ═══
        const savedCidades = this.storage.load('dodge_cidades', null);
        if (savedCidades && Object.keys(savedCidades).length > 0) {
            this.DODGE_CIDADES = savedCidades;
        } else {
            // Salvar as cidades padrão no storage se não houver nenhuma salva
            this.storage.save('dodge_cidades', this.DODGE_CIDADES);
        }

        // ═══ Estado do Dodge ═══
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

        this._migrateOldPlans();

        if (this.storage.load('attack_active', false)) {
            setTimeout(() => {
                this.start();
            }, 2000);
        }

        // ═══ Iniciar Dodge ═══
        setTimeout(() => {
            this._startDodge();
        }, 3000);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🛠️ FUNÇÕES AUXILIARES DO DODGE
    // ═══════════════════════════════════════════════════════════════════════

    _gameNow() {
        try {
            if (uw.Timestamp && uw.Timestamp.server) {
                return uw.Timestamp.server();
            }
            return Date.now() / 1000;
        } catch(e) { return Date.now() / 1000; }
    }

    _detectAttackType(attrs) {
        if (attrs.type === 'attack_sea' || attrs.type === 'naval_attack') return 'naval';
        if (attrs.type === 'attack_land' || attrs.type === 'ground_attack') return 'ground';
        if (attrs.units) {
            let hasNaval = false, hasGround = false;
            for (let u in attrs.units) {
                if (this.UNIDADES_NAVAIS.indexOf(u) !== -1) hasNaval = true;
                else if (this.UNIDADES_TERRESTRES.indexOf(u) !== -1) hasGround = true;
            }
            if (hasNaval && !hasGround) return 'naval';
            if (hasGround && !hasNaval) return 'ground';
            if (hasNaval && hasGround) return 'mixed';
        }
        return 'mixed';
    }

    _getUnitsFromTown(townId, attackType) {
        var units = {};
        var total = 0;

        try {
            const { models } = uw.MM.getOnlyCollectionByName('Units');
            if (!models) return { units: units, total: 0 };

            for (const model of models) {
                const attrs = model.attributes;
                if (String(attrs.home_town_id) !== String(townId)) continue;
                if (attrs.current_town_id && String(attrs.current_town_id) !== String(townId)) continue;

                for (let u in attrs) {
                    if (!attrs.hasOwnProperty(u)) continue;
                    if (u === 'id' || u === 'home_town_id' || u === 'current_town_id' ||
                        u === 'current_town_player_id' || u === 'island_x' || u === 'island_y' ||
                        u === 'number_on_island' || u === 'militia' || u === 'heroes' ||
                        u === 'home_town_link' || u === 'current_town_link' ||
                        u === 'current_player_link' || u === 'home_town_name' ||
                        u === 'current_town_name' || u === 'same_island' ||
                        u === 'god_favor' || u === 'god_power') continue;
                    if (typeof attrs[u] === 'number' && attrs[u] > 0) {
                        var isNaval = this.UNIDADES_NAVAIS.indexOf(u) !== -1;
                        var isGround = this.UNIDADES_TERRESTRES.indexOf(u) !== -1;
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
            }
        } catch(e) {
            this.console.log('[Dodge] Erro ao ler unidades: ' + e.message);
        }

        return { units: units, total: total };
    }

    _sendSupportForGroup(fromTownId, targetTownId, firstTime, lastTime, groupKey, attackType) {
        var timerKey = groupKey + '_' + attackType;

        if (this.troopsSent[timerKey]) {
            return;
        }

        var typeLabel = attackType === 'naval' ? '🚢 NAVAL' : attackType === 'ground' ? '⚔️ TERRESTRE' : '🔄 MISTO';

        if (!uw.Game || !uw.Game.csrfToken) {
            this.console.log('[Dodge] ❌ Game não disponível para ' + typeLabel);
            return;
        }

        var result = this._getUnitsFromTown(fromTownId, attackType);
        if (result.total === 0) {
            this.console.log('[Dodge] ⚠️ Nenhuma unidade ' + typeLabel + ' disponível em ' + fromTownId);
            return;
        }

        var limitedUnits = {};
        var limitedTotal = 0;
        for (var u in result.units) {
            if (result.units.hasOwnProperty(u) && result.units[u] > 0) {
                var amount = Math.min(result.units[u], this.DODGE_CONFIG.MAX_TROOPS_TO_SEND);
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

        var commandId = null;
        var self = this;

        this._withTownId(fromTownId, async function() {
            try {
                const result = await self.ajaxPostWithTimeout('town_info', 'send_units', payload, 15000);
                self.console.log('[Dodge] ✅ SUPORTE ' + typeLabel + ' ENVIADO com sucesso!');
                if (self.DODGE_CONFIG.SOUND_ALERTS) self._playSound();

                self.troopsSent[timerKey] = true;

                try {
                    if (result && result.notifications) {
                        for (var i = 0; i < result.notifications.length; i++) {
                            var notif = result.notifications[i];
                            if (notif && notif.param_str) {
                                try {
                                    var data = JSON.parse(notif.param_str);
                                    if (data && data.MovementsUnits && data.MovementsUnits.command_id) {
                                        commandId = data.MovementsUnits.command_id;
                                        self.console.log('[Dodge] 📋 Command ID ' + typeLabel + ': ' + commandId);
                                        break;
                                    }
                                } catch(e) {}
                            }
                        }
                    }
                } catch(e) {}

                if (commandId) {
                    var cmdKey = groupKey + '_' + attackType;
                    self.attackCommands[cmdKey] = commandId;

                    var cancelDelay = (lastTime - self._gameNow() + self.DODGE_CONFIG.MARGEM_SEGURANCA_RETORNO) * 1000;
                    cancelDelay = Math.max(cancelDelay, 1000);

                    var timerKey2 = groupKey + '_' + attackType;
                    if (self.dodgeState.returnTimers[timerKey2]) {
                        clearTimeout(self.dodgeState.returnTimers[timerKey2]);
                    }

                    self.dodgeState.returnTimers[timerKey2] = setTimeout(function() {
                        self._cancelCommand(commandId, fromTownId, attackType, groupKey);
                        delete self.troopsSent[timerKey2];
                    }, cancelDelay);

                    self.console.log('[Dodge] ⏱️ ' + typeLabel + ' programado para voltar ' + self.DODGE_CONFIG.MARGEM_SEGURANCA_RETORNO + 's APÓS');
                }

                return result;
            } catch(e) {
                self.console.log('[Dodge] ❌ Erro ' + typeLabel + ': ' + e.message);
                throw e;
            }
        });

        return commandId;
    }

    _cancelCommand(commandId, townId, attackType, groupKey) {
        var typeLabel = attackType === 'naval' ? '🚢 NAVAL' : attackType === 'ground' ? '⚔️ TERRESTRE' : '🔄 MISTO';
        this.console.log('[Dodge] 🚫 CANCELANDO ' + typeLabel + ' comando #' + commandId);

        if (!uw.Game || !uw.Game.csrfToken) {
            this.console.log('[Dodge] ❌ Game não disponível para ' + typeLabel);
            return;
        }

        var payload = {
            model_url: 'Commands',
            action_name: 'cancelCommand',
            captcha: null,
            arguments: { id: commandId },
            town_id: Number(townId),
            nl_init: true
        };

        var self = this;

        this._withTownId(townId, async function() {
            try {
                await self.ajaxPostWithTimeout('frontend_bridge', 'execute', payload, 15000);
                self.console.log('[Dodge] ✅ TROPAS ' + typeLabel + ' VOLTARAM!');
                if (self.DODGE_CONFIG.SOUND_ALERTS) self._playSound();

                var timerKey = groupKey + '_' + attackType;
                if (self.dodgeState.returnTimers[timerKey]) {
                    clearTimeout(self.dodgeState.returnTimers[timerKey]);
                    delete self.dodgeState.returnTimers[timerKey];
                }

                if (self.dodgeState.groupStatus[groupKey]) {
                    self.dodgeState.groupStatus[groupKey].status = 'cancelled';
                }
                self._updateDodgePanel();
            } catch(e) {
                self.console.log('[Dodge] ❌ Erro ao cancelar ' + typeLabel + ': ' + e.message);
            }
        });
    }

    _playSound() {
        if (!this.DODGE_CONFIG.SOUND_ALERTS) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 600;
            osc.type = 'sine';
            gain.gain.value = 0.1;
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        } catch(e) { /* Silencioso */ }
    }

    _scanAttacks() {
        var now = Date.now();
        if (this.dodgeState.isScanning || (now - this.dodgeState.lastScan < 200)) return;
        this.dodgeState.isScanning = true;
        this.dodgeState.lastScan = now;

        try {
            const { models } = uw.MM.getOnlyCollectionByName('MovementsUnits');
            if (!models) { this.dodgeState.isScanning = false; return; }

            var nowTime = this._gameNow();
            var myTowns = uw.ITowns.towns || {};
            var cityAttacks = {};
            var CIDADES = this.DODGE_CIDADES;

            for (const model of models) {
                const attrs = model.attributes;
                if (!attrs || !attrs.target_town_id) continue;

                var targetIsMine = !!myTowns[attrs.target_town_id];
                var isAttack = (attrs.type === 'attack' || attrs.type === 'attack_sea' || attrs.type === 'attack_land');
                var isReturn = attrs.is_returning === true || (attrs.home_town_id === attrs.target_town_id);

                if (!targetIsMine || !isAttack || isReturn) continue;
                if (!attrs.arrival_at || attrs.arrival_at < nowTime) continue;

                var townId = attrs.target_town_id;
                if (CIDADES[townId] === undefined) continue;

                if (!cityAttacks[townId]) {
                    cityAttacks[townId] = [];
                }
                cityAttacks[townId].push({
                    cmdId: model.id,
                    arrival: attrs.arrival_at,
                    type: this._detectAttackType(attrs)
                });
            }

            for (var townId in cityAttacks) {
                if (!cityAttacks.hasOwnProperty(townId)) continue;

                var attacks = cityAttacks[townId];
                if (attacks.length === 0) continue;

                attacks.sort(function(a, b) { return a.arrival - b.arrival; });

                var destino = CIDADES[townId];
                if (!destino) continue;

                var groups = [];
                var currentGroup = [attacks[0]];

                for (var i = 1; i < attacks.length; i++) {
                    var gap = attacks[i].arrival - attacks[i-1].arrival;
                    if (gap <= this.DODGE_CONFIG.JANELA_GRUPO) {
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

                    // Verificar se já existe grupo para esta cidade
                    var existingGroupKey = null;
                    for (var existingKey in this.dodgeState.groupStatus) {
                        if (this.dodgeState.groupStatus.hasOwnProperty(existingKey)) {
                            var data = this.dodgeState.groupStatus[existingKey];
                            if (data && data.townId == townId && !data.dodged) {
                                if (Math.abs(data.lastTime - lastTime) <= this.DODGE_CONFIG.JANELA_GRUPO) {
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

                        var newDodgeDelay = Math.max(existingData.firstTime - nowTime - this.DODGE_CONFIG.TEMPO_ANTECEDENCIA, 0) * 1000;
                        var self = this;
                        this.dodgeState.groupTimers[existingGroupKey] = setTimeout(function() {
                            self._executeDodgeForGroup(existingData.townId, existingData.destino, existingData.firstTime, existingData.lastTime, existingData.attacks, existingGroupKey, existingData.isGroup);
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

                    var dodgeDelay = Math.max(firstTime - nowTime - this.DODGE_CONFIG.TEMPO_ANTECEDENCIA, 0) * 1000;

                    if (this.dodgeState.groupTimers[groupKey]) {
                        clearTimeout(this.dodgeState.groupTimers[groupKey]);
                    }

                    var self = this;
                    this.dodgeState.groupTimers[groupKey] = setTimeout(function() {
                        self._executeDodgeForGroup(townId, destino, firstTime, lastTime, group, groupKey, isGroup);
                    }, dodgeDelay);
                }
            }

            this._updateDodgePanel();

        } catch(e) {
            this.console.log('[Dodge] ⚠️ Erro no scan: ' + e.message);
        }

        this.dodgeState.isScanning = false;
    }

    _executeDodgeForGroup(townId, destino, firstTime, lastTime, attacks, groupKey, isGroup) {
        try {
            if (this.dodgeState.executedGroups[groupKey]) {
                return;
            }

            var troops = this._getUnitsFromTown(townId, 'mixed');
            if (troops.total < this.DODGE_CONFIG.MIN_TROOPS_TO_DODGE) {
                this.console.log('[Dodge] ⚠️ Tropas insuficientes em ' + townId + ': ' + troops.total);
                if (this.dodgeState.groupStatus[groupKey]) {
                    this.dodgeState.groupStatus[groupKey].status = 'failed';
                }
                this._updateDodgePanel();
                return;
            }

            var typeLabel = isGroup ? '📦 GRUPO' : '🎯 INDIVIDUAL';
            this.console.log('[Dodge] ⚡ EXECUTANDO DODGE ' + typeLabel + ' para ' + townId + ' (' + attacks.length + ' ataques)');

            this.dodgeState.executedGroups[groupKey] = true;

            var self = this;

            this._sendSupportForGroup(townId, destino, firstTime, lastTime, groupKey, 'ground');

            setTimeout(function() {
                self._sendSupportForGroup(townId, destino, firstTime, lastTime, groupKey, 'naval');
            }, this.DODGE_CONFIG.DIFERENCA_ENVIO * 1000);

            if (this.dodgeState.groupStatus[groupKey]) {
                this.dodgeState.groupStatus[groupKey].dodged = true;
                this.dodgeState.groupStatus[groupKey].status = 'dodged';
            }

            this.console.log('[Dodge] ✅ Dodge executado para ' + groupKey + '!');

        } catch(e) {
            this.console.log('[Dodge] ❌ Erro ao executar dodge: ' + e.message);
            if (this.dodgeState.groupStatus[groupKey]) {
                this.dodgeState.groupStatus[groupKey].status = 'failed';
            }
        }
        this._updateDodgePanel();
    }

    _updateDodgePanel() {
        const container = uw.$('#dodge_panel_container');
        if (!container.length) return;

        var now = this._gameNow();
        var attackCount = 0;

        var groups = [];
        for (var key in this.dodgeState.groupStatus) {
            if (this.dodgeState.groupStatus.hasOwnProperty(key)) {
                var data = this.dodgeState.groupStatus[key];
                if (data && data.lastTime > now - 10) {
                    groups.push(data);
                }
            }
        }

        let html = '';
        if (groups.length === 0) {
            html = '<div style="text-align:center;color:#7a5c2a;padding:10px;font-size:11px;">🛡️ Nenhum ataque detectado</div>';
        } else {
            groups.sort(function(a, b) { return a.firstTime - b.firstTime; });

            for (var i = 0; i < groups.length; i++) {
                var data = groups[i];
                var timeLeft = Math.round(data.firstTime - now);
                var timeStr = timeLeft > 0 ? (timeLeft > 60 ? Math.round(timeLeft / 60) + 'm ' + (timeLeft % 60) + 's' : timeLeft + 's') : '💥';

                var timeColor = '';
                if (timeLeft < 5 && timeLeft > 0) timeColor = 'color:#ff6b6b;font-weight:700;';
                else if (timeLeft < 15 && timeLeft > 0) timeColor = 'color:#fdcb6e;font-weight:700;';
                else if (timeLeft > 0) timeColor = 'color:#00b894;';

                var typeLabel = data.isGroup ? '📦 GRUPO' : '🎯 INDIVIDUAL';
                var badgeHtml = data.isGroup ? '<span style="background:#fdcb6e;color:#000;font-size:8px;padding:2px 8px;border-radius:10px;font-weight:700;">' + data.attacks.length + ' ataques</span>' : '';

                var statusMap = {
                    'waiting': '⏳ Aguardando',
                    'dodged': '🌀 Desviado',
                    'cancelled': '✅ Voltou',
                    'failed': '❌ Falhou'
                };
                var statusText = statusMap[data.status] || '⏳ Aguardando';

                html += '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:6px 10px;margin:3px 0;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;font-size:11px;">';
                html += '<span style="font-weight:600;color:#ddd;">🏙️ ' + data.townId + ' → ' + data.destino + '</span>';
                html += '<span style="font-size:9px;color:#888;">' + typeLabel + '</span>';
                html += badgeHtml;
                html += '<span style="' + timeColor + '">⏱️ ' + timeStr + '</span>';
                html += '<span style="font-size:9px;color:#666;">' + new Date(data.firstTime * 1000).toLocaleTimeString() + ' → ' + new Date(data.lastTime * 1000).toLocaleTimeString() + '</span>';
                html += '<span style="font-size:9px;color:#00b894;">↩️ ' + new Date((data.lastTime + this.DODGE_CONFIG.MARGEM_SEGURANCA_RETORNO) * 1000).toLocaleTimeString() + '</span>';
                html += '<span style="font-size:8px;padding:2px 10px;border-radius:10px;text-transform:uppercase;font-weight:700;background:rgba(116,185,255,0.15);color:#74b9ff;">' + statusText + '</span>';
                html += '</div>';
                attackCount++;
            }
        }

        // Atualizar contador no título
        const counter = uw.$('#dodge_counter');
        if (counter.length) {
            counter.text(attackCount);
            if (attackCount > 0) {
                counter.css('color', '#ff6b6b');
            } else {
                counter.css('color', '#888');
            }
        }

        container.html(html);
    }

    _startDodge() {
        this.console.log('[Dodge] 🛡️ Sistema de Dodge iniciado!');
        this.console.log('[Dodge] 🏙️ Cidades protegidas: ' + Object.keys(this.DODGE_CIDADES).join(', '));

        setTimeout(() => this._scanAttacks(), 2000);
        setInterval(() => this._scanAttacks(), this.DODGE_CONFIG.INTERVALO_REFRESH_ATAQUES * 1000);

        this.console.log('[Dodge] ✅ Dodge ativo!');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FIM DO DODGE
    // ═══════════════════════════════════════════════════════════════════════

    _migrateOldPlans() {
        let changed = false;
        const newPlans = [];

        for (const plan of this._plans) {
            let migratedPlan = plan;

            if (!Array.isArray(plan.units)) {
                if (plan.unit) {
                    changed = true;
                    migratedPlan = {
                        id: plan.id,
                        originId: plan.originId,
                        units: [
                            {
                                unit: plan.unit,
                                quantity: plan.quantity,
                                isNaval: !!plan.isNaval,
                                useMax: false
                            }
                        ],
                        targets: plan.targets || [],
                        enabled: plan.enabled !== false
                    };
                    this.console.log('[AutoAttack] Plano antigo migrado: cidade #' + plan.originId + ' (' + plan.unit + ' x' + plan.quantity + ').');
                } else {
                    changed = true;
                    this.console.log('[AutoAttack] Aviso: plano invalido removido (sem unidades definidas).');
                    continue;
                }
            }

            if (typeof migratedPlan.restMinutes !== 'number') {
                migratedPlan.restMinutes = 0;
                changed = true;
            }
            if (!migratedPlan.nextAllowedAt || typeof migratedPlan.nextAllowedAt !== 'object') {
                migratedPlan.nextAllowedAt = {};
                changed = true;
            }

            if (Array.isArray(migratedPlan.units)) {
                for (const u of migratedPlan.units) {
                    if (typeof u.useMax !== 'boolean') {
                        u.useMax = false;
                        changed = true;
                    }
                }
            }

            if (typeof migratedPlan.hero === 'undefined') {
                migratedPlan.hero = null;
                changed = true;
            }

            newPlans.push(migratedPlan);
        }

        this._plans = newPlans;

        if (changed) {
            this.storage.save('attack_plans', this._plans);
        }
    }

    _getUnitLabel(unitId) {
        return this.getGameName('unit', unitId);
    }

    _getHeroLabel(heroId) {
        if (!heroId) return '';
        try {
            return this.getGameName('hero', heroId);
        } catch (e) {
            try {
                return uw.GameData.heroes[heroId].name;
            } catch (e2) {
                return heroId;
            }
        }
    }

    _formatUnitEntry(u) {
        const label = this._getUnitLabel(u.unit);
        if (u.useMax) return 'MAX x ' + label;
        return u.quantity + 'x ' + label;
    }

    settings = () => {
        const self = this;
        requestAnimationFrame(function () {
            self._updateTitle();
            self._renderPlans();
            self._renderStagingUnits();
            self._updateDodgePanel();
        });

        let html = '';
        html += '<div class="game_border" style="margin-bottom:14px;">';
        html += '<div class="game_border_top"></div><div class="game_border_bottom"></div>';
        html += '<div class="game_border_left"></div><div class="game_border_right"></div>';
        html += '<div class="game_border_corner corner1"></div><div class="game_border_corner corner2"></div>';
        html += '<div class="game_border_corner corner3"></div><div class="game_border_corner corner4"></div>';
        html += this.getTitleHtml('attack_title', '⚔️ Ataque + 🛡️ Dodge', this.toggle, '', this._active);

        // ═══ SEÇÃO DODGE ═══
        html += '<div style="padding:4px 10px;border-bottom:1px solid rgba(0,0,0,0.15);">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
        html += '<span style="font-weight:bold;font-size:11px;">🛡️ Dodge <span id="dodge_counter" style="color:#888;">0</span></span>';
        html += '<span style="font-size:9px;color:#666;">' + Object.keys(this.DODGE_CIDADES).length + ' cidades protegidas</span>';
        html += '</div>';
        html += '<div id="dodge_panel_container" style="font-size:11px;max-height:200px;overflow-y:auto;margin:4px 0;"></div>';
        html += '<div style="display:flex;gap:4px;margin:4px 0;flex-wrap:wrap;">';
        html += this.getButtonHtml('dodge_refresh', '🔄 Atualizar', this._dodgeRefresh);
        html += this.getButtonHtml('dodge_clear', '🗑️ Limpar', this._dodgeClear);
        html += '</div>';
        html += '<div style="display:flex;gap:4px;margin:4px 0;flex-wrap:wrap;align-items:center;font-size:10px;">';
        html += '<label style="font-size:10px;">Atacada:</label>';
        html += '<select id="dodge_attack_cidade" style="padding:2px;font-size:10px;width:100px;">';
        html += this._getTownOptionsHtml();
        html += '</select>';
        html += '<label style="font-size:10px;">→ Suporte:</label>';
        html += '<select id="dodge_support_cidade" style="padding:2px;font-size:10px;width:100px;">';
        html += this._getTownOptionsHtml();
        html += '</select>';
        html += this.getButtonHtml('dodge_add_btn', '+ Add', this._dodgeAddCidade);
        html += '</div>';
        html += '<div style="font-size:9px;color:#666;margin:2px 0;">⭐ ' + this.DODGE_CONFIG.JANELA_GRUPO + 's = GRUPO | ' + this.DODGE_CONFIG.TEMPO_ANTECEDENCIA + 's ANTES | ' + this.DODGE_CONFIG.MARGEM_SEGURANCA_RETORNO + 's APÓS</div>';
        html += '</div>';

        // ═══ SEÇÃO AUTO ATTACK ═══
        html += '<div style="padding:4px 10px;">';
        html += '<div style="font-weight:bold;font-size:11px;margin:4px 0;">⚔️ Planos de Ataque</div>';

        html += '<div style="display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap;">';
        html += '<div style="flex:1; min-width:180px;">';
        html += '<label style="font-size:11px;font-weight:bold;">Cidade Atacante</label><br>';
        html += '<select id="attack_origin_select" style="width:100%;padding:3px;">';
        html += this._getTownOptionsHtml();
        html += '</select>';
        html += '</div>';
        html += '<div style="width:140px;">';
        html += '<label style="font-size:11px;font-weight:bold;" title="Espera antes de reatacar o mesmo alvo, +-10% de variacao. 0 = sem espera.">Descanso (min)</label><br>';
        html += '<input type="number" id="attack_rest_minutes" min="0" placeholder="0" style="width:100%;padding:3px;" value="0">';
        html += '</div>';
        html += '</div>';

        html += '<div style="display:flex; gap:10px; align-items:flex-end; margin-top:6px; flex-wrap:wrap;">';
        html += '<div style="flex:1; min-width:180px;">';
        html += '<label style="font-size:11px;font-weight:bold;" title="Opcional. Envia esse heroi junto com o ataque, se ele estiver disponivel na cidade atacante no momento do disparo.">Heroi (opcional)</label><br>';
        html += '<select id="attack_hero_select" style="width:100%;padding:3px;">';
        html += this._getHeroOptionsHtml();
        html += '</select>';
        html += '</div>';
        html += '</div>';

        html += '<div style="display:flex; gap:8px; align-items:flex-end; margin-top:6px; flex-wrap:wrap;">';
        html += '<div style="flex:1; min-width:130px;">';
        html += '<label style="font-size:11px;font-weight:bold;">Unidade</label><br>';
        html += '<select id="attack_unit_select" style="width:100%;padding:3px;">';
        html += this._getUnitOptionsHtml();
        html += '</select>';
        html += '</div>';
        html += '<div style="width:75px;">';
        html += '<label style="font-size:11px;font-weight:bold;">Qtde</label><br>';
        html += '<input type="number" id="attack_qty" min="1" placeholder="100" style="width:100%;padding:3px;">';
        html += '</div>';
        html += '<div style="width:60px;">';
        html += '<label style="font-size:11px;font-weight:bold;" title="Sempre envia TUDO que estiver disponivel dessa unidade no momento do ataque.">&nbsp;</label><br>';
        html += '<label style="font-size:11px;display:flex;align-items:center;gap:3px;cursor:pointer;padding:4px 0;">';
        html += '<input type="checkbox" id="attack_qty_max" onchange="window.multBot.autoAttack.toggleMaxQty()"> Max';
        html += '</label>';
        html += '</div>';
        html += '<div>';
        html += this.getButtonHtml('attack_add_unit_btn', '+ Unidade', this.addUnitToStaging);
        html += '</div>';
        html += '</div>';

        html += '<div id="attack_staging_list" style="font-size:11px; margin-top:4px;"></div>';

        html += '<div style="margin-top:6px;">';
        html += '<label style="font-size:11px;font-weight:bold;">Cidades-alvo (ID, separadas por virgula ou linha)</label>';
        html += '<textarea id="attack_targets" rows="1" style="width:100%;padding:4px;box-sizing:border-box;" placeholder="ex: 12345, 67890"></textarea>';
        html += '</div>';

        html += '<div style="margin-top:6px;">';
        html += this.getButtonHtml('attack_add_plan_btn', '+ Adicionar Plano', this.addPlan);
        html += '</div>';
        html += '</div>';

        html += '<div style="padding:4px 10px 8px;border-top:1px solid rgba(0,0,0,0.15);">';
        html += '<div style="font-weight:bold;font-size:11px;margin:4px 0;">Planos ativos:</div>';
        html += '<div id="attack_plans_list" style="';
        html += 'max-height:' + this.PLANS_LIST_MAX_HEIGHT + 'px;';
        html += 'overflow-y:scroll;';
        html += 'overflow-x:hidden;';
        html += 'border:1px solid #7a5c2a;';
        html += 'border-radius:3px;';
        html += 'background:rgba(255,255,255,0.35);';
        html += 'padding:3px 5px;';
        html += 'box-sizing:border-box;';
        html += '"></div>';
        html += '</div>';

        html += '<div id="attack_log" style="padding:0 10px 6px;font-size:11px;color:#5a3a0a;min-height:14px;"></div>';
        html += '</div>';

        return html;
    };

    // ═══ MÉTODOS DO DODGE (UI) ═══

    _dodgeAddCidade = () => {
        const atacada = uw.$('#dodge_attack_cidade').val();
        const suporte = uw.$('#dodge_support_cidade').val();

        if (!atacada || !suporte) {
            this.console.log('[Dodge] Erro: selecione ambas as cidades.');
            uw.$('#attack_log').text('Erro: selecione ambas as cidades.').css('color', '#f87171');
            return;
        }

        if (atacada === suporte) {
            this.console.log('[Dodge] Erro: a cidade atacada não pode ser a mesma que envia suporte.');
            uw.$('#attack_log').text('Erro: cidades devem ser diferentes.').css('color', '#f87171');
            return;
        }

        this.DODGE_CIDADES[atacada] = suporte;
        this.storage.save('dodge_cidades', this.DODGE_CIDADES);
        this.console.log('[Dodge] ✅ Cidade adicionada: ' + atacada + ' → ' + suporte);
        uw.$('#attack_log').text('Cidade adicionada: ' + atacada + ' → ' + suporte).css('color', '#1a6b2a');

        this._updateDodgePanel();
        this._scanAttacks();
    };

    _dodgeRefresh = () => {
        this._scanAttacks();
        this.console.log('[Dodge] 🔄 Scan manual executado');
        uw.$('#attack_log').text('Scan atualizado!').css('color', '#1a6b2a');
    };

    _dodgeClear = () => {
        if (!confirm('🗑️ Limpar todos os ataques detectados?')) return;
        for (var key in this.dodgeState.groupTimers) {
            clearTimeout(this.dodgeState.groupTimers[key]);
        }
        for (var key in this.dodgeState.returnTimers) {
            clearTimeout(this.dodgeState.returnTimers[key]);
        }
        this.dodgeState.groupStatus = {};
        this.dodgeState.groupTimers = {};
        this.dodgeState.returnTimers = {};
        this.dodgeState.executedGroups = {};
        this.troopsSent = {};
        this.attackCommands = {};
        this._updateDodgePanel();
        this.console.log('[Dodge] ✅ Todos os ataques foram limpos');
        uw.$('#attack_log').text('Ataques limpos!').css('color', '#1a6b2a');
    };

    // ═══ MÉTODOS EXISTENTES DO AUTOATTACK ═══

    _getTownOptionsHtml() {
        try {
            const towns = uw.ITowns.towns;
            const keys = Object.keys(towns);

            keys.sort(function (a, b) {
                const nameA = towns[a].getName ? towns[a].getName() : '';
                const nameB = towns[b].getName ? towns[b].getName() : '';
                return nameA.localeCompare(nameB);
            });

            let html = '<option value="">Selecione...</option>';
            for (const id of keys) {
                const t = towns[id];
                const name = t.getName ? t.getName() : ('#' + id);
                html += '<option value="' + id + '">' + name + ' (#' + id + ')</option>';
            }
            return html;
        } catch (e) {
            return '<option value="">Erro ao carregar cidades</option>';
        }
    }

    _getUnitOptionsHtml() {
        try {
            const units = uw.GameData.units;
            const keys = Object.keys(units).filter(function (u) {
                return u !== 'militia';
            });

            const self = this;
            const items = keys.map(function (key) {
                return { id: key, label: self._getUnitLabel(key), isNaval: !!units[key].is_naval };
            });

            items.sort(function (a, b) {
                return a.label.localeCompare(b.label);
            });

            let html = '<option value="">Selecione...</option>';
            for (const item of items) {
                const typeTag = item.isNaval ? ' (naval)' : ' (terra)';
                html += '<option value="' + item.id + '">' + item.label + typeTag + '</option>';
            }
            return html;
        } catch (e) {
            return '<option value="">Erro ao carregar unidades</option>';
        }
    }

    _getHeroOptionsHtml() {
        try {
            const heroes = uw.GameData.heroes;
            const keys = Object.keys(heroes);

            const self = this;
            const items = keys.map(function (key) {
                return { id: key, label: self._getHeroLabel(key) || key };
            });

            items.sort(function (a, b) {
                return a.label.localeCompare(b.label);
            });

            let html = '<option value="">Nenhum</option>';
            for (const item of items) {
                html += '<option value="' + item.id + '">' + item.label + '</option>';
            }
            return html;
        } catch (e) {
            return '<option value="">Nenhum</option>';
        }
    }

    toggleMaxQty = () => {
        const checked = uw.$('#attack_qty_max').is(':checked');
        const $qty = uw.$('#attack_qty');
        if (checked) {
            $qty.prop('disabled', true).val('');
        } else {
            $qty.prop('disabled', false);
        }
    };

    addUnitToStaging = () => {
        const unit = uw.$('#attack_unit_select').val();
        const useMax = uw.$('#attack_qty_max').is(':checked');
        const qty = parseInt(uw.$('#attack_qty').val(), 10);

        if (!unit) {
            this.console.log('[AutoAttack] Erro: selecione uma unidade antes de adicionar.');
            uw.$('#attack_log').text('Erro: selecione uma unidade.').css('color', '#f87171');
            return;
        }
        if (!useMax && (!qty || qty <= 0)) {
            this.console.log('[AutoAttack] Erro: quantidade invalida.');
            uw.$('#attack_log').text('Erro: informe uma quantidade valida ou marque Max.').css('color', '#f87171');
            return;
        }

        const unitData = uw.GameData.units[unit];
        const isNaval = unitData && unitData.is_naval ? true : false;

        let existing = null;
        for (const u of this._stagingUnits) {
            if (u.unit === unit) {
                existing = u;
                break;
            }
        }

        if (existing) {
            if (useMax) {
                existing.useMax = true;
                existing.quantity = 0;
            } else if (existing.useMax) {
                existing.useMax = false;
                existing.quantity = qty;
            } else {
                existing.quantity += qty;
            }
        } else {
            this._stagingUnits.push({
                unit: unit,
                quantity: useMax ? 0 : qty,
                isNaval: isNaval,
                useMax: useMax
            });
        }

        uw.$('#attack_qty').val('').prop('disabled', false);
        uw.$('#attack_qty_max').prop('checked', false);
        uw.$('#attack_unit_select').val('');

        this._renderStagingUnits();

        const entryForLog = existing ? existing : this._stagingUnits[this._stagingUnits.length - 1];
        this.console.log('[AutoAttack] Unidade adicionada a composicao: ' + this._formatUnitEntry(entryForLog));
    };

    removeStagingUnit = (unit) => {
        this._stagingUnits = this._stagingUnits.filter(function (u) {
            return u.unit !== unit;
        });
        this._renderStagingUnits();
    };

    _renderStagingUnits() {
        const container = uw.$('#attack_staging_list');
        if (!container.length) return;

        if (this._stagingUnits.length === 0) {
            container.html('<span style="color:#7a5c2a;">Nenhuma unidade na composicao ainda.</span>');
            return;
        }

        let html = '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
        for (const u of this._stagingUnits) {
            html += '<span style="background:rgba(0,0,0,0.08);border-radius:3px;padding:2px 6px;display:inline-flex;align-items:center;gap:4px;">';
            html += this._formatUnitEntry(u);
            html += '<span onclick="window.multBot.autoAttack.removeStagingUnit(\'' + u.unit + '\')" style="cursor:pointer;color:#f87171;font-weight:bold;">X</span>';
            html += '</span>';
        }
        html += '</div>';
        container.html(html);
    }

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
        this.storage.save('attack_active', true);
        this._updateTitle();
        this.console.log('[AutoAttack] Iniciado. Monitorando planos de ataque...');
        this._tick();
        this._intervalId = this.createGuardedInterval(() => this._tick(), this.CHECK_INTERVAL_MS);
    }

    stop() {
        this._active = false;
        this.storage.save('attack_active', false);
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
        this._updateTitle();
        this.console.log('[AutoAttack] Parado.');
    }

    _updateTitle() {
        const filter = this._active ? 'brightness(100%) saturate(186%) hue-rotate(241deg)' : '';
        uw.$('#attack_title').css('filter', filter);
    }

    addPlan = () => {
        const originId = (uw.$('#attack_origin_select').val() || '').trim();
        const targetsRaw = (uw.$('#attack_targets').val() || '').trim();
        const restMinutesRaw = parseInt(uw.$('#attack_rest_minutes').val(), 10);
        const restMinutes = (!isNaN(restMinutesRaw) && restMinutesRaw > 0) ? restMinutesRaw : 0;
        const hero = (uw.$('#attack_hero_select').val() || '').trim() || null;

        if (!originId) {
            this.console.log('[AutoAttack] Erro: nenhuma cidade atacante selecionada.');
            uw.$('#attack_log').text('Erro: selecione uma cidade atacante.').css('color', '#f87171');
            return;
        }
        if (this._stagingUnits.length === 0) {
            this.console.log('[AutoAttack] Erro: adicione ao menos uma unidade a composicao.');
            uw.$('#attack_log').text('Erro: adicione ao menos uma unidade.').css('color', '#f87171');
            return;
        }

        const rawTargets = targetsRaw.split(/[\n,]+/);
        const targets = [];
        for (const t of rawTargets) {
            const trimmed = t.trim();
            if (/^\d+$/.test(trimmed)) targets.push(trimmed);
        }

        if (targets.length === 0) {
            this.console.log('[AutoAttack] Erro: nenhuma cidade-alvo valida informada.');
            uw.$('#attack_log').text('Erro: informe pelo menos uma cidade-alvo valida.').css('color', '#f87171');
            return;
        }

        const unitsCopy = [];
        for (const u of this._stagingUnits) {
            unitsCopy.push({ unit: u.unit, quantity: u.quantity, isNaval: u.isNaval, useMax: u.useMax });
        }

        const plan = {
            id: Date.now() + '_' + Math.floor(Math.random() * 10000),
            originId: originId,
            units: unitsCopy,
            targets: targets,
            restMinutes: restMinutes,
            nextAllowedAt: {},
            hero: hero,
            enabled: true
        };

        this._plans.push(plan);
        this.storage.save('attack_plans', this._plans);
        this._renderPlans();

        this._stagingUnits = [];
        this._renderStagingUnits();
        uw.$('#attack_origin_select').val('');
        uw.$('#attack_targets').val('');
        uw.$('#attack_rest_minutes').val('0');
        uw.$('#attack_hero_select').val('');

        const originTown = uw.ITowns.towns[originId];
        const originName = originTown && originTown.getName ? originTown.getName() : ('#' + originId);

        let unitsSummary = '';
        for (let i = 0; i < plan.units.length; i++) {
            if (i > 0) unitsSummary += ', ';
            unitsSummary += this._formatUnitEntry(plan.units[i]);
        }

        const restLabel = restMinutes > 0 ? (', descanso ' + restMinutes + 'min') : '';
        const heroLabel = hero ? (', heroi: ' + this._getHeroLabel(hero)) : '';
        this.console.log('[AutoAttack] Plano adicionado: ' + originName + ' [' + unitsSummary + '] -> ' + targets.length + ' alvo(s)' + restLabel + heroLabel + '.');
        uw.$('#attack_log').text('Plano adicionado com sucesso!').css('color', '#1a6b2a');
    };

    removePlan = (planId) => {
        this._plans = this._plans.filter(function (p) {
            return p.id !== planId;
        });
        this.storage.save('attack_plans', this._plans);
        this._renderPlans();
        this.console.log('[AutoAttack] Plano removido.');
    };

    _renderPlans() {
        const container = uw.$('#attack_plans_list');
        if (!container.length) return;

        if (this._plans.length === 0) {
            container.html('<span style="font-size:11px;color:#7a5c2a;">Nenhum plano configurado.</span>');
            return;
        }

        let html = '';

        for (const plan of this._plans) {
            if (!Array.isArray(plan.units)) continue;

            const townName = this.getTownName(plan.originId);

            let unitsLabel = '';
            for (let i = 0; i < plan.units.length; i++) {
                if (i > 0) unitsLabel += ', ';
                unitsLabel += this._formatUnitEntry(plan.units[i]);
            }

            if (plan.hero) {
                unitsLabel += ' + heroi ' + this._getHeroLabel(plan.hero);
            }

            let targetsLabel = '';
            for (let i = 0; i < plan.targets.length; i++) {
                if (i > 0) targetsLabel += ', ';
                targetsLabel += this.getTownName(plan.targets[i]);

                const nextAt = plan.nextAllowedAt ? plan.nextAllowedAt[plan.targets[i]] : null;
                if (nextAt && nextAt > Date.now()) {
                    const remainMin = Math.ceil((nextAt - Date.now()) / 60000);
                    targetsLabel += '(' + remainMin + 'min)';
                }
            }

            const restLabel = (plan.restMinutes && plan.restMinutes > 0) ? (' | ' + plan.restMinutes + 'min') : '';

            html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 2px;border-bottom:1px solid rgba(0,0,0,0.08);font-size:10px;line-height:1.3;">';
            html += '<div style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:6px;" title="' + townName + ' [' + unitsLabel + '] -> ' + targetsLabel + restLabel + '">';
            html += '<b>' + townName + '</b> [' + unitsLabel + '] &rarr; ' + targetsLabel + restLabel;
            html += '</div>';
            html += '<span onclick="window.multBot.autoAttack.removePlan(\'' + plan.id + '\')" style="cursor:pointer;color:#f87171;font-weight:bold;flex-shrink:0;padding:0 4px;">X</span>';
            html += '</div>';
        }

        container.html(html);
    }

    async _tick() {
        if (window.__multbot_captcha_active) return;
        if (this._plans.length === 0) return;

        const promises = [];
        for (const plan of this._plans) {
            if (!plan.enabled) continue;
            promises.push(this._checkAndFire(plan));
        }

        await Promise.all(promises);
    }

    _computeNextAllowedAt(restMinutes) {
        const baseMs = restMinutes * 60 * 1000;
        const jitterRange = baseMs * this.JITTER_PERCENT;
        const jitter = (Math.random() * 2 - 1) * jitterRange;
        return Date.now() + baseMs + jitter;
    }

    async _checkAndFire(plan) {
        try {
            if (!Array.isArray(plan.units) || plan.units.length === 0) {
                this.console.log('[AutoAttack] Aviso: plano da cidade #' + plan.originId + ' sem composicao valida, ignorado.');
                return;
            }

            const town = uw.ITowns.towns[plan.originId];
            if (!town) {
                this.console.log('[AutoAttack] Aviso: cidade #' + plan.originId + ' nao encontrada (nao e sua ou saiu do cache).');
                return;
            }

            const available = town.units();

            let hasMissing = false;
            for (const u of plan.units) {
                const have = available[u.unit] || 0;
                const required = u.useMax ? 1 : u.quantity;
                if (have < required) {
                    hasMissing = true;
                    break;
                }
            }
            if (hasMissing) return;

            if (!plan.nextAllowedAt) plan.nextAllowedAt = {};

            const now = Date.now();

            const readyTargets = [];
            for (const targetId of plan.targets) {
                const nextAt = plan.nextAllowedAt[targetId];
                if (nextAt && nextAt > now) continue;
                readyTargets.push(targetId);
            }

            if (readyTargets.length === 0) {
                return;
            }

            const townName = town.getName ? town.getName() : ('#' + plan.originId);

            let unitsSummary = '';
            for (let i = 0; i < plan.units.length; i++) {
                if (i > 0) unitsSummary += ', ';
                unitsSummary += this._formatUnitEntry(plan.units[i]);
            }

            this.console.log('[AutoAttack] ' + townName + ': composicao completa disponivel [' + unitsSummary + ']. Disparando ataques em ' + readyTargets.length + ' alvo(s) prontos...');

            const remaining = {};
            for (const u of plan.units) {
                remaining[u.unit] = available[u.unit] || 0;
            }

            let heroAlreadySent = false;

            for (const targetId of readyTargets) {
                let stillEnough = true;
                for (const u of plan.units) {
                    const required = u.useMax ? 1 : u.quantity;
                    if (remaining[u.unit] < required) {
                        stillEnough = false;
                        break;
                    }
                }
                if (!stillEnough) {
                    this.console.log('[AutoAttack] ' + townName + ': composicao insuficiente para continuar aos proximos alvos.');
                    break;
                }

                const sendUnits = [];
                for (const u of plan.units) {
                    const qtyToSend = u.useMax ? remaining[u.unit] : u.quantity;
                    sendUnits.push({ unit: u.unit, quantity: qtyToSend });
                }

                let sendSummary = '';
                for (let i = 0; i < sendUnits.length; i++) {
                    if (i > 0) sendSummary += ', ';
                    sendSummary += sendUnits[i].quantity + 'x ' + this._getUnitLabel(sendUnits[i].unit);
                }

                const heroForThisSend = (plan.hero && !heroAlreadySent) ? plan.hero : null;
                if (heroForThisSend) {
                    sendSummary += ' + heroi ' + this._getHeroLabel(heroForThisSend);
                }

                const targetName = this.getTownName(targetId);
                try {
                    await this._sendAttack(plan.originId, targetId, sendUnits, heroForThisSend);
                    if (heroForThisSend) heroAlreadySent = true;
                    this.console.log('[AutoAttack] OK: ' + townName + ' -> ' + targetName + ': ataque com [' + sendSummary + '] enviado!');
                    uw.$('#attack_log').text('OK: ' + townName + ' atacou ' + targetName + ' [' + sendSummary + ']').css('color', '#1a6b2a');
                    if (uw.HumanMessage) {
                        uw.HumanMessage.success('MultBot: ' + townName + ' -> ' + targetName + ' (ataque)');
                    }

                    for (const u of plan.units) {
                        if (u.useMax) {
                            remaining[u.unit] = 0;
                        } else {
                            remaining[u.unit] -= u.quantity;
                        }
                    }

                    if (plan.restMinutes && plan.restMinutes > 0) {
                        const nextAllowed = this._computeNextAllowedAt(plan.restMinutes);
                        plan.nextAllowedAt[targetId] = nextAllowed;
                        this.storage.save('attack_plans', this._plans);

                        const remainMin = Math.round((nextAllowed - Date.now()) / 60000);
                        this.console.log('[AutoAttack] ' + targetName + ' entrando em descanso por aproximadamente ' + remainMin + 'min.');
                    }
                } catch (e) {
                    const msg = e && e.message ? e.message : e;
                    this.console.log('[AutoAttack] FALHA ao atacar ' + targetName + ' de ' + townName + ': ' + msg);
                    uw.$('#attack_log').text('Falha ao atacar ' + targetName + ': ' + msg).css('color', '#f87171');
                }

                await this.sleep(this.SEND_DELAY_MS);
            }
        } catch (e) {
            const msg = e && e.message ? e.message : e;
            this.console.log('[AutoAttack] Erro ao processar plano da cidade #' + plan.originId + ': ' + msg);
        }
    }

    _sendAttack(fromTownId, toTownId, unitsList, heroKey) {
        return this._withTownId(fromTownId, () => {
            const data = {
                id: parseInt(toTownId, 10),
                type: 'attack',
                nl_init: true
            };

            for (const u of unitsList) {
                data[u.unit] = u.quantity;
            }

            if (heroKey) {
                data.heroes = heroKey;
            }

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
};
