// ══════════════════════════════════════════════════════
//  MODULE: AutoAttack - Dodge Original (Herald SO V49.2)
//  Sistema de Defesa Dodge - EXATAMENTE como no script original
//  Painel integrado na aba "Attack" do MultBot
// ══════════════════════════════════════════════════════

var AutoAttack = class extends MultUtil {
    constructor(c, s) {
        super(c, s);
        this._active = false;

        // ═══ CONFIGURAÇÃO DO DODGE (IGUAL AO ORIGINAL) ═══
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
            MARGEM_SEGURANCA_RETORNO: 0,
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

        // Carregar cidades do storage
        const savedCidades = this.storage.load('dodge_cidades', null);
        if (savedCidades && Object.keys(savedCidades).length > 0) {
            this.CIDADES = savedCidades;
        } else {
            this.storage.save('dodge_cidades', this.CIDADES);
        }

        // ═══ Iniciar Dodge ═══
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
        console.log(`[HERALD] ${icon} [${new Date().toLocaleTimeString()}] ${message}`);
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
    // 🧬 DETETAR TIPO DE ATAQUE
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
    // 🪖 OBTER UNIDADES DA CIDADE
    // ═══════════════════════════════════════════════════════════════════════

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
            this._log(`❌ Erro ao ler unidades: ${e.message}`, 'error');
        }

        return { units: units, total: total };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📤 ENVIAR SUPORTE (USANDO XMLHttpRequest - IGUAL AO ORIGINAL)
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
                this._log(`✅ SUPORTE ${typeLabel} ENVIADO com sucesso!`, 'success');
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
                                        this._log(`📋 Command ID ${typeLabel}: ${commandId}`, 'debug');
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

                    var self = this;
                    this.dodgeState.returnTimers[timerKey2] = setTimeout(function() {
                        self._cancelCommand(commandId, fromTownId, attackType, groupKey);
                        delete self.troopsSent[timerKey2];
                    }, cancelDelay);

                    this._log(`⏱️ ${typeLabel} programado para voltar ${this.CONFIG.MARGEM_SEGURANCA_RETORNO}s APÓS`, 'info');
                } else {
                    this._log(`⚠️ Não foi possível extrair command_id para ${typeLabel}`, 'warning');
                }

                return commandId;
            } else {
                this._log(`❌ Erro ${typeLabel}: ${xhr.responseText}`, 'error');
            }
        } catch(e) {
            this._log(`❌ Erro de rede ${typeLabel}: ${e}`, 'error');
        }

        return null;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🚫 CANCELAR COMANDO
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

        var url = '/game/frontend_bridge?action=execute&h=' + Game.csrfToken;

        var xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.withCredentials = true;
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

        var self = this;
        xhr.onload = function() {
            if (xhr.responseText.indexOf('success') !== -1 || xhr.responseText.indexOf('ok') !== -1) {
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
            } else {
                self._log(`❌ Erro ao cancelar ${typeLabel}: ${xhr.responseText}`, 'error');
            }
        };

        xhr.onerror = function(e) {
            self._log(`❌ Erro de rede ao cancelar ${typeLabel}: ${e}`, 'error');
        };

        xhr.send('json=' + encodeURIComponent(JSON.stringify(payload)));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔍 SCAN DE ATAQUES
    // ═══════════════════════════════════════════════════════════════════════

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
    // ⚡ EXECUTAR DODGE PARA UM GRUPO
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
    // 📋 UPDATE PANEL
    // ═══════════════════════════════════════════════════════════════════════

    _updatePanel() {
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
            html = `
                <div style="text-align:center;color:#7a5c2a;padding:10px;font-size:11px;">
                    <div style="font-size:28px;margin-bottom:6px;opacity:0.5;">🛡️</div>
                    <div>Nenhum ataque detectado</div>
                    <div style="font-size:10px;color:#888;margin-top:4px;">${Object.keys(this.CIDADES).length} cidades protegidas</div>
                </div>
            `;
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

                var firstStr = new Date(data.firstTime * 1000).toLocaleTimeString();
                var lastStr = new Date(data.lastTime * 1000).toLocaleTimeString();
                var returnStr = new Date((data.lastTime + this.CONFIG.MARGEM_SEGURANCA_RETORNO) * 1000).toLocaleTimeString();

                html += '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:8px 12px;margin:3px 0;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;font-size:12px;">';
                html += '<span style="font-weight:600;color:#ddd;">🏙️ ' + data.townId + ' → ' + data.destino + '</span>';
                html += '<span style="font-size:10px;color:#888;">' + typeLabel + '</span>';
                html += badgeHtml;
                html += '<span style="' + timeColor + '">⏱️ ' + timeStr + '</span>';
                html += '<span style="font-size:9px;color:#666;">' + firstStr + ' → ' + lastStr + '</span>';
                html += '<span style="font-size:9px;color:#00b894;">↩️ ' + returnStr + '</span>';
                html += '<span style="font-size:8px;padding:2px 10px;border-radius:10px;text-transform:uppercase;font-weight:700;background:rgba(116,185,255,0.15);color:#74b9ff;">' + statusText + '</span>';
                html += '</div>';
                attackCount++;
            }
        }

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
        this._log('🚀 Herald SO v49.2 - DENTRO DO MULTBOT!', 'info');
        this._log('🏙️ Cidades: ' + Object.keys(this.CIDADES).join(', '), 'info');

        setTimeout(() => this._scanAttacks(), 2000);
        setInterval(() => this._scanAttacks(), this.CONFIG.INTERVALO_REFRESH_ATAQUES * 1000);

        this._log('✅ Sistema ativo!', 'success');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📋 CONFIGURAÇÃO DO PAINEL - APENAS DODGE
    // ═══════════════════════════════════════════════════════════════════════

    settings = () => {
        const self = this;
        requestAnimationFrame(function () {
            self._updatePanel();
        });

        let html = '';
        html += '<div class="game_border" style="margin-bottom:14px;">';
        html += '<div class="game_border_top"></div><div class="game_border_bottom"></div>';
        html += '<div class="game_border_left"></div><div class="game_border_right"></div>';
        html += '<div class="game_border_corner corner1"></div><div class="game_border_corner corner2"></div>';
        html += '<div class="game_border_corner corner3"></div><div class="game_border_corner corner4"></div>';
        html += this.getTitleHtml('attack_title', '🛡️ Dodge', this.toggle, '', this._active);

        html += '<div style="padding:4px 10px;">';

        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin:4px 0;">';
        html += '<span style="font-weight:bold;font-size:11px;">🛡️ Ataques detectados: <span id="dodge_counter" style="color:#888;">0</span></span>';
        html += '<span style="font-size:9px;color:#666;">' + Object.keys(this.CIDADES).length + ' cidades protegidas</span>';
        html += '</div>';

        html += '<div id="dodge_panel_container" style="font-size:11px;max-height:350px;overflow-y:auto;margin:4px 0;"></div>';

        html += '<div style="display:flex;gap:4px;margin:4px 0;flex-wrap:wrap;">';
        html += this.getButtonHtml('dodge_refresh', '🔄 Atualizar', this._dodgeRefresh);
        html += this.getButtonHtml('dodge_clear', '🗑️ Limpar', this._dodgeClear);
        html += this.getButtonHtml('dodge_test', '🧪 Testar', this._dodgeTest);
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

        html += '<div style="font-size:9px;color:#666;margin:4px 0;text-align:center;">';
        html += '⭐ Menos de ' + this.CONFIG.JANELA_GRUPO + 's = GRUPO | ' + this.CONFIG.TEMPO_ANTECEDENCIA + 's ANTES | ' + this.CONFIG.MARGEM_SEGURANCA_RETORNO + 's APÓS';
        html += '</div>';

        html += '</div>';
        html += '</div>';

        return html;
    };

    // ═══ MÉTODOS DO DODGE (UI) ═══

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

    _dodgeAddCidade = () => {
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

    _dodgeRefresh = () => {
        this._scanAttacks();
        this.console.log('[Dodge] 🔄 Scan manual executado');
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
        this._updatePanel();
        this.console.log('[Dodge] ✅ Todos os ataques foram limpos');
    };

    _dodgeTest = () => {
        var towns = Object.keys(this.CIDADES);
        if (towns.length === 0) {
            this.console.log('[Dodge] ⚠️ Nenhuma cidade configurada!');
            return;
        }
        var townId = parseInt(towns[0]);
        var destino = this.CIDADES[townId];
        var now = this._gameNow();

        this._log(`🧪 Simulando ataques para ${townId}...`, 'info');

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
        }

        var cityAttacks = {};
        cityAttacks[townId] = attacks;

        this._log(`🎯 ${attacks.length} ataques simulados!`, 'attack');

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
            var isGroup = group.length > 1;

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

            var dodgeDelay = Math.max(firstTime - now - this.CONFIG.TEMPO_ANTECEDENCIA, 0) * 1000;
            var self = this;
            setTimeout(function(data, key) {
                self._executeDodgeForGroup(data.townId, data.destino, data.firstTime, data.lastTime, data.attacks, key, data.isGroup);
            }, dodgeDelay);
        }

        this._updatePanel();
    };

    // ═══ MÉTODOS VAZIOS ═══

    toggle = () => {};
    start = () => {};
    stop = () => {};
};
