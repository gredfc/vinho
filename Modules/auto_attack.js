// ═══════════════════════════════════════════════════════════════════════
//  MODULE: AutoDodge - Herald SO V49.2
//  Dodge com AGRUPAMENTO + ATUALIZAÇÃO EM TEMPO REAL
//  Mantido EXATAMENTE como no script original
// ═══════════════════════════════════════════════════════════════════════

var AutoDodge = class extends MultUtil {
    constructor(c, s) {
        super(c, s);

        // ═══ CONFIGURAÇÃO (igual ao original) ═══
        this.CIDADES = this.storage.load('dodge_cidades', {});

        this.CONFIG = {
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

        this.UNIDADES_NAVAIS = ['bireme', 'trireme', 'attack_ship', 'demolition_ship', 'colonize_ship', 'small_transporter', 'big_transporter'];
        this.UNIDADES_TERRESTRES = ['sword', 'archer', 'hoplite', 'slinger', 'rider', 'chariot', 'catapult', 'militia'];

        this.attackCommands = {};
        this.troopsSent = {};

        this.dodgeState = {
            groupTimers: {},
            returnTimers: {},
            groupStatus: {},
            isScanning: false,
            lastScan: 0,
            executedGroups: {},
        };

        // Iniciar o Dodge
        setTimeout(() => {
            this._startDodge();
        }, 3000);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🛠️ FUNÇÕES AUXILIARES (adaptadas para uw)
    // ═══════════════════════════════════════════════════════════════════════

    _gameNow() {
        try {
            if (uw.Timestamp && uw.Timestamp.server) {
                return uw.Timestamp.server();
            }
            return Date.now() / 1000;
        } catch(e) { return Date.now() / 1000; }
    }

    _getGame() {
        try {
            return uw.Game;
        } catch(e) { return null; }
    }

    _getMM() {
        try {
            return uw.MM;
        } catch(e) { return null; }
    }

    _getITowns() {
        try {
            return uw.ITowns;
        } catch(e) { return null; }
    }

    _log(message, type = 'info') {
        if (!this.CONFIG.DEBUG && type === 'debug') return;
        const icons = { info: '📘', success: '✅', warning: '⚠️', error: '❌', debug: '🔍', attack: '⚔️', dodge: '🛡️', naval: '🚢', ground: '⚔️', group: '📦' };
        const icon = icons[type] || '📘';
        this.console.log(`[HERALD] ${icon} [${new Date().toLocaleTimeString()}] ${message}`);
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
        } catch(e) { /* Silencioso */ }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🧬 DETETAR TIPO DE ATAQUE (igual ao original)
    // ═══════════════════════════════════════════════════════════════════════

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

    // ═══════════════════════════════════════════════════════════════════════
    // 🪖 OBTER UNIDADES DA CIDADE (igual ao original)
    // ═══════════════════════════════════════════════════════════════════════

    _getUnitsFromTown(townId, attackType) {
        var units = {};
        var total = 0;
        var MM = this._getMM();

        try {
            if (MM) {
                const { models } = MM.getOnlyCollectionByName('Units');
                if (models) {
                    for (const model of models) {
                        const attrs = model.attributes;
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
                        break;
                    }
                }
            }
        } catch(e) {
            this._log(`❌ Erro ao ler unidades: ${e.message}`, 'error');
        }

        return { units: units, total: total };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📤 ENVIAR SUPORTE (igual ao original, usando ajaxPostWithTimeout)
    // ═══════════════════════════════════════════════════════════════════════

    _sendSupportForGroup(fromTownId, targetTownId, firstTime, lastTime, groupKey, attackType) {
        var timerKey = groupKey + '_' + attackType;

        if (this.troopsSent[timerKey]) {
            this._log(`⏳ Tropas ${attackType} já enviadas para este grupo`, 'info');
            return;
        }

        var typeLabel = attackType === 'naval' ? '🚢 NAVAL' : attackType === 'ground' ? '⚔️ TERRESTRE' : '🔄 MISTO';
        var Game = this._getGame();

        if (!Game || !Game.csrfToken) {
            this._log(`❌ Game não disponível para ${typeLabel}`, 'error');
            return;
        }

        var result = this._getUnitsFromTown(fromTownId, attackType);
        if (result.total === 0) {
            this._log(`⚠️ Nenhuma unidade ${typeLabel} disponível em ${fromTownId}`, 'warning');
            return;
        }

        var limitedUnits = {};
        var limitedTotal = 0;
        for (var u in result.units) {
            if (result.units.hasOwnProperty(u) && result.units[u] > 0) {
                var amount = Math.min(result.units[u], this.CONFIG.MAX_TROOPS_TO_SEND);
                limitedUnits[u] = amount;
                limitedTotal += amount;
            }
        }

        this._log(`🪖 Enviando ${limitedTotal} ${typeLabel} tropas de ${fromTownId} para ${targetTownId}`, 'info');
        this._log(`⏱️ Voltar ${this.CONFIG.MARGEM_SEGURANCA_RETORNO}s APÓS o último ataque`, 'info');

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

        // Usar ajaxPostWithTimeout do MultUtil
        this._withTownId(fromTownId, async function() {
            try {
                const result = await self.ajaxPostWithTimeout('town_info', 'send_units', payload, 15000);
                self._log(`✅ SUPORTE ${typeLabel} ENVIADO com sucesso!`, 'success');
                self._playSound('success');

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
                                        self._log(`📋 Command ID ${typeLabel}: ${commandId}`, 'debug');
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

                    var cancelDelay = (lastTime - self._gameNow() + self.CONFIG.MARGEM_SEGURANCA_RETORNO) * 1000;
                    cancelDelay = Math.max(cancelDelay, 1000);

                    var timerKey2 = groupKey + '_' + attackType;
                    if (self.dodgeState.returnTimers[timerKey2]) {
                        clearTimeout(self.dodgeState.returnTimers[timerKey2]);
                    }

                    self.dodgeState.returnTimers[timerKey2] = setTimeout(function() {
                        self._cancelCommand(commandId, fromTownId, attackType, groupKey);
                        delete self.troopsSent[timerKey2];
                    }, cancelDelay);

                    self._log(`⏱️ ${typeLabel} programado para voltar ${self.CONFIG.MARGEM_SEGURANCA_RETORNO}s APÓS`, 'info');
                } else {
                    self._log(`⚠️ Não foi possível extrair command_id para ${typeLabel}`, 'warning');
                }

                return result;
            } catch(e) {
                self._log(`❌ Erro ${typeLabel}: ${e.message}`, 'error');
                throw e;
            }
        });

        return commandId;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🚫 CANCELAR COMANDO (igual ao original)
    // ═══════════════════════════════════════════════════════════════════════

    _cancelCommand(commandId, townId, attackType, groupKey) {
        var typeLabel = attackType === 'naval' ? '🚢 NAVAL' : attackType === 'ground' ? '⚔️ TERRESTRE' : '🔄 MISTO';
        this._log(`🚫 CANCELANDO ${typeLabel} comando #${commandId}`, 'dodge');

        var Game = this._getGame();
        if (!Game || !Game.csrfToken) {
            this._log(`❌ Game não disponível para ${typeLabel}`, 'error');
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
                self._log(`✅ TROPAS ${typeLabel} VOLTARAM!`, 'success');
                self._playSound('success');

                var timerKey = groupKey + '_' + attackType;
                if (self.dodgeState.returnTimers[timerKey]) {
                    clearTimeout(self.dodgeState.returnTimers[timerKey]);
                    delete self.dodgeState.returnTimers[timerKey];
                }

                if (self.dodgeState.groupStatus[groupKey]) {
                    self.dodgeState.groupStatus[groupKey].status = 'cancelled';
                }
                self._updatePanel();
            } catch(e) {
                self._log(`❌ Erro ao cancelar ${typeLabel}: ${e.message}`, 'error');
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔍 SCAN DE ATAQUES (igual ao original)
    // ═══════════════════════════════════════════════════════════════════════

    _scanAttacks() {
        var now = Date.now();
        if (this.dodgeState.isScanning || (now - this.dodgeState.lastScan < 200)) return;
        this.dodgeState.isScanning = true;
        this.dodgeState.lastScan = now;

        try {
            var MM = this._getMM();
            if (!MM) { this.dodgeState.isScanning = false; return; }

            const { models } = MM.getOnlyCollectionByName('MovementsUnits');
            if (!models) { this.dodgeState.isScanning = false; return; }

            var nowTime = this._gameNow();
            var ITowns = this._getITowns();
            var myTowns = ITowns && ITowns.towns ? ITowns.towns : {};

            var cityAttacks = {};
            var CIDADES = this.CIDADES;

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
                if (!destino) {
                    this._log(`⚠️ Cidade ${townId} sem destino configurado!`, 'warning');
                    continue;
                }

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

                        this._log(`📦 GRUPO ATUALIZADO para ${townId}: ${existingData.attacks.length} ataques`, 'group');

                        if (this.dodgeState.groupTimers[existingGroupKey]) {
                            clearTimeout(this.dodgeState.groupTimers[existingGroupKey]);
                        }

                        var newDodgeDelay = Math.max(existingData.firstTime - nowTime - this.CONFIG.TEMPO_ANTECEDENCIA, 0) * 1000;
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

                    var typeLabel = isGroup ? '📦 GRUPO' : '🎯 INDIVIDUAL';
                    this._log(`${typeLabel} para ${townId} (${group.length} ataques)`, isGroup ? 'group' : 'attack');

                    var dodgeDelay = Math.max(firstTime - nowTime - this.CONFIG.TEMPO_ANTECEDENCIA, 0) * 1000;

                    if (this.dodgeState.groupTimers[groupKey]) {
                        clearTimeout(this.dodgeState.groupTimers[groupKey]);
                    }

                    var self = this;
                    this.dodgeState.groupTimers[groupKey] = setTimeout(function() {
                        self._executeDodgeForGroup(townId, destino, firstTime, lastTime, group, groupKey, isGroup);
                    }, dodgeDelay);
                }
            }

            this._updatePanel();

        } catch(e) {
            this._log(`⚠️ Erro no scan: ${e.message}`, 'error');
        }

        this.dodgeState.isScanning = false;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ⚡ EXECUTAR DODGE PARA UM GRUPO (igual ao original)
    // ═══════════════════════════════════════════════════════════════════════

    _executeDodgeForGroup(townId, destino, firstTime, lastTime, attacks, groupKey, isGroup) {
        try {
            if (this.dodgeState.executedGroups[groupKey]) {
                this._log(`ℹ️ Grupo ${groupKey} já executado`, 'info');
                return;
            }

            var troops = this._getUnitsFromTown(townId, 'mixed');
            if (troops.total < this.CONFIG.MIN_TROOPS_TO_DODGE) {
                this._log(`⚠️ Tropas insuficientes em ${townId}: ${troops.total}`, 'warning');
                if (this.dodgeState.groupStatus[groupKey]) {
                    this.dodgeState.groupStatus[groupKey].status = 'failed';
                }
                this._updatePanel();
                return;
            }

            var typeLabel = isGroup ? '📦 GRUPO' : '🎯 INDIVIDUAL';
            var numAttacks = attacks.length;
            this._log(`⚡ EXECUTANDO DODGE ${typeLabel} para ${townId} (${numAttacks} ataques)`, 'dodge');
            this._playSound('danger');

            this.dodgeState.executedGroups[groupKey] = true;

            var self = this;

            this._sendSupportForGroup(townId, destino, firstTime, lastTime, groupKey, 'ground');

            setTimeout(function() {
                self._sendSupportForGroup(townId, destino, firstTime, lastTime, groupKey, 'naval');
            }, this.CONFIG.DIFERENCA_ENVIO * 1000);

            if (this.dodgeState.groupStatus[groupKey]) {
                this.dodgeState.groupStatus[groupKey].dodged = true;
                this.dodgeState.groupStatus[groupKey].status = 'dodged';
            }

            this._log(`✅ Dodge executado para ${groupKey}!`, 'success');

        } catch(e) {
            this._log(`❌ Erro ao executar dodge: ${e.message}`, 'error');
            if (this.dodgeState.groupStatus[groupKey]) {
                this.dodgeState.groupStatus[groupKey].status = 'failed';
            }
        }
        this._updatePanel();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📋 UPDATE PANEL - EXATAMENTE IGUAL AO ORIGINAL
    // ═══════════════════════════════════════════════════════════════════════

    _updatePanel() {
        var panel = document.getElementById('herald-panel');
        if (!panel) return;

        var list = panel.querySelector('.hw-attack-list');
        if (!list) return;
        list.innerHTML = '';

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

        if (groups.length === 0) {
            list.innerHTML = `
                <div class="hw-empty-state">
                    <div class="hw-empty-icon">🛡️</div>
                    <div>Nenhum ataque detectado</div>
                    <div style="font-size:10px;color:#555;margin-top:4px;">${Object.keys(this.CIDADES).length} cidades protegidas</div>
                </div>
            `;
        } else {
            groups.sort(function(a, b) { return a.firstTime - b.firstTime; });

            for (var i = 0; i < groups.length; i++) {
                var data = groups[i];
                var item = document.createElement('div');
                item.className = 'hw-attack-item';

                if (data.dodged) {
                    item.classList.add('hw-dodged');
                }
                if (data.isGroup) {
                    item.classList.add('hw-group');
                }
                if (data.status === 'failed') {
                    item.classList.add('hw-failed');
                }

                var timeLeft = Math.round(data.firstTime - now);
                var timeStr = timeLeft > 0 ? (timeLeft > 60 ? Math.round(timeLeft / 60) + 'm ' + (timeLeft % 60) + 's' : timeLeft + 's') : '💥';

                var timeColor = '';
                if (timeLeft < 5 && timeLeft > 0) timeColor = 'hw-urgent';
                else if (timeLeft < 15 && timeLeft > 0) timeColor = 'hw-warning';
                else if (timeLeft > 0) timeColor = 'hw-safe';

                var typeLabel = data.isGroup ? '📦 GRUPO' : '🎯 INDIVIDUAL';
                var badgeHtml = '';
                if (data.isGroup) {
                    badgeHtml = `<span class="hw-attack-badge hw-badge-group">${data.attacks.length} ataques</span>`;
                }

                var statusMap = {
                    'waiting': '⏳ Aguardando',
                    'dodged': '🌀 Desviado',
                    'cancelled': '✅ Voltou',
                    'failed': '❌ Falhou'
                };
                var statusClassMap = {
                    'waiting': 'hw-status-waiting',
                    'dodged': 'hw-status-dodged',
                    'cancelled': 'hw-status-cancelled',
                    'failed': 'hw-status-failed'
                };

                var statusText = statusMap[data.status] || '⏳ Aguardando';
                var statusClass = statusClassMap[data.status] || 'hw-status-waiting';

                var firstStr = new Date(data.firstTime * 1000).toLocaleTimeString();
                var lastStr = new Date(data.lastTime * 1000).toLocaleTimeString();
                var returnStr = new Date((data.lastTime + this.CONFIG.MARGEM_SEGURANCA_RETORNO) * 1000).toLocaleTimeString();

                item.innerHTML = `
                    <span class="hw-attack-to">🏙️ ${data.townId} → ${data.destino}</span>
                    <span style="font-size:10px;color:#888;">${typeLabel}</span>
                    ${badgeHtml}
                    <span class="hw-attack-time ${timeColor}">⏱️ ${timeStr}</span>
                    <span style="font-size:9px;color:#666;">${firstStr} → ${lastStr}</span>
                    <span style="font-size:9px;color:#00b894;">↩️ ${returnStr}</span>
                    <span class="hw-attack-status ${statusClass}">${statusText}</span>
                `;

                list.appendChild(item);
                attackCount++;
            }
        }

        var counter = panel.querySelector('.hw-count');
        if (counter) {
            counter.textContent = attackCount;
            counter.classList.toggle('hw-count-danger', attackCount > 0);
        }

        var icon = document.querySelector('.hw-control-icon');
        if (icon) {
            var badge = icon.querySelector('.hw-icon-badge');
            if (attackCount > 0) {
                icon.classList.add('hw-has-attacks');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'hw-icon-badge';
                    icon.appendChild(badge);
                }
                badge.textContent = attackCount;
            } else {
                icon.classList.remove('hw-has-attacks');
                if (badge) badge.remove();
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🎨 PAINEL - EXATAMENTE IGUAL AO ORIGINAL
    // ═══════════════════════════════════════════════════════════════════════

    _addHeraldIcon() {
        var icon = document.createElement('span');
        icon.className = 'hw-control-icon';
        icon.innerHTML = '🛡️';
        icon.title = 'Herald SO - Dodge V49.2';

        var target = document.querySelector('#header .controls') ||
            document.querySelector('.controls') ||
            document.querySelector('#header-controls');

        if (target) {
            target.appendChild(icon);
        } else {
            var fallback = document.createElement('div');
            fallback.style.cssText = 'position:fixed;top:4px;right:4px;z-index:99999;background:rgba(0,0,0,0.7);border-radius:8px;padding:6px;cursor:pointer;';
            fallback.appendChild(icon);
            document.body.appendChild(fallback);
        }

        var self = this;
        icon.addEventListener('click', function() { self._showPanel(); });
        this._log('✅ Ícone adicionado', 'success');
    }

    _showPanel() {
        var existing = document.getElementById('herald-panel');
        if (existing) {
            existing.style.display = existing.style.display === 'none' ? 'flex' : 'none';
            return;
        }

        var panel = document.createElement('div');
        panel.id = 'herald-panel';

        // CSS INJECTADO DIRETAMENTE (igual ao original)
        // Nota: o CSS já foi injetado via GM_addStyle no original,
        // mas aqui vamos usar o mesmo CSS inline para manter compatibilidade

        var style = document.createElement('style');
        style.textContent = `
            #herald-panel {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 420px;
                max-width: 95vw;
                max-height: 85vh;
                background: #1a1a2e;
                border: 1px solid #333;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.8);
                z-index: 999999;
                font-family: 'Segoe UI', Arial, sans-serif;
                color: #eee;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            #herald-panel .hw-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: #16213e;
                border-bottom: 1px solid #333;
                flex-shrink: 0;
            }
            #herald-panel .hw-title {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                font-weight: 700;
                color: #a29bfe;
            }
            #herald-panel .hw-controls {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            #herald-panel .hw-close {
                color: #888;
                font-size: 18px;
                cursor: pointer;
                padding: 0 8px;
                background: none;
                border: none;
            }
            #herald-panel .hw-close:hover { color: #ff6b6b; }
            #herald-panel .hw-toolbar {
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
                padding: 8px 12px;
                background: #0f0f1a;
                border-bottom: 1px solid #333;
                flex-shrink: 0;
                align-items: center;
            }
            #herald-panel .hw-toolbar .hw-search {
                flex: 1;
                min-width: 80px;
                background: #222;
                color: #eee;
                border: 1px solid #444;
                border-radius: 6px;
                padding: 4px 10px;
                font-size: 11px;
                outline: none;
            }
            #herald-panel .hw-toolbar .hw-search:focus {
                border-color: #6c5ce7;
            }
            #herald-panel .hw-toolbar .hw-counter {
                font-size: 11px;
                color: #888;
                padding: 4px 10px;
                background: #222;
                border-radius: 6px;
                white-space: nowrap;
            }
            #herald-panel .hw-toolbar .hw-counter .hw-count {
                color: #a29bfe;
                font-weight: 700;
            }
            #herald-panel .hw-toolbar .hw-counter .hw-count.hw-count-danger {
                color: #ff6b6b;
            }
            #herald-panel .hw-toolbar .hw-btn {
                background: #222;
                color: #aaa;
                border: 1px solid #444;
                border-radius: 6px;
                padding: 4px 10px;
                font-size: 10px;
                cursor: pointer;
            }
            #herald-panel .hw-toolbar .hw-btn:hover {
                border-color: #6c5ce7;
                color: #fff;
            }
            #herald-panel .hw-toolbar .hw-btn.hw-btn-danger {
                background: #ff6b6b;
                color: #fff;
                border: none;
            }
            #herald-panel .hw-toolbar .hw-btn.hw-btn-success {
                background: #00b894;
                color: #fff;
                border: none;
            }
            #herald-panel .hw-attack-list {
                flex: 1;
                overflow-y: auto;
                padding: 8px 12px;
                min-height: 100px;
                max-height: 400px;
            }
            #herald-panel .hw-attack-list::-webkit-scrollbar {
                width: 4px;
            }
            #herald-panel .hw-attack-list::-webkit-scrollbar-thumb {
                background: #6c5ce7;
                border-radius: 4px;
            }
            #herald-panel .hw-empty-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                min-height: 80px;
                color: #666;
                font-size: 12px;
                text-align: center;
            }
            #herald-panel .hw-empty-state .hw-empty-icon {
                font-size: 28px;
                margin-bottom: 6px;
                opacity: 0.5;
            }
            #herald-panel .hw-attack-item {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 6px 10px;
                padding: 8px 12px;
                margin: 3px 0;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 8px;
                font-size: 12px;
            }
            #herald-panel .hw-attack-item.hw-dodged {
                border-color: rgba(0, 184, 148, 0.3);
                background: rgba(0, 184, 148, 0.05);
            }
            #herald-panel .hw-attack-item.hw-group {
                border-color: rgba(253, 203, 110, 0.3);
                background: rgba(253, 203, 110, 0.05);
            }
            #herald-panel .hw-attack-item.hw-failed {
                border-color: rgba(255, 107, 107, 0.3);
                background: rgba(255, 107, 107, 0.05);
            }
            #herald-panel .hw-attack-to {
                font-weight: 600;
                color: #ddd;
            }
            #herald-panel .hw-attack-badge {
                font-size: 8px;
                padding: 2px 8px;
                border-radius: 10px;
                background: #6c5ce7;
                color: #fff;
                font-weight: 700;
            }
            #herald-panel .hw-attack-badge.hw-badge-group {
                background: #fdcb6e;
                color: #000;
            }
            #herald-panel .hw-attack-time {
                font-size: 11px;
                color: #888;
            }
            #herald-panel .hw-attack-time.hw-urgent {
                color: #ff6b6b;
                font-weight: 700;
            }
            #herald-panel .hw-attack-time.hw-warning {
                color: #fdcb6e;
                font-weight: 700;
            }
            #herald-panel .hw-attack-time.hw-safe {
                color: #00b894;
            }
            #herald-panel .hw-attack-status {
                font-size: 8px;
                padding: 2px 10px;
                border-radius: 10px;
                text-transform: uppercase;
                font-weight: 700;
            }
            #herald-panel .hw-attack-status.hw-status-waiting {
                background: rgba(116, 185, 255, 0.15);
                color: #74b9ff;
            }
            #herald-panel .hw-attack-status.hw-status-dodged {
                background: rgba(0, 184, 148, 0.15);
                color: #00b894;
            }
            #herald-panel .hw-attack-status.hw-status-cancelled {
                background: rgba(253, 203, 110, 0.1);
                color: #fdcb6e;
            }
            #herald-panel .hw-attack-status.hw-status-failed {
                background: rgba(255, 107, 107, 0.15);
                color: #ff6b6b;
            }
            #herald-panel .hw-footer {
                padding: 6px 12px;
                border-top: 1px solid #333;
                font-size: 9px;
                color: #555;
                text-align: center;
                background: #0f0f1a;
                flex-shrink: 0;
            }
            .hw-control-icon {
                display: inline-block;
                cursor: pointer;
                font-size: 16px;
                padding: 4px 8px;
                opacity: 0.6;
                position: relative;
            }
            .hw-control-icon:hover {
                opacity: 1;
            }
            .hw-control-icon.hw-has-attacks {
                opacity: 1;
            }
            .hw-control-icon .hw-icon-badge {
                position: absolute;
                top: -4px;
                right: -4px;
                background: #ff6b6b;
                color: #fff;
                border-radius: 50%;
                font-size: 9px;
                padding: 1px 6px;
                min-width: 16px;
                text-align: center;
                font-weight: 700;
            }
            .hw-toggle {
                position: relative;
                width: 30px;
                height: 16px;
                flex-shrink: 0;
            }
            .hw-toggle input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            .hw-toggle .hw-toggle-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: #444;
                transition: 0.3s;
                border-radius: 16px;
            }
            .hw-toggle .hw-toggle-slider:before {
                position: absolute;
                content: "";
                height: 12px;
                width: 12px;
                left: 2px;
                bottom: 2px;
                background: #888;
                transition: 0.3s;
                border-radius: 50%;
            }
            .hw-toggle input:checked + .hw-toggle-slider {
                background: #6c5ce7;
            }
            .hw-toggle input:checked + .hw-toggle-slider:before {
                transform: translateX(14px);
                background: #fff;
            }
            @media (max-width: 600px) {
                #herald-panel {
                    width: 95vw;
                    bottom: 10px;
                    right: 10px;
                    border-radius: 10px;
                    max-height: 90vh;
                }
                #herald-panel .hw-attack-item {
                    font-size: 11px;
                    padding: 6px 10px;
                }
            }
        `;
        document.head.appendChild(style);

        panel.innerHTML = `
            <div class="hw-header">
                <div class="hw-title">
                    <span>🛡️</span>
                    Herald SO
                    <span style="font-size:9px;background:#6c5ce7;padding:2px 8px;border-radius:10px;color:#fff;">V49.2</span>
                </div>
                <div class="hw-controls">
                    <span class="hw-counter">⚔️ <span class="hw-count">0</span></span>
                    <button class="hw-close" onclick="this.closest('#herald-panel').style.display='none'">✕</button>
                </div>
            </div>

            <div class="hw-toolbar">
                <input class="hw-search" placeholder="🔍 Filtrar..." oninput="window._hwSearch(this.value)">
                <button class="hw-btn" onclick="window._hwRefresh()">🔄</button>
                <button class="hw-btn hw-btn-danger" onclick="window._hwClearAttacks()">🗑️</button>
                <button class="hw-btn hw-btn-success" onclick="window._hwTestDodge()">🧪</button>
                <label class="hw-toggle">
                    <input type="checkbox" ${this.CONFIG.AUTO_DODGE ? 'checked' : ''} onchange="window._hwToggleDodge(this.checked)">
                    <span class="hw-toggle-slider"></span>
                </label>
            </div>

            <div class="hw-attack-list">
                <div class="hw-empty-state">
                    <div class="hw-empty-icon">🛡️</div>
                    <div>Nenhum ataque detectado</div>
                </div>
            </div>

            <div class="hw-footer">
                ⭐ Menos de ${this.CONFIG.JANELA_GRUPO}s = GRUPO | ${this.CONFIG.TEMPO_ANTECEDENCIA}s ANTES | ${this.CONFIG.MARGEM_SEGURANCA_RETORNO}s APÓS
            </div>
        `;

        document.body.appendChild(panel);

        var self = this;

        window._hwSearch = function(val) {
            var items = panel.querySelectorAll('.hw-attack-item');
            var search = val.toLowerCase();
            for (var i = 0; i < items.length; i++) {
                items[i].style.display = items[i].textContent.toLowerCase().indexOf(search) >= 0 ? '' : 'none';
            }
        };

        window._hwRefresh = function() {
            self._scanAttacks();
            self._updatePanel();
        };

        window._hwClearAttacks = function() {
            if (!confirm('🗑️ Limpar todos os ataques?')) return;
            for (var key in self.dodgeState.groupTimers) {
                clearTimeout(self.dodgeState.groupTimers[key]);
            }
            for (var key in self.dodgeState.returnTimers) {
                clearTimeout(self.dodgeState.returnTimers[key]);
            }
            self.dodgeState.groupStatus = {};
            self.dodgeState.groupTimers = {};
            self.dodgeState.returnTimers = {};
            self.dodgeState.executedGroups = {};
            self.troopsSent = {};
            self.attackCommands = {};
            self._updatePanel();
            self._log('✅ Todos os ataques foram limpos', 'success');
        };

        window._hwTestDodge = function() {
            var towns = Object.keys(self.CIDADES);
            if (towns.length === 0) {
                self._log('⚠️ Nenhuma cidade configurada!', 'warning');
                return;
            }
            var townId = parseInt(towns[0]);
            var destino = self.CIDADES[townId];
            var now = self._gameNow();

            self._log(`🧪 Simulando ataques para ${townId}...`, 'info');

            var tempos = [10, 11, 24, 27, 40];

            var attacks = [];
            for (var i = 0; i < tempos.length; i++) {
                var arrival = now + tempos[i];
                var key = 'sim_' + Date.now() + '_' + i;
                attacks.push({
                    cmdId: key,
                    arrival: arrival,
                    type: 'mixed'
                });
                self._log(`🧪 Ataque ${i+1} às ${new Date(arrival * 1000).toLocaleTimeString()}`, 'debug');
            }

            var cityAttacks = {};
            cityAttacks[townId] = attacks;

            self._log(`🎯 ${attacks.length} ataques simulados!`, 'attack');

            var groups = [];
            var currentGroup = [attacks[0]];
            for (var i = 1; i < attacks.length; i++) {
                var gap = attacks[i].arrival - attacks[i-1].arrival;
                if (gap <= self.CONFIG.JANELA_GRUPO) {
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
                var isGroup = group.length > 1;

                self.dodgeState.groupStatus[groupKey] = {
                    townId: townId,
                    destino: destino,
                    firstTime: firstTime,
                    lastTime: lastTime,
                    attacks: group,
                    isGroup: isGroup,
                    status: 'waiting',
                    dodged: false
                };

                var dodgeDelay = Math.max(firstTime - now - self.CONFIG.TEMPO_ANTECEDENCIA, 0) * 1000;
                setTimeout(function(data, key) {
                    self._executeDodgeForGroup(data.townId, data.destino, data.firstTime, data.lastTime, data.attacks, key, data.isGroup);
                }, dodgeDelay);
            }

            self._updatePanel();
        };

        window._hwToggleDodge = function(checked) {
            self.CONFIG.AUTO_DODGE = checked;
            self._log(`🛡️ Dodge automático: ${checked ? 'ATIVADO' : 'DESATIVADO'}`, 'info');
        };

        this._updatePanel();
        this._log('📋 Painel aberto', 'success');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🚀 INICIALIZAÇÃO
    // ═══════════════════════════════════════════════════════════════════════

    _startDodge() {
        this._log('🚀 Herald SO v49.2 - DENTRO DO MULTBOT!', 'info');
        this._log('🏙️ Cidades: ' + Object.keys(this.CIDADES).join(', '), 'info');
        this._log('📦 Ataques com menos de ' + this.CONFIG.JANELA_GRUPO + 's = GRUPO', 'group');
        this._log('⭐ Envia ' + this.CONFIG.TEMPO_ANTECEDENCIA + 's ANTES do primeiro', 'dodge');
        this._log('⭐ Volta ' + this.CONFIG.MARGEM_SEGURANCA_RETORNO + 's APÓS o último', 'dodge');

        this._addHeraldIcon();

        // Primeiro scan
        setTimeout(() => this._scanAttacks(), 2000);

        // Scan periódico
        setInterval(() => this._scanAttacks(), this.CONFIG.INTERVALO_REFRESH_ATAQUES * 1000);

        this._log('✅ Sistema Dodge ativo!', 'success');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🛠️ MÉTODO AUXILIAR - withTownId
    // ═══════════════════════════════════════════════════════════════════════

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
    // 📋 ADICIONAR AO PAINEL DO MULTBOT (opcional)
    // ═══════════════════════════════════════════════════════════════════════

    settings() {
        // Retorna HTML para o painel do MultBot (configuração de cidades)
        let html = '';
        html += '<div style="padding:4px 10px;">';
        html += '<div style="font-weight:bold;font-size:11px;margin:4px 0;">🛡️ Dodge - Cidades Protegidas</div>';
        html += '<div style="display:flex;gap:4px;margin:4px 0;flex-wrap:wrap;align-items:center;">';
        html += '<label style="font-size:10px;">Cidade atacada:</label>';
        html += '<select id="dodge_attack_cidade" style="padding:2px;font-size:10px;">';
        html += this._getTownOptionsHtml();
        html += '</select>';
        html += '<label style="font-size:10px;">→ Envia suporte de:</label>';
        html += '<select id="dodge_support_cidade" style="padding:2px;font-size:10px;">';
        html += this._getTownOptionsHtml();
        html += '</select>';
        html += this.getButtonHtml('dodge_add_btn', '+ Adicionar', this._addCidade);
        html += '</div>';
        html += '<div style="font-size:10px;color:#666;">Cidades configuradas: ' + Object.keys(this.CIDADES).length + '</div>';
        html += '</div>';
        return html;
    }

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

    _addCidade = () => {
        const atacada = uw.$('#dodge_attack_cidade').val();
        const suporte = uw.$('#dodge_support_cidade').val();

        if (!atacada || !suporte) {
            this.console.log('[Dodge] Erro: selecione ambas as cidades.');
            return;
        }

        if (atacada === suporte) {
            this.console.log('[Dodge] Erro: a cidade atacada não pode ser a mesma que envia suporte.');
            return;
        }

        this.CIDADES[atacada] = suporte;
        this.storage.save('dodge_cidades', this.CIDADES);
        this.console.log('[Dodge] ✅ Cidade adicionada: ' + atacada + ' → ' + suporte);

        this._updatePanel();
        this._scanAttacks();
    };
};
