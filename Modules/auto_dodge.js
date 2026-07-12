// ══════════════════════════════════════════════════════
//  MODULE: AutoDodge - Dodge Ultimate V49.3 (CORRIGIDO)
//  Painel dentro da aba Ataque do MultBot
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
        TEMPO_ANTECEDENCIA: 5,
        INTERVALO_REFRESH_ATAQUES: 2,
        MARGEM_SEGURANCA_RETORNO: 2,
        DIFERENCA_ENVIO: 0.5,
        JANELA_GRUPO: 10,
        MIN_TROOPS_TO_DODGE: 1,
        MAX_TROOPS_TO_SEND: 4000,
        SOUND_ALERTS: true,
        DEBUG: true,
        AUTO_DODGE: true,
    };

    // ═══════════════════════════════════════════════════════════════════════
    // 🛠️ FUNÇÕES AUXILIARES
    // ═══════════════════════════════════════════════════════════════════════

    function _gameNow() {
        try {
            if (typeof unsafeWindow !== 'undefined' && unsafeWindow.Timestamp && unsafeWindow.Timestamp.server) {
                return unsafeWindow.Timestamp.server();
            }
            return Date.now() / 1000;
        } catch(e) { return Date.now() / 1000; }
    }

    function _getGame() {
        try {
            if (typeof unsafeWindow !== 'undefined' && unsafeWindow.Game) return unsafeWindow.Game;
            if (typeof window !== 'undefined' && window.Game) return window.Game;
        } catch(e) {}
        return null;
    }

    function _getMM() {
        try {
            if (typeof unsafeWindow !== 'undefined' && unsafeWindow.MM) return unsafeWindow.MM;
            if (typeof window !== 'undefined' && window.MM) return window.MM;
        } catch(e) {}
        return null;
    }

    function _getITowns() {
        try {
            if (typeof unsafeWindow !== 'undefined' && unsafeWindow.ITowns) return unsafeWindow.ITowns;
            if (typeof window !== 'undefined' && window.ITowns) return window.ITowns;
        } catch(e) {}
        return null;
    }

    function _log(message, type = 'info') {
        if (!CONFIG.DEBUG && type === 'debug') return;
        const icons = { info: '📘', success: '✅', warning: '⚠️', error: '❌', debug: '🔍', attack: '⚔️', dodge: '🛡️', naval: '🚢', ground: '⚔️', group: '📦' };
        const icon = icons[type] || '📘';
        console.log(`[DODGE] ${icon} [${new Date().toLocaleTimeString()}] ${message}`);
    }

    function _playSound(type = 'warning') {
        if (!CONFIG.SOUND_ALERTS) return;
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
        var MM = _getMM();

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
            _log(`❌ Erro ao ler unidades: ${e.message}`, 'error');
        }

        return { units: units, total: total };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📤 ENVIAR SUPORTE
    // ═══════════════════════════════════════════════════════════════════════

    var attackCommands = {};
    var troopsSent = {};
    var processedAttacks = {}; // ⭐ NOVO: guarda ataques já processados

    function _sendSupportForGroup(fromTownId, targetTownId, firstTime, lastTime, groupKey, attackType) {
        var timerKey = groupKey + '_' + attackType;

        if (troopsSent[timerKey]) {
            _log(`⏳ Tropas ${attackType} já enviadas para este grupo`, 'info');
            return;
        }

        var typeLabel = attackType === 'naval' ? '🚢 NAVAL' : attackType === 'ground' ? '⚔️ TERRESTRE' : '🔄 MISTO';
        var Game = _getGame();

        if (!Game || !Game.csrfToken) {
            _log(`❌ Game não disponível para ${typeLabel}`, 'error');
            return;
        }

        var result = _getUnitsFromTown(fromTownId, attackType);
        if (result.total === 0) {
            _log(`⚠️ Nenhuma unidade ${typeLabel} disponível em ${fromTownId}`, 'warning');
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

        _log(`🪖 Enviando ${limitedTotal} ${typeLabel} tropas de ${fromTownId} para ${targetTownId}`, 'info');

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
                _log(`✅ SUPORTE ${typeLabel} ENVIADO com sucesso!`, 'success');
                _playSound('success');

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
                                        _log(`📋 Command ID ${typeLabel}: ${commandId}`, 'debug');
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
                    if (dodgeState.returnTimers[timerKey2]) {
                        clearTimeout(dodgeState.returnTimers[timerKey2]);
                    }

                    dodgeState.returnTimers[timerKey2] = setTimeout(function() {
                        _cancelCommand(commandId, fromTownId, attackType, groupKey);
                        delete troopsSent[timerKey2];
                    }, cancelDelay);

                    _log(`⏱️ ${typeLabel} programado para voltar ${CONFIG.MARGEM_SEGURANCA_RETORNO}s APÓS`, 'info');

                } else {
                    _log(`⚠️ Não foi possível extrair command_id para ${typeLabel}`, 'warning');
                }

                return commandId;

            } else {
                _log(`❌ Erro ${typeLabel}: ${xhr.responseText}`, 'error');
            }
        } catch(e) {
            _log(`❌ Erro de rede ${typeLabel}: ${e}`, 'error');
        }

        return null;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🚫 CANCELAR COMANDO
    // ═══════════════════════════════════════════════════════════════════════

    function _cancelCommand(commandId, townId, attackType, groupKey) {
        var typeLabel = attackType === 'naval' ? '🚢 NAVAL' : attackType === 'ground' ? '⚔️ TERRESTRE' : '🔄 MISTO';
        _log(`🚫 CANCELANDO ${typeLabel} comando #${commandId}`, 'dodge');

        var Game = _getGame();
        if (!Game || !Game.csrfToken) {
            _log(`❌ Game não disponível para ${typeLabel}`, 'error');
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
                _log(`✅ TROPAS ${typeLabel} VOLTARAM!`, 'success');
                _playSound('success');

                var timerKey = groupKey + '_' + attackType;
                if (dodgeState.returnTimers[timerKey]) {
                    clearTimeout(dodgeState.returnTimers[timerKey]);
                    delete dodgeState.returnTimers[timerKey];
                }

                if (dodgeState.groupStatus[groupKey]) {
                    dodgeState.groupStatus[groupKey].status = 'cancelled';
                }
                _updatePanel();

            } else {
                _log(`❌ Erro ao cancelar ${typeLabel}: ${xhr.responseText}`, 'error');
            }
        };

        xhr.onerror = function(e) {
            _log(`❌ Erro de rede ao cancelar ${typeLabel}: ${e}`, 'error');
        };

        xhr.send('json=' + encodeURIComponent(JSON.stringify(payload)));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔍 SCAN DE ATAQUES (CORRIGIDO)
    // ═══════════════════════════════════════════════════════════════════════

    var dodgeState = {
        groupTimers: {},
        returnTimers: {},
        groupStatus: {},
        isScanning: false,
        lastScan: 0,
        executedGroups: {},
    };

    function _scanAttacks() {
        var now = Date.now();
        if (dodgeState.isScanning || (now - dodgeState.lastScan < 200)) return;
        dodgeState.isScanning = true;
        dodgeState.lastScan = now;

        try {
            var MM = _getMM();
            if (!MM) { dodgeState.isScanning = false; return; }
            var mu = MM.getModels && MM.getModels().MovementsUnits;
            if (!mu) { dodgeState.isScanning = false; return; }

            var nowTime = _gameNow();
            var ITowns = _getITowns();
            var myTowns = ITowns && ITowns.getTowns ? ITowns.getTowns() : {};

            var cityAttacks = {};
            var currentAttackIds = {};

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
                if (CIDADES[townId] === undefined) continue;

                var attackId = key;
                currentAttackIds[attackId] = true;

                // ⭐ Remove ataques que já não existem mais
                if (processedAttacks[attackId] && !currentAttackIds[attackId]) {
                    delete processedAttacks[attackId];
                }

                if (!cityAttacks[townId]) {
                    cityAttacks[townId] = [];
                }
                cityAttacks[townId].push({
                    cmdId: key,
                    arrival: attrs.arrival_at,
                    type: _detectAttackType(attrs)
                });
            }

            // ⭐ LIMPA grupos de ataques que já não existem
            for (var key in dodgeState.executedGroups) {
                var attackId = key.split('_')[0];
                if (!currentAttackIds[attackId]) {
                    delete dodgeState.executedGroups[key];
                }
            }

            for (var townId in cityAttacks) {
                if (!cityAttacks.hasOwnProperty(townId)) continue;

                var attacks = cityAttacks[townId];
                if (attacks.length === 0) continue;

                attacks.sort(function(a, b) { return a.arrival - b.arrival; });

                var destino = CIDADES[townId];
                if (!destino) {
                    _log(`⚠️ Cidade ${townId} sem destino configurado!`, 'warning');
                    continue;
                }

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

                for (var g = 0; g < groups.length; g++) {
                    var group = groups[g];
                    var firstTime = group[0].arrival;
                    var lastTime = group[group.length - 1].arrival;
                    
                    // ⭐ CRIA UMA CHAVE ÚNICA baseada nos cmdIds
                    var cmdIds = group.map(function(a) { return a.cmdId; }).sort().join('_');
                    var groupKey = townId + '_' + cmdIds;

                    // ⭐ Se o grupo já foi executado, não faz nada
                    if (dodgeState.executedGroups[groupKey]) {
                        continue;
                    }

                    var isGroup = group.length > 1;
                    var timeToFirst = firstTime - nowTime;

                    // ⭐ Se o ataque já passou, marca como executado
                    if (timeToFirst < -10) {
                        dodgeState.executedGroups[groupKey] = true;
                        continue;
                    }

                    if (timeToFirst > 60) {
                        continue;
                    }

                    // ⭐ Verifica se já existe um grupo para este ataque
                    var existingGroupKey = null;
                    for (var existingKey in dodgeState.groupStatus) {
                        if (dodgeState.groupStatus.hasOwnProperty(existingKey)) {
                            var data = dodgeState.groupStatus[existingKey];
                            if (data && data.townId == townId && !data.dodged) {
                                // Verifica se tem algum ataque em comum
                                var hasCommon = data.attacks.some(function(att) {
                                    return group.some(function(g) { return g.cmdId === att.cmdId; });
                                });
                                if (hasCommon) {
                                    existingGroupKey = existingKey;
                                    break;
                                }
                            }
                        }
                    }

                    if (existingGroupKey) {
                        var existingData = dodgeState.groupStatus[existingGroupKey];
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

                        _log(`📦 GRUPO ATUALIZADO para ${townId}: ${existingData.attacks.length} ataques`, 'group');

                        if (dodgeState.groupTimers[existingGroupKey]) {
                            clearTimeout(dodgeState.groupTimers[existingGroupKey]);
                        }

                        var newDodgeDelay = Math.max(existingData.firstTime - nowTime - CONFIG.TEMPO_ANTECEDENCIA, 0) * 1000;
                        dodgeState.groupTimers[existingGroupKey] = setTimeout(function() {
                            _executeDodgeForGroup(existingData.townId, existingData.destino, existingData.firstTime, existingData.lastTime, existingData.attacks, existingGroupKey, existingData.isGroup);
                        }, newDodgeDelay);

                        continue;
                    }

                    // ⭐ NOVO GRUPO
                    dodgeState.groupStatus[groupKey] = {
                        townId: townId,
                        destino: destino,
                        firstTime: firstTime,
                        lastTime: lastTime,
                        attacks: group,
                        isGroup: isGroup,
                        status: 'waiting',
                        dodged: false
                    };

                    _log(`📦 NOVO GRUPO para ${townId}: ${group.length} ataques`, 'group');

                    var dodgeDelay = Math.max(firstTime - nowTime - CONFIG.TEMPO_ANTECEDENCIA, 0) * 1000;

                    if (dodgeState.groupTimers[groupKey]) {
                        clearTimeout(dodgeState.groupTimers[groupKey]);
                    }

                    dodgeState.groupTimers[groupKey] = setTimeout(function() {
                        _executeDodgeForGroup(townId, destino, firstTime, lastTime, group, groupKey, isGroup);
                    }, dodgeDelay);
                }
            }

            _updatePanel();

        } catch(e) {
            _log(`⚠️ Erro no scan: ${e.message}`, 'error');
        }

        dodgeState.isScanning = false;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ⚡ EXECUTAR DODGE PARA UM GRUPO
    // ═══════════════════════════════════════════════════════════════════════

    function _executeDodgeForGroup(townId, destino, firstTime, lastTime, attacks, groupKey, isGroup) {
        try {
            // ⭐ Verifica se já foi executado
            if (dodgeState.executedGroups[groupKey]) {
                return;
            }

            var troops = _getUnitsFromTown(townId, 'mixed');
            if (troops.total < CONFIG.MIN_TROOPS_TO_DODGE) {
                _log(`⚠️ Tropas insuficientes em ${townId}: ${troops.total}`, 'warning');
                if (dodgeState.groupStatus[groupKey]) {
                    dodgeState.groupStatus[groupKey].status = 'failed';
                }
                _updatePanel();
                return;
            }

            var typeLabel = isGroup ? '📦 GRUPO' : '🎯 INDIVIDUAL';
            _log(`⚡ EXECUTANDO DODGE ${typeLabel} para ${townId} (${attacks.length} ataques)`, 'dodge');
            _playSound('danger');

            // ⭐ Marca como executado ANTES de enviar
            dodgeState.executedGroups[groupKey] = true;

            _sendSupportForGroup(townId, destino, firstTime, lastTime, groupKey, 'ground');

            setTimeout(function() {
                _sendSupportForGroup(townId, destino, firstTime, lastTime, groupKey, 'naval');
            }, CONFIG.DIFERENCA_ENVIO * 1000);

            if (dodgeState.groupStatus[groupKey]) {
                dodgeState.groupStatus[groupKey].dodged = true;
                dodgeState.groupStatus[groupKey].status = 'dodged';
            }

            _log(`✅ Dodge executado para ${groupKey}!`, 'success');

        } catch(e) {
            _log(`❌ Erro ao executar dodge: ${e.message}`, 'error');
            if (dodgeState.groupStatus[groupKey]) {
                dodgeState.groupStatus[groupKey].status = 'failed';
            }
        }
        _updatePanel();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📋 UPDATE PANEL
    // ═══════════════════════════════════════════════════════════════════════

    function _updatePanel() {
        var list = document.getElementById('dodge-attack-list');
        if (!list) return;

        var now = _gameNow();
        var attackCount = 0;
        var html = '';

        var groups = [];
        for (var key in dodgeState.groupStatus) {
            if (dodgeState.groupStatus.hasOwnProperty(key)) {
                var data = dodgeState.groupStatus[key];
                if (data && data.lastTime > now - 10) {
                    groups.push(data);
                }
            }
        }

        if (groups.length === 0) {
            html = `
                <div class="hw-empty-state">
                    <div class="hw-empty-icon">🛡️</div>
                    <div>Nenhum ataque detectado</div>
                    <div style="font-size:10px;color:#555;margin-top:4px;">${Object.keys(CIDADES).length} cidades protegidas</div>
                </div>
            `;
        } else {
            groups.sort(function(a, b) { return a.firstTime - b.firstTime; });

            for (var i = 0; i < groups.length; i++) {
                var data = groups[i];
                var timeLeft = Math.round(data.firstTime - now);
                var timeStr = timeLeft > 0 ? (timeLeft > 60 ? Math.round(timeLeft / 60) + 'm ' + (timeLeft % 60) + 's' : timeLeft + 's') : '💥';

                var timeColor = '';
                if (timeLeft < 5 && timeLeft > 0) timeColor = 'hw-urgent';
                else if (timeLeft < 15 && timeLeft > 0) timeColor = 'hw-warning';
                else if (timeLeft > 0) timeColor = 'hw-safe';

                var typeLabel = data.isGroup ? '📦' : '🎯';
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
                var returnStr = new Date((data.lastTime + CONFIG.MARGEM_SEGURANCA_RETORNO) * 1000).toLocaleTimeString();

                var itemClass = 'hw-attack-item';
                if (data.dodged) itemClass += ' hw-dodged';
                if (data.isGroup) itemClass += ' hw-group';
                if (data.status === 'failed') itemClass += ' hw-failed';

                html += `
                    <div class="${itemClass}">
                        <span class="hw-attack-to">🏙️ ${data.townId} → ${data.destino}</span>
                        <span style="font-size:10px;color:#888;">${typeLabel}</span>
                        ${badgeHtml}
                        <span class="hw-attack-time ${timeColor}">⏱️ ${timeStr}</span>
                        <span style="font-size:9px;color:#666;">${firstStr} → ${lastStr}</span>
                        <span style="font-size:9px;color:#00b894;">↩️ ${returnStr}</span>
                        <span class="hw-attack-status ${statusClass}">${statusText}</span>
                    </div>
                `;
                attackCount++;
            }
        }

        list.innerHTML = html;

        var counter = document.getElementById('dodge-count');
        if (counter) {
            counter.textContent = attackCount;
            counter.classList.toggle('hw-count-danger', attackCount > 0);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🎯 CLASSE PARA O MULTOBOT
    // ═══════════════════════════════════════════════════════════════════════

    var _systemActive = false;
    var _scanInterval = null;

    function _startSystem() {
        if (_systemActive) return;
        _systemActive = true;
        _log('🚀 Sistema Dodge iniciado!', 'info');
        _scanAttacks();
        _scanInterval = setInterval(function() { _scanAttacks(); }, CONFIG.INTERVALO_REFRESH_ATAQUES * 1000);
        _updatePanel();
    }

    function _stopSystem() {
        _systemActive = false;
        if (_scanInterval) {
            clearInterval(_scanInterval);
            _scanInterval = null;
        }
        for (var key in dodgeState.groupTimers) {
            clearTimeout(dodgeState.groupTimers[key]);
        }
        for (var key in dodgeState.returnTimers) {
            clearTimeout(dodgeState.returnTimers[key]);
        }
        _log('⏹️ Sistema Dodge parado!', 'info');
        _updatePanel();
    }

    // Exportar para o MultBot
    window.AutoDodge = class AutoDodge extends MultUtil {
        constructor(c, s) {
            super(c, s);
            _log('🛡️ Dodge Ultimate V49.3 carregado!', 'info');
            _log('🏙️ ' + Object.keys(CIDADES).length + ' cidades protegidas', 'info');
            
            setTimeout(function() {
                _startSystem();
            }, 1000);
        }

        settings() {
            var isActive = _systemActive;
            
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
                    
                    <div style="padding:8px 12px;background:#1a1a2e;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-weight:bold;font-size:14px;color:#a29bfe;">🛡️ Dodge Ultimate V49.3 - <span style="color:${isActive ? '#00b894' : '#888'};">${isActive ? '🟢 ATIVO' : '🔴 INATIVO'}</span></span>
                        <button onclick="window._toggleDodgeSystem()" style="padding:4px 16px;border-radius:6px;border:none;cursor:pointer;background:${isActive ? '#ff6b6b' : '#00b894'};color:#fff;font-weight:bold;font-size:12px;">
                            ${isActive ? 'PARAR' : 'INICIAR'}
                        </button>
                    </div>
                    
                    <div style="padding:5px 12px;font-size:11px;background:#0f0f1a;border-bottom:1px solid #333;display:flex;flex-wrap:wrap;gap:10px;color:#aaa;">
                        <span>📦 Grupo: ${CONFIG.JANELA_GRUPO}s</span>
                        <span>⭐ ${CONFIG.TEMPO_ANTECEDENCIA}s ANTES</span>
                        <span>⏱️ ${CONFIG.MARGEM_SEGURANCA_RETORNO}s APÓS</span>
                        <span>🏙️ ${Object.keys(CIDADES).length} cidades</span>
                        <span class="hw-counter">⚔️ <span class="hw-count" id="dodge-count">0</span></span>
                    </div>
                    
                    <div style="padding:5px 12px;font-size:10px;color:#666;background:#0a0a15;border-bottom:1px solid #333;display:flex;gap:15px;flex-wrap:wrap;">
                        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#74b9ff;vertical-align:middle;"></span> Aguardando</span>
                        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#00b894;vertical-align:middle;"></span> Desviado</span>
                        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#fdcb6e;vertical-align:middle;"></span> Voltou</span>
                        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ff6b6b;vertical-align:middle;"></span> Falhou</span>
                    </div>
                    
                    <div id="dodge-attack-list" style="padding:5px 12px;min-height:80px;max-height:300px;overflow-y:auto;background:#0a0a15;">
                        <div class="hw-empty-state">
                            <div class="hw-empty-icon">🛡️</div>
                            <div>Nenhum ataque detectado</div>
                            <div style="font-size:10px;color:#555;margin-top:4px;">${Object.keys(CIDADES).length} cidades protegidas</div>
                        </div>
                    </div>
                    
                    <div style="padding:4px 12px;font-size:9px;color:#555;background:#0f0f1a;border-top:1px solid #333;text-align:center;">
                        Dodge Ultimate V49.3 - Agrupamento + Recall Automático
                    </div>
                </div>
            `;
        }

        toggle() {
            if (_systemActive) {
                _stopSystem();
            } else {
                _startSystem();
            }
        }
    };

    // Função global para o botão Iniciar/Parar
    window._toggleDodgeSystem = function() {
        if (_systemActive) {
            _stopSystem();
        } else {
            _startSystem();
        }
        if (window.MultBot && window.MultBot.loadModule) {
            window.MultBot.loadModule('AutoDodge');
        }
    };

    console.log('[AutoDodge] 🛡️ Dodge Ultimate V49.3 - CORRIGIDO');
    console.log('[AutoDodge] 📦 Ataques com menos de ' + CONFIG.JANELA_GRUPO + 's = GRUPO');
    console.log('[AutoDodge] 🏙️ ' + Object.keys(CIDADES).length + ' cidades protegidas');

})();
