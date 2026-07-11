// ══════════════════════════════════════════════════════
//  MODULE: AutoDodge
//  Detecta ataques chegando e agenda a evacuacao das tropas
//  com AGRUPAMENTO + ATUALIZAÇÃO EM TEMPO REAL
// ══════════════════════════════════════════════════════
var AutoDodge = class extends MultUtil {
    // ═══ CONFIGURAÇÕES DO HERALD SO ═══
    TEMPO_ANTECEDENCIA = 4;
    MARGEM_SEGURANCA_RETORNO = 2;
    DIFERENCA_ENVIO = 0.5;
    JANELA_GRUPO = 10;
    MIN_TROOPS_TO_DODGE = 1;
    MAX_TROOPS_TO_SEND = 1000;
    INTERVALO_REFRESH_ATAQUES = 2;
    SOUND_ALERTS = true;

    // ═══ SUAS CIDADES CONFIGURADAS ═══
    CIDADES = {
        2677: 2470,
        154: 156,
        2195: 2280,
        197: 234,
        2165: 288,
        97: 13,
        2263: 2273,
    };

    constructor(c, s) {
        super(c, s);
        this._active = false;
        this._intervalId = null;
        this._scanIntervalId = null;
        
        // Estados do Herald SO
        this.groupTimers = {};
        this.returnTimers = {};
        this.groupStatus = {};
        this.executedGroups = {};
        this.attackCommands = {};
        this.troopsSent = {};
        this.isScanning = false;
        this.lastScan = 0;

        // Carregar cidades do storage
        const savedCidades = this.storage.load('dodge_cidades', null);
        if (savedCidades && Object.keys(savedCidades).length > 0) {
            this.CIDADES = savedCidades;
        } else {
            this.storage.save('dodge_cidades', this.CIDADES);
        }

        if (this.storage.load('dodge_active', false)) {
            setTimeout(() => { this.start(); }, 2000);
        }
    }

    settings = () => {
        requestAnimationFrame(() => { this._updateTitle(); });
        return (
            '<div class="game_border" style="margin-bottom:20px;">' +
            '<div class="game_border_top"></div><div class="game_border_bottom"></div>' +
            '<div class="game_border_left"></div><div class="game_border_right"></div>' +
            '<div class="game_border_corner corner1"></div><div class="game_border_corner corner2"></div>' +
            '<div class="game_border_corner corner3"></div><div class="game_border_corner corner4"></div>' +
            this.getTitleHtml('dodge_title', 'Dodge Ultimate (Herald SO)', this.toggle, '', this._active) +
            '<div style="padding:5px 10px;font-weight:bold;">' +
            '📦 Ataques com menos de ' + this.JANELA_GRUPO + 's = GRUPO | ' +
            '⭐ Envia ' + this.TEMPO_ANTECEDENCIA + 's ANTES | ' +
            '⭐ Volta ' + this.MARGEM_SEGURANCA_RETORNO + 's APÓS' +
            '</div>' +
            '<div id="dodge_log" style="padding:2px 10px 8px;font-size:11px;color:#5a3a0a;min-height:16px;"></div>' +
            '<div id="dodge_panel_container" style="padding:0 10px 10px;max-height:400px;overflow-y:auto;"></div>' +
            '</div>'
        );
    };

    toggle = () => {
        if (this._active) { this.stop(); } 
        else { this.start(); }
    };

    start() {
        if (this._active) return;
        this._active = true;
        this.storage.save('dodge_active', true);
        this._updateTitle();
        this.console.log('[AutoDodge] Iniciado. Monitorando ataques...');
        
        this._scanAttacks();
        this._intervalId = this.createGuardedInterval(() => this._scanAttacks(), this.INTERVALO_REFRESH_ATAQUES * 1000);
        this._scanIntervalId = setInterval(() => this._updatePanel(), 1000);
    }

    stop() {
        this._active = false;
        this.storage.save('dodge_active', false);

        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
        if (this._scanIntervalId) {
            clearInterval(this._scanIntervalId);
            this._scanIntervalId = null;
        }

        for (const key in this.groupTimers) {
            clearTimeout(this.groupTimers[key]);
        }
        for (const key in this.returnTimers) {
            clearTimeout(this.returnTimers[key]);
        }

        this.groupTimers = {};
        this.returnTimers = {};
        this.groupStatus = {};
        this.executedGroups = {};
        this.troopsSent = {};
        this.attackCommands = {};

        this._updateTitle();
        this.console.log('[AutoDodge] Parado.');
    }

    _updateTitle() {
        const filter = this._active ? 'brightness(100%) saturate(186%) hue-rotate(241deg)' : '';
        uw.$('#dodge_title').css('filter', filter);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔍 SCAN DE ATAQUES (HERALD SO)
    // ═══════════════════════════════════════════════════════════════════════

    _gameNow() {
        try {
            if (uw.Timestamp && typeof uw.Timestamp.server === 'function') {
                return uw.Timestamp.server();
            }
            return Math.floor(Date.now() / 1000);
        } catch(e) { 
            return Math.floor(Date.now() / 1000); 
        }
    }

    _getMM() {
        try { return uw.MM; } catch(e) { return null; }
    }

    _getGame() {
        try { return uw.Game; } catch(e) { return null; }
    }

    _getITowns() {
        try { return uw.ITowns; } catch(e) { return null; }
    }

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

    _getUnitsFromTown(townId, attackType) {
        var units = {};
        var total = 0;
        const UNIDADES_NAVAIS = ['bireme', 'trireme', 'attack_ship', 'demolition_ship', 'colonize_ship', 'small_transporter', 'big_transporter'];
        const UNIDADES_TERRESTRES = ['sword', 'archer', 'hoplite', 'slinger', 'rider', 'chariot', 'catapult', 'militia'];
        const MM = this._getMM();

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
        } catch(e) {
            this.console.log('[AutoDodge] Erro ao ler unidades: ' + e.message);
        }

        return { units: units, total: total };
    }

    _scanAttacks() {
        var now = Date.now();
        if (this.isScanning || (now - this.lastScan < 200)) return;
        this.isScanning = true;
        this.lastScan = now;

        try {
            var MM = this._getMM();
            if (!MM) { this.isScanning = false; return; }
            var mu = MM.getModels && MM.getModels().MovementsUnits;
            if (!mu) { this.isScanning = false; return; }

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
                if (!destino) {
                    this.console.log('[AutoDodge] Cidade ' + townId + ' sem destino configurado!');
                    continue;
                }

                var groups = [];
                var currentGroup = [attacks[0]];

                for (var i = 1; i < attacks.length; i++) {
                    var gap = attacks[i].arrival - attacks[i-1].arrival;
                    if (gap <= this.JANELA_GRUPO) {
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

                    if (this.executedGroups[groupKey]) {
                        continue;
                    }

                    var isGroup = group.length > 1;
                    var timeToFirst = firstTime - nowTime;

                    if (timeToFirst > 60) continue;

                    var existingGroupKey = null;
                    for (var existingKey in this.groupStatus) {
                        if (this.groupStatus.hasOwnProperty(existingKey)) {
                            var data = this.groupStatus[existingKey];
                            if (data && data.townId == townId && !data.dodged) {
                                if (Math.abs(data.lastTime - lastTime) <= this.JANELA_GRUPO) {
                                    existingGroupKey = existingKey;
                                    break;
                                }
                            }
                        }
                    }

                    if (existingGroupKey) {
                        var existingData = this.groupStatus[existingGroupKey];
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

                        if (this.groupTimers[existingGroupKey]) {
                            clearTimeout(this.groupTimers[existingGroupKey]);
                        }

                        var newDodgeDelay = Math.max(existingData.firstTime - nowTime - this.TEMPO_ANTECEDENCIA, 0) * 1000;
                        this.groupTimers[existingGroupKey] = setTimeout(function() {
                            this._executeDodgeForGroup(existingData.townId, existingData.destino, existingData.firstTime, existingData.lastTime, existingData.attacks, existingGroupKey, existingData.isGroup);
                        }.bind(this), newDodgeDelay);

                        continue;
                    }

                    this.groupStatus[groupKey] = {
                        townId: townId,
                        destino: destino,
                        firstTime: firstTime,
                        lastTime: lastTime,
                        attacks: group,
                        isGroup: isGroup,
                        status: 'waiting',
                        dodged: false
                    };

                    var dodgeDelay = Math.max(firstTime - nowTime - this.TEMPO_ANTECEDENCIA, 0) * 1000;

                    if (this.groupTimers[groupKey]) {
                        clearTimeout(this.groupTimers[groupKey]);
                    }

                    this.groupTimers[groupKey] = setTimeout(function() {
                        this._executeDodgeForGroup(townId, destino, firstTime, lastTime, group, groupKey, isGroup);
                    }.bind(this), dodgeDelay);
                }
            }

            this._updatePanel();

        } catch(e) {
            this.console.log('[AutoDodge] Erro no scan: ' + e.message);
        }

        this.isScanning = false;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ⚡ EXECUTAR DODGE PARA UM GRUPO (HERALD SO)
    // ═══════════════════════════════════════════════════════════════════════

    _executeDodgeForGroup(townId, destino, firstTime, lastTime, attacks, groupKey, isGroup) {
        try {
            if (this.executedGroups[groupKey]) {
                return;
            }

            var troops = this._getUnitsFromTown(townId, 'mixed');
            if (troops.total < this.MIN_TROOPS_TO_DODGE) {
                this.console.log('[AutoDodge] Tropas insuficientes em ' + townId + ': ' + troops.total);
                if (this.groupStatus[groupKey]) {
                    this.groupStatus[groupKey].status = 'failed';
                }
                this._updatePanel();
                return;
            }

            var typeLabel = isGroup ? 'GRUPO' : 'INDIVIDUAL';
            this.console.log('[AutoDodge] EXECUTANDO DODGE ' + typeLabel + ' para ' + townId + ' (' + attacks.length + ' ataques)');
            this.console.log('[AutoDodge] Enviar ' + this.TEMPO_ANTECEDENCIA + 's ANTES | Voltar ' + this.MARGEM_SEGURANCA_RETORNO + 's APÓS');

            this.executedGroups[groupKey] = true;

            // ENVIAR TERRESTRES
            this._sendSupportForGroup(townId, destino, firstTime, lastTime, groupKey, 'ground');

            // ENVIAR NAVAIS
            setTimeout(function() {
                this._sendSupportForGroup(townId, destino, firstTime, lastTime, groupKey, 'naval');
            }.bind(this), this.DIFERENCA_ENVIO * 1000);

            if (this.groupStatus[groupKey]) {
                this.groupStatus[groupKey].dodged = true;
                this.groupStatus[groupKey].status = 'dodged';
            }

            this.console.log('[AutoDodge] Dodge executado para ' + groupKey + '!');

        } catch(e) {
            this.console.log('[AutoDodge] Erro ao executar dodge: ' + e.message);
            if (this.groupStatus[groupKey]) {
                this.groupStatus[groupKey].status = 'failed';
            }
        }
        this._updatePanel();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📤 ENVIAR SUPORTE (HERALD SO)
    // ═══════════════════════════════════════════════════════════════════════

    _sendSupportForGroup(fromTownId, targetTownId, firstTime, lastTime, groupKey, attackType) {
        var timerKey = groupKey + '_' + attackType;

        if (this.troopsSent[timerKey]) {
            return;
        }

        var typeLabel = attackType === 'naval' ? 'NAVAL' : attackType === 'ground' ? 'TERRESTRE' : 'MISTO';
        var Game = this._getGame();

        if (!Game || !Game.csrfToken) {
            this.console.log('[AutoDodge] Game não disponível para ' + typeLabel);
            return;
        }

        var result = this._getUnitsFromTown(fromTownId, attackType);
        if (result.total === 0) {
            this.console.log('[AutoDodge] Nenhuma unidade ' + typeLabel + ' disponível em ' + fromTownId);
            return;
        }

        var limitedUnits = {};
        var limitedTotal = 0;
        for (var u in result.units) {
            if (result.units.hasOwnProperty(u) && result.units[u] > 0) {
                var amount = Math.min(result.units[u], this.MAX_TROOPS_TO_SEND);
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
                this.console.log('[AutoDodge] SUPORTE ' + typeLabel + ' ENVIADO!');
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

                    var cancelDelay = (lastTime - this._gameNow() + this.MARGEM_SEGURANCA_RETORNO) * 1000;
                    cancelDelay = Math.max(cancelDelay, 1000);

                    var timerKey2 = groupKey + '_' + attackType;
                    if (this.returnTimers[timerKey2]) {
                        clearTimeout(this.returnTimers[timerKey2]);
                    }

                    this.returnTimers[timerKey2] = setTimeout(function() {
                        this._cancelCommand(commandId, fromTownId, attackType, groupKey);
                        delete this.troopsSent[timerKey2];
                    }.bind(this), cancelDelay);

                    this.console.log('[AutoDodge] ' + typeLabel + ' programado para voltar ' + this.MARGEM_SEGURANCA_RETORNO + 's APÓS');
                }

                return commandId;
            }
        } catch(e) {
            this.console.log('[AutoDodge] Erro de rede ' + typeLabel + ': ' + e);
        }

        return null;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🚫 CANCELAR COMANDO (HERALD SO)
    // ═══════════════════════════════════════════════════════════════════════

    _cancelCommand(commandId, townId, attackType, groupKey) {
        var typeLabel = attackType === 'naval' ? 'NAVAL' : attackType === 'ground' ? 'TERRESTRE' : 'MISTO';
        this.console.log('[AutoDodge] CANCELANDO ' + typeLabel + ' comando #' + commandId);

        var Game = this._getGame();
        if (!Game || !Game.csrfToken) {
            this.console.log('[AutoDodge] Game não disponível para ' + typeLabel);
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

        xhr.onload = function() {
            if (xhr.responseText.indexOf('success') !== -1 || xhr.responseText.indexOf('ok') !== -1) {
                this.console.log('[AutoDodge] TROPAS ' + typeLabel + ' VOLTARAM!');

                var timerKey = groupKey + '_' + attackType;
                if (this.returnTimers[timerKey]) {
                    clearTimeout(this.returnTimers[timerKey]);
                    delete this.returnTimers[timerKey];
                }

                if (this.groupStatus[groupKey]) {
                    this.groupStatus[groupKey].status = 'cancelled';
                }
                this._updatePanel();
            }
        }.bind(this);

        xhr.onerror = function(e) {
            this.console.log('[AutoDodge] Erro de rede ao cancelar ' + typeLabel + ': ' + e);
        }.bind(this);

        xhr.send('json=' + encodeURIComponent(JSON.stringify(payload)));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📋 UPDATE PANEL (HERALD SO)
    // ═══════════════════════════════════════════════════════════════════════

    _updatePanel() {
        var container = document.getElementById('dodge_panel_container');
        if (!container) return;

        var now = this._gameNow();
        var attackCount = 0;
        var html = '';

        var groups = [];
        for (var key in this.groupStatus) {
            if (this.groupStatus.hasOwnProperty(key)) {
                var data = this.groupStatus[key];
                if (data && data.lastTime > now - 10) {
                    groups.push(data);
                }
            }
        }

        if (groups.length === 0) {
            html = `
                <div style="text-align:center;padding:20px;color:#666;">
                    <div style="font-size:28px;">🛡️</div>
                    <div>Nenhum ataque detectado</div>
                    <div style="font-size:10px;color:#555;margin-top:4px;">${Object.keys(this.CIDADES).length} cidades protegidas</div>
                </div>
            `;
        } else {
            groups.sort(function(a, b) { return a.firstTime - b.firstTime; });

            for (var i = 0; i < groups.length; i++) {
                var data = groups[i];
                var statusColor = data.dodged ? '#00b894' : (data.status === 'failed' ? '#ff6b6b' : '#fdcb6e');
                var statusText = data.status === 'waiting' ? '⏳ Aguardando' : 
                                 data.status === 'dodged' ? '🌀 Desviado' : 
                                 data.status === 'cancelled' ? '✅ Voltou' : '❌ Falhou';

                var timeLeft = Math.round(data.firstTime - now);
                var timeStr = timeLeft > 0 ? (timeLeft > 60 ? Math.round(timeLeft / 60) + 'm ' + (timeLeft % 60) + 's' : timeLeft + 's') : '💥';

                var timeColor = '';
                if (timeLeft < 5 && timeLeft > 0) timeColor = '#ff6b6b';
                else if (timeLeft < 15 && timeLeft > 0) timeColor = '#fdcb6e';
                else if (timeLeft > 0) timeColor = '#00b894';

                var firstStr = new Date(data.firstTime * 1000).toLocaleTimeString();
                var lastStr = new Date(data.lastTime * 1000).toLocaleTimeString();
                var returnStr = new Date((data.lastTime + this.MARGEM_SEGURANCA_RETORNO) * 1000).toLocaleTimeString();

                html += `
                    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:6px 10px;margin:3px 0;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;font-size:11px;${data.dodged ? 'border-color:rgba(0,184,148,0.3);background:rgba(0,184,148,0.05);' : ''}${data.status === 'failed' ? 'border-color:rgba(255,107,107,0.3);background:rgba(255,107,107,0.05);' : ''}">
                        <span style="font-weight:600;color:#ddd;">🏙️ ${data.townId} → ${data.destino}</span>
                        <span style="font-size:10px;color:#888;">${data.isGroup ? '📦 GRUPO' : '🎯 INDIVIDUAL'}</span>
                        ${data.isGroup ? `<span style="font-size:8px;padding:2px 8px;border-radius:10px;background:#fdcb6e;color:#000;font-weight:700;">${data.attacks.length} ataques</span>` : ''}
                        <span style="font-size:11px;color:${timeColor};">⏱️ ${timeStr}</span>
                        <span style="font-size:9px;color:#666;">${firstStr} → ${lastStr}</span>
                        <span style="font-size:9px;color:#00b894;">↩️ ${returnStr}</span>
                        <span style="font-size:8px;padding:2px 10px;border-radius:10px;text-transform:uppercase;font-weight:700;background:rgba(255,255,255,0.05);color:${statusColor};">${statusText}</span>
                    </div>
                `;
                attackCount++;
            }
        }

        container.innerHTML = html;

        // Atualizar título do módulo
        var title = document.querySelector('#dodge_title .title');
        if (title) {
            title.textContent = '🛡️ Dodge Ultimate [' + attackCount + ']';
        }

        // Atualizar log
        var log = document.getElementById('dodge_log');
        if (log && attackCount > 0) {
            log.textContent = '⚔️ ' + attackCount + ' ataque(s) detectado(s)';
            log.style.color = '#ff6b6b';
        } else if (log) {
            log.textContent = '✅ Nenhum ataque';
            log.style.color = '#5a3a0a';
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🚀 EXPORTAR FUNÇÕES PARA CONSOLE
    // ═══════════════════════════════════════════════════════════════════════

    getStatus() {
        var total = 0;
        for (var key in this.groupStatus) {
            if (this.groupStatus.hasOwnProperty(key)) {
                var data = this.groupStatus[key];
                if (data && !data.dodged && data.lastTime > this._gameNow()) {
                    total++;
                }
            }
        }
        return { groups: total, cidades: Object.keys(this.CIDADES).length };
    }

    addCidade(atacada, destino) {
        this.CIDADES[atacada] = destino;
        this.storage.save('dodge_cidades', this.CIDADES);
        this.console.log('[AutoDodge] Cidade adicionada: ' + atacada + ' → ' + destino);
        this._updatePanel();
    }

    removeCidade(atacada) {
        if (this.CIDADES[atacada] !== undefined) {
            delete this.CIDADES[atacada];
            this.storage.save('dodge_cidades', this.CIDADES);
            this.console.log('[AutoDodge] Cidade removida: ' + atacada);
            this._updatePanel();
        }
    }

    listCidades() {
        var list = [];
        for (var key in this.CIDADES) {
            if (this.CIDADES.hasOwnProperty(key)) {
                list.push(key + ' → ' + this.CIDADES[key]);
            }
        }
        return list;
    }
};

// ═══════════════════════════════════════════════════════════════════════
// 🌐 EXPORTAR PARA CONSOLE
// ═══════════════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
    window.AutoDodge = AutoDodge;
    window.autoDodge = null;
}
