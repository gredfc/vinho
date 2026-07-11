// ══════════════════════════════════════════════════════
//  MODULE: AutoDodge - Dodge Ultimate V49.2
//  Substitui o módulo "Auto Attack" na aba Ataque
// ══════════════════════════════════════════════════════

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════
    // ⚙️ CONFIGURAÇÃO
    // ═══════════════════════════════════════════════════════════════════════
    var CIDADES = {
        2677: 2470,
        154: 156,
        2195: 2280,
        197: 234,
        2165: 288,
        97: 13,
        2263: 2273,
    };

    var CONFIG = {
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

    // ═══════════════════════════════════════════════════════════════════════
    // 🧬 DETETAR TIPO DE ATAQUE
    // ═══════════════════════════════════════════════════════════════════════

    var UNIDADES_NAVAIS = ['bireme', 'trireme', 'attack_ship', 'demolition_ship', 'colonize_ship', 'small_transporter', 'big_transporter'];
    var UNIDADES_TERRESTRES = ['sword', 'archer', 'hoplite', 'slinger', 'rider', 'chariot', 'catapult', 'militia'];

    function _detectAttackType(attrs) {
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

    function _getUnitsFromTown(townId, attackType) {
        var units = {};
        var total = 0;

        try {
            var town = uw.ITowns.towns[townId];
            if (!town) return { units: units, total: 0 };

            var allUnits = town.units ? town.units() : {};
            if (!allUnits) return { units: units, total: 0 };

            for (var u in allUnits) {
                if (allUnits.hasOwnProperty(u) && allUnits[u] > 0) {
                    var isNaval = UNIDADES_NAVAIS.indexOf(u) !== -1;
                    var isGround = UNIDADES_TERRESTRES.indexOf(u) !== -1;

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
        } catch(e) {
            console.log('[AutoDodge] ❌ Erro ao ler unidades: ' + e.message);
        }

        return { units: units, total: total };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📤 ENVIAR SUPORTE
    // ═══════════════════════════════════════════════════════════════════════

    var attackCommands = {};
    var troopsSent = {};
    var returnTimers = {};
    var groupStatus = {};
    var executedGroups = {};

    function _gameNow() {
        try {
            if (typeof uw !== 'undefined' && uw.Timestamp && uw.Timestamp.server) {
                return uw.Timestamp.server();
            }
            return Date.now() / 1000;
        } catch(e) { return Date.now() / 1000; }
    }

    function _sendSupportForGroup(fromTownId, targetTownId, firstTime, lastTime, groupKey, attackType) {
        var timerKey = groupKey + '_' + attackType;

        if (troopsSent[timerKey]) {
            console.log('[AutoDodge] ⏳ Tropas ' + attackType + ' já enviadas');
            return;
        }

        var typeLabel = attackType === 'naval' ? '🚢 NAVAL' : attackType === 'ground' ? '⚔️ TERRESTRE' : '🔄 MISTO';
        var Game = uw.Game;

        if (!Game || !Game.csrfToken) {
            console.log('[AutoDodge] ❌ Game não disponível para ' + typeLabel);
            return;
        }

        var result = _getUnitsFromTown(fromTownId, attackType);
        if (result.total === 0) {
            console.log('[AutoDodge] ⚠️ Nenhuma unidade ' + typeLabel + ' disponível em ' + fromTownId);
            return;
        }

        var limitedUnits = {};
        var limitedTotal = 0;
        for (var u in result.units) {
            if (result.units.hasOwnProperty(u) && result.units[u] > 0) {
                var amount = Math.min(result.units[u], CONFIG.MAX_TROOPS_TO_SEND);
                limitedUnits[u] = amount;
                limitedTotal += amount;
            }
        }

        var returnTime = Math.max(lastTime - _gameNow() + CONFIG.MARGEM_SEGURANCA_RETORNO, 3);

        console.log('[AutoDodge] 🪖 Enviando ' + limitedTotal + ' ' + typeLabel + ' tropas de ' + fromTownId + ' para ' + targetTownId);
        console.log('[AutoDodge] ⏱️ Voltar ' + CONFIG.MARGEM_SEGURANCA_RETORNO + 's APÓS o último ataque');

        var departTime = Math.ceil(_gameNow()) + 1;
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
                console.log('[AutoDodge] ✅ SUPORTE ' + typeLabel + ' ENVIADO com sucesso!');
                troopsSent[timerKey] = true;

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
                                        console.log('[AutoDodge] 📋 Command ID ' + typeLabel + ': ' + commandId);
                                        break;
                                    }
                                } catch(e) {}
                            }
                        }
                    }
                } catch(e) {}

                if (commandId) {
                    var cmdKey = groupKey + '_' + attackType;
                    attackCommands[cmdKey] = commandId;

                    var cancelDelay = (lastTime - _gameNow() + CONFIG.MARGEM_SEGURANCA_RETORNO) * 1000;
                    cancelDelay = Math.max(cancelDelay, 1000);

                    var timerKey2 = groupKey + '_' + attackType;
                    if (returnTimers[timerKey2]) {
                        clearTimeout(returnTimers[timerKey2]);
                    }

                    returnTimers[timerKey2] = setTimeout(function() {
                        _cancelCommand(commandId, fromTownId, attackType, groupKey);
                        delete troopsSent[timerKey2];
                    }, cancelDelay);

                    console.log('[AutoDodge] ⏱️ ' + typeLabel + ' programado para voltar ' + CONFIG.MARGEM_SEGURANCA_RETORNO + 's APÓS');
                } else {
                    console.log('[AutoDodge] ⚠️ Não foi possível extrair command_id para ' + typeLabel);
                }

                return commandId;
            } else {
                console.log('[AutoDodge] ❌ Erro ' + typeLabel + ': ' + xhr.responseText);
            }
        } catch(e) {
            console.log('[AutoDodge] ❌ Erro de rede ' + typeLabel + ': ' + e);
        }

        return null;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🚫 CANCELAR COMANDO
    // ═══════════════════════════════════════════════════════════════════════

    function _cancelCommand(commandId, townId, attackType, groupKey) {
        var typeLabel = attackType === 'naval' ? '🚢 NAVAL' : attackType === 'ground' ? '⚔️ TERRESTRE' : '🔄 MISTO';
        console.log('[AutoDodge] 🚫 CANCELANDO ' + typeLabel + ' comando #' + commandId);

        var Game = uw.Game;
        if (!Game || !Game.csrfToken) {
            console.log('[AutoDodge] ❌ Game não disponível para ' + typeLabel);
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
                console.log('[AutoDodge] ✅ TROPAS ' + typeLabel + ' VOLTARAM!');

                var timerKey = groupKey + '_' + attackType;
                if (returnTimers[timerKey]) {
                    clearTimeout(returnTimers[timerKey]);
                    delete returnTimers[timerKey];
                }

                if (groupStatus[groupKey]) {
                    groupStatus[groupKey].status = 'cancelled';
                }
                _updatePanel();

            } else {
                console.log('[AutoDodge] ❌ Erro ao cancelar ' + typeLabel + ': ' + xhr.responseText);
            }
        };

        xhr.onerror = function(e) {
            console.log('[AutoDodge] ❌ Erro de rede ao cancelar ' + typeLabel + ': ' + e);
        };

        xhr.send('json=' + encodeURIComponent(JSON.stringify(payload)));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔍 SCAN DE ATAQUES
    // ═══════════════════════════════════════════════════════════════════════

    var isScanning = false;
    var lastScan = 0;
    var groupTimers = {};

    function _scanAttacks() {
        var now = Date.now();
        if (isScanning || (now - lastScan < 200)) return;
        isScanning = true;
        lastScan = now;

        try {
            var nowTime = _gameNow();
            var myTowns = uw.ITowns ? uw.ITowns.towns : {};

            // 1. COLETAR TODOS OS ATAQUES POR CIDADE
            var cityAttacks = {};

            var models = uw.MM.getModels().MovementsUnits;
            if (!models) { isScanning = false; return; }

            for (var key in models) {
                if (!models.hasOwnProperty(key)) continue;
                var attrs = models[key].attributes;
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
                    cmdId: key,
                    arrival: attrs.arrival_at,
                    type: _detectAttackType(attrs)
                });
            }

            // 2. AGRUPAR ATAQUES POR CIDADE
            for (var townId in cityAttacks) {
                if (!cityAttacks.hasOwnProperty(townId)) continue;

                var attacks = cityAttacks[townId];
                if (attacks.length === 0) continue;

                var destino = CIDADES[townId];
                if (!destino) {
                    console.log('[AutoDodge] ⚠️ Cidade ' + townId + ' sem destino configurado!');
                    continue;
                }

                attacks.sort(function(a, b) { return a.arrival - b.arrival; });

                // 3. CRIAR GRUPOS
                var groups = [];
                var currentGroup = [attacks[0]];

                for (var i = 1; i < attacks.length; i++) {
                    var gap = attacks[i].arrival - attacks[i-1].arrival;
                    if (gap <= CONFIG.JANELA_GRUPO) {
                        currentGroup.push(attacks[i]);
                    } else {
                        groups.push(currentGroup);
                        currentGroup = [attacks[i]];
                    }
                }
                groups.push(currentGroup);

                // 4. PROCESSAR CADA GRUPO
                for (var g = 0; g < groups.length; g++) {
                    var group = groups[g];
                    var firstTime = group[0].arrival;
                    var lastTime = group[group.length - 1].arrival;
                    var groupKey = townId + '_group_' + firstTime + '_' + g;

                    if (executedGroups[groupKey]) {
                        continue;
                    }

                    var isGroup = group.length > 1;
                    var timeToFirst = firstTime - nowTime;

                    if (timeToFirst > 60) {
                        continue;
                    }

                    // ⭐ VERIFICAR SE JÁ EXISTE UM GRUPO PARA ESTA CIDADE
                    var existingGroupKey = null;
                    for (var existingKey in groupStatus) {
                        if (groupStatus.hasOwnProperty(existingKey)) {
                            var data = groupStatus[existingKey];
                            if (data && data.townId == townId && !data.dodged) {
                                if (Math.abs(data.lastTime - lastTime) <= CONFIG.JANELA_GRUPO) {
                                    existingGroupKey = existingKey;
                                    break;
                                }
                            }
                        }
                    }

                    if (existingGroupKey) {
                        // ATUALIZAR GRUPO EXISTENTE
                        var existingData = groupStatus[existingGroupKey];
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

                        console.log('[AutoDodge] 📦 GRUPO ATUALIZADO para ' + townId + ': ' + existingData.attacks.length + ' ataques');

                        if (groupTimers[existingGroupKey]) {
                            clearTimeout(groupTimers[existingGroupKey]);
                        }

                        var newDodgeDelay = Math.max(existingData.firstTime - nowTime - CONFIG.TEMPO_ANTECEDENCIA, 0) * 1000;
                        groupTimers[existingGroupKey] = setTimeout(function() {
                            _executeDodgeForGroup(existingData.townId, existingData.destino, existingData.firstTime, existingData.lastTime, existingData.attacks, existingGroupKey, existingData.isGroup);
                        }, newDodgeDelay);

                        continue;
                    }

                    // 5. CRIAR NOVO GRUPO
                    groupStatus[groupKey] = {
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
                    console.log('[AutoDodge] ' + typeLabel + ' para ' + townId + ' (' + group.length + ' ataques)');

                    // 6. AGENDAR DODGE
                    var dodgeDelay = Math.max(firstTime - nowTime - CONFIG.TEMPO_ANTECEDENCIA, 0) * 1000;

                    if (groupTimers[groupKey]) {
                        clearTimeout(groupTimers[groupKey]);
                    }

                    groupTimers[groupKey] = setTimeout(function() {
                        _executeDodgeForGroup(townId, destino, firstTime, lastTime, group, groupKey, isGroup);
                    }, dodgeDelay);
                }
            }

            _updatePanel();

        } catch(e) {
            console.log('[AutoDodge] ⚠️ Erro no scan: ' + e.message);
        }

        isScanning = false;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ⚡ EXECUTAR DODGE PARA UM GRUPO
    // ═══════════════════════════════════════════════════════════════════════

    function _executeDodgeForGroup(townId, destino, firstTime, lastTime, attacks, groupKey, isGroup) {
        try {
            if (executedGroups[groupKey]) {
                return;
            }

            var troops = _getUnitsFromTown(townId, 'mixed');
            if (troops.total < CONFIG.MIN_TROOPS_TO_DODGE) {
                console.log('[AutoDodge] ⚠️ Tropas insuficientes em ' + townId + ': ' + troops.total);
                if (groupStatus[groupKey]) {
                    groupStatus[groupKey].status = 'failed';
                }
                _updatePanel();
                return;
            }

            var typeLabel = isGroup ? '📦 GRUPO' : '🎯 INDIVIDUAL';
            var numAttacks = attacks.length;
            console.log('[AutoDodge] ⚡ EXECUTANDO DODGE ' + typeLabel + ' para ' + townId + ' (' + numAttacks + ' ataques)');

            executedGroups[groupKey] = true;

            // ENVIAR TERRESTRES
            _sendSupportForGroup(townId, destino, firstTime, lastTime, groupKey, 'ground');

            // ENVIAR NAVAIS
            setTimeout(function() {
                _sendSupportForGroup(townId, destino, firstTime, lastTime, groupKey, 'naval');
            }, CONFIG.DIFERENCA_ENVIO * 1000);

            if (groupStatus[groupKey]) {
                groupStatus[groupKey].dodged = true;
                groupStatus[groupKey].status = 'dodged';
            }

            console.log('[AutoDodge] ✅ Dodge executado para ' + groupKey + '!');
            _updatePanel();

        } catch(e) {
            console.log('[AutoDodge] ❌ Erro ao executar dodge: ' + e.message);
            if (groupStatus[groupKey]) {
                groupStatus[groupKey].status = 'failed';
            }
            _updatePanel();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📋 UPDATE PANEL
    // ═══════════════════════════════════════════════════════════════════════

    function _updatePanel() {
        try {
            var logDiv = document.getElementById('dodge_log');
            if (!logDiv) return;

            var now = _gameNow();
            var attackCount = 0;
            var html = '';

            var groups = [];
            for (var key in groupStatus) {
                if (groupStatus.hasOwnProperty(key)) {
                    var data = groupStatus[key];
                    if (data && data.lastTime > now - 10) {
                        groups.push(data);
                    }
                }
            }

            if (groups.length === 0) {
                html = '<div style="color:#666;padding:5px 0;">🛡️ Nenhum ataque detectado</div>';
            } else {
                groups.sort(function(a, b) { return a.firstTime - b.firstTime; });

                for (var i = 0; i < groups.length; i++) {
                    var data = groups[i];
                    var timeLeft = Math.round(data.firstTime - now);
                    var timeStr = timeLeft > 0 ? (timeLeft > 60 ? Math.round(timeLeft / 60) + 'm ' + (timeLeft % 60) + 's' : timeLeft + 's') : '💥';

                    var statusMap = {
                        'waiting': '⏳',
                        'dodged': '🌀',
                        'cancelled': '✅',
                        'failed': '❌'
                    };
                    var statusIcon = statusMap[data.status] || '⏳';
                    var typeLabel = data.isGroup ? '📦' : '🎯';
                    var count = data.attacks ? data.attacks.length : 1;

                    html += '<div style="padding:3px 0;border-bottom:1px solid #333;font-size:11px;">';
                    html += typeLabel + ' 🏙️ ' + data.townId + ' → ' + data.destino;
                    html += ' ⏱️ ' + timeStr;
                    html += ' ' + statusIcon;
                    if (data.isGroup) {
                        html += ' (' + count + ' ataques)';
                    }
                    html += '</div>';
                    attackCount++;
                }
            }

            logDiv.innerHTML = html;

            // Atualizar título
            var titleDiv = document.getElementById('dodge_title');
            if (titleDiv) {
                var statusText = attackCount > 0 ? '🔴 ' + attackCount + ' grupo(s)' : '🟢 Nenhum ataque';
                titleDiv.textContent = 'Auto Fuga (Dodge V49.2) - ' + statusText;
            }

        } catch(e) {
            // Silencioso
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🎯 MÓDULO AUTODODGE PARA MULTOBOT
    // ═══════════════════════════════════════════════════════════════════════

    var AutoDodge = {
        _active: false,
        _intervalId: null,

        settings: function() {
            var isActive = this._active;
            var statusColor = isActive ? '#1a6b2a' : '#888';
            var statusText = isActive ? '🔴 ATIVO' : '⏸️ INATIVO';

            return (
                '<div class="game_border" style="margin-bottom:20px;">' +
                '<div class="game_border_top"></div><div class="game_border_bottom"></div>' +
                '<div class="game_border_left"></div><div class="game_border_right"></div>' +
                '<div class="game_border_corner corner1"></div><div class="game_border_corner corner2"></div>' +
                '<div class="game_border_corner corner3"></div><div class="game_border_corner corner4"></div>' +
                '<div style="padding:8px 12px;background:#1a1a2e;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center;">' +
                '<span id="dodge_title" style="font-weight:bold;font-size:14px;color:#a29bfe;">Auto Fuga (Dodge V49.2) - <span style="color:' + statusColor + ';">' + statusText + '</span></span>' +
                '<button onclick="window._toggleDodge()" style="padding:4px 16px;border-radius:6px;border:none;cursor:pointer;background:' + (isActive ? '#ff6b6b' : '#00b894') + ';color:#fff;font-weight:bold;">' + (isActive ? 'PARAR' : 'INICIAR') + '</button>' +
                '</div>' +
                '<div style="padding:8px 12px;font-size:11px;background:#0f0f1a;border-bottom:1px solid #333;">' +
                '📦 Ataques com menos de ' + CONFIG.JANELA_GRUPO + 's = GRUPO | ' +
                '⭐ Envia ' + CONFIG.TEMPO_ANTECEDENCIA + 's ANTES | ' +
                '⭐ Volta ' + CONFIG.MARGEM_SEGURANCA_RETORNO + 's APÓS<br>' +
                '🏙️ ' + Object.keys(CIDADES).length + ' cidades protegidas' +
                '</div>' +
                '<div id="dodge_log" style="padding:8px 12px;min-height:60px;max-height:300px;overflow-y:auto;font-size:11px;color:#ddd;background:#0a0a15;">' +
                '🛡️ Nenhum ataque detectado' +
                '</div>' +
                '<div style="padding:4px 12px;font-size:9px;color:#555;background:#0f0f1a;border-top:1px solid #333;text-align:center;">' +
                'Dodge Ultimate V49.2 - Agrupamento + Recall Automático' +
                '</div>' +
                '</div>'
            );
        },

        start: function() {
            if (this._active) return;
            this._active = true;
            console.log('[AutoDodge] 🚀 Iniciado! Monitorando ataques...');
            this._scanAttacks();
            this._intervalId = setInterval(function() { _scanAttacks(); }, CONFIG.INTERVALO_REFRESH_ATAQUES * 1000);
            _updatePanel();
        },

        stop: function() {
            this._active = false;
            if (this._intervalId) {
                clearInterval(this._intervalId);
                this._intervalId = null;
            }

            // Limpar timers
            for (var key in groupTimers) {
                clearTimeout(groupTimers[key]);
            }
            for (var key in returnTimers) {
                clearTimeout(returnTimers[key]);
            }

            groupTimers = {};
            returnTimers = {};
            groupStatus = {};
            executedGroups = {};
            troopsSent = {};
            attackCommands = {};

            console.log('[AutoDodge] ⏹️ Parado.');
            _updatePanel();
        },

        _scanAttacks: function() {
            _scanAttacks();
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // 🔄 FUNÇÕES GLOBAIS PARA O BOTÃO
    // ═══════════════════════════════════════════════════════════════════════

    window._toggleDodge = function() {
        if (AutoDodge._active) {
            AutoDodge.stop();
        } else {
            AutoDodge.start();
        }
        // Recarregar settings para atualizar o botão
        if (window.MultBot && window.MultBot.loadModule) {
            window.MultBot.loadModule('AutoDodge');
        }
    };

    window._scanAttacks = function() {
        _scanAttacks();
    };

    // ═══════════════════════════════════════════════════════════════════════
    // 📦 REGISTRAR MÓDULO NO MULTBOT
    // ═══════════════════════════════════════════════════════════════════════

    // Esperar o MultBot carregar
    var checkMultBot = setInterval(function() {
        try {
            if (typeof window.MultBot !== 'undefined' && window.MultBot.registerModule) {
                clearInterval(checkMultBot);

                // Registrar módulo na aba Ataque
                window.MultBot.registerModule('AutoDodge', {
                    name: 'AutoDodge',
                    category: 'ataque',
                    order: 1,
                    settings: function() {
                        return AutoDodge.settings();
                    }
                });

                console.log('[AutoDodge] ✅ Módulo registrado na aba Ataque!');

                // Iniciar se estava ativo
                if (AutoDodge._active) {
                    AutoDodge.start();
                }

                // Carregar módulo
                if (window.MultBot.loadModule) {
                    window.MultBot.loadModule('AutoDodge');
                }
            }
        } catch(e) {
            // Silencioso
        }
    }, 500);

    // ═══════════════════════════════════════════════════════════════════════
    // 🚀 INICIALIZAÇÃO
    // ═══════════════════════════════════════════════════════════════════════

    console.log('[AutoDodge] 🛡️ Dodge Ultimate V49.2');
    console.log('[AutoDodge] 📦 Ataques com menos de ' + CONFIG.JANELA_GRUPO + 's = GRUPO');
    console.log('[AutoDodge] 🏙️ ' + Object.keys(CIDADES).length + ' cidades protegidas');
    console.log('[AutoDodge] ✅ Aguardando MultBot...');

})();
