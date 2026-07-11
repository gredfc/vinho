// ==UserScript==
// @name         BOt melhor - Dodge Ultimate V49.2 FINAL FUNCIONAL
// @namespace    https://github.com/moreira/grepolis-herald
// @version      49.2.0
// @description  Dodge com AGRUPAMENTO + ATUALIZAÇÃO EM TEMPO REAL
// @author       Moreira
// @match        https://*.grepolis.com/*
// @match        https://*.grepolis.pt/*
// @match        https://*.grepolis.com.br/*
// @match        https://*.grepolis.fr/*
// @match        https://*.grepolis.es/*
// @match        https://*.grepolis.de/*
// @match        https://*.grepolis.it/*
// @match        https://*.grepolis.pl/*
// @match        https://*.grepolis.ro/*
// @match        https://*.grepolis.hu/*
// @match        https://*.grepolis.cz/*
// @match        https://*.grepolis.sk/*
// @match        https://*.grepolis.bg/*
// @match        https://*.grepolis.rs/*
// @match        https://*.grepolis.hr/*
// @match        https://*.grepolis.si/*
// @match        https://*.grepolis.gr/*
// @match        https://*.grepolis.tr/*
// @match        https://*.grepolis.ru/*
// @match        https://*.grepolis.nl/*
// @match        https://*.grepolis.se/*
// @match        https://*.grepolis.no/*
// @match        https://*.grepolis.dk/*
// @match        https://*.grepolis.fi/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_addElement
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════
    // ⚙️ CONFIGURAÇÃO
    // ═══════════════════════════════════════════════════════════════════════
    var CIDADES = {
        2677: 2470,
        2195: 2280,
        197: 234,
        2165: 288,
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
    // 🎨 CSS (mantido igual)
    // ═══════════════════════════════════════════════════════════════════════

    GM_addStyle(`
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
        #herald-panel .hw-attack-type {
            font-size: 8px;
            padding: 2px 8px;
            border-radius: 10px;
            text-transform: uppercase;
            font-weight: 700;
        }
        #herald-panel .hw-attack-type.hw-type-ground {
            background: #00b894;
            color: #fff;
        }
        #herald-panel .hw-attack-type.hw-type-naval {
            background: #0984e3;
            color: #fff;
        }
        #herald-panel .hw-attack-type.hw-type-mixed {
            background: #fdcb6e;
            color: #000;
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
    `);

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
        console.log(`[HERALD] ${icon} [${new Date().toLocaleTimeString()}] ${message}`);
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
    // 📤 ENVIAR SUPORTE - COM RECALCULO DE TEMPO
    // ═══════════════════════════════════════════════════════════════════════

    var attackCommands = {};
    var troopsSent = {};

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

        var returnTime = Math.max(lastTime - _gameNow() + CONFIG.MARGEM_SEGURANCA_RETORNO, 3);

        _log(`🪖 Enviando ${limitedTotal} ${typeLabel} tropas de ${fromTownId} para ${targetTownId}`, 'info');
        _log(`⏱️ Voltar ${CONFIG.MARGEM_SEGURANCA_RETORNO}s APÓS o último ataque (${new Date((lastTime + CONFIG.MARGEM_SEGURANCA_RETORNO) * 1000).toLocaleTimeString()})`, 'info');

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
    // 🔍 SCAN DE ATAQUES - COM RECALCULO DE GRUPOS
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

            // 1. COLETAR TODOS OS ATAQUES POR CIDADE
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

                attacks.sort(function(a, b) { return a.arrival - b.arrival; });

                var destino = CIDADES[townId];
                if (!destino) {
                    _log(`⚠️ Cidade ${townId} sem destino configurado!`, 'warning');
                    continue;
                }

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

                    if (dodgeState.executedGroups[groupKey]) {
                        continue;
                    }

                    var isGroup = group.length > 1;
                    var timeToFirst = firstTime - nowTime;

                    if (timeToFirst > 60) {
                        continue;
                    }

                    // ⭐ VERIFICAR SE JÁ EXISTE UM GRUPO PARA ESTA CIDADE E ATUALIZAR
                    var existingGroupKey = null;
                    for (var existingKey in dodgeState.groupStatus) {
                        if (dodgeState.groupStatus.hasOwnProperty(existingKey)) {
                            var data = dodgeState.groupStatus[existingKey];
                            if (data && data.townId == townId && !data.dodged) {
                                // Verificar se o novo ataque está dentro da janela do grupo existente
                                if (Math.abs(data.lastTime - lastTime) <= CONFIG.JANELA_GRUPO) {
                                    existingGroupKey = existingKey;
                                    break;
                                }
                            }
                        }
                    }

                    if (existingGroupKey) {
                        // ⭐ ATUALIZAR GRUPO EXISTENTE
                        var existingData = dodgeState.groupStatus[existingGroupKey];
                        // Adicionar novos ataques ao grupo
                        for (var a = 0; a < group.length; a++) {
                            var exists = existingData.attacks.some(function(att) { return att.cmdId === group[a].cmdId; });
                            if (!exists) {
                                existingData.attacks.push(group[a]);
                            }
                        }
                        // Reordenar e recalcular
                        existingData.attacks.sort(function(a, b) { return a.arrival - b.arrival; });
                        existingData.firstTime = existingData.attacks[0].arrival;
                        existingData.lastTime = existingData.attacks[existingData.attacks.length - 1].arrival;
                        existingData.isGroup = existingData.attacks.length > 1;

                        _log(`📦 GRUPO ATUALIZADO para ${townId}: ${existingData.attacks.length} ataques`, 'group');
                        _log(`   ├─ Primeiro: ${new Date(existingData.firstTime * 1000).toLocaleTimeString()}`, 'debug');
                        _log(`   └─ Último: ${new Date(existingData.lastTime * 1000).toLocaleTimeString()}`, 'debug');

                        // Reagendar dodge com novo tempo
                        if (dodgeState.groupTimers[existingGroupKey]) {
                            clearTimeout(dodgeState.groupTimers[existingGroupKey]);
                        }

                        var newDodgeDelay = Math.max(existingData.firstTime - nowTime - CONFIG.TEMPO_ANTECEDENCIA, 0) * 1000;
                        dodgeState.groupTimers[existingGroupKey] = setTimeout(function() {
                            _executeDodgeForGroup(existingData.townId, existingData.destino, existingData.firstTime, existingData.lastTime, existingData.attacks, existingGroupKey, existingData.isGroup);
                        }, newDodgeDelay);

                        continue;
                    }

                    // 5. CRIAR NOVO GRUPO
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

                    var typeLabel = isGroup ? '📦 GRUPO' : '🎯 INDIVIDUAL';
                    _log(`${typeLabel} para ${townId} (${group.length} ataques)`, isGroup ? 'group' : 'attack');
                    _log(`   ├─ Primeiro: ${new Date(firstTime * 1000).toLocaleTimeString()}`, 'debug');
                    _log(`   ├─ Último: ${new Date(lastTime * 1000).toLocaleTimeString()}`, 'debug');
                    _log(`   ├─ ⭐ Enviar ${CONFIG.TEMPO_ANTECEDENCIA}s ANTES`, 'dodge');
                    _log(`   └─ Voltar ${CONFIG.MARGEM_SEGURANCA_RETORNO}s APÓS`, 'dodge');

                    // 6. AGENDAR DODGE
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
            if (dodgeState.executedGroups[groupKey]) {
                _log(`ℹ️ Grupo ${groupKey} já executado`, 'info');
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
            var numAttacks = attacks.length;
            _log(`⚡ EXECUTANDO DODGE ${typeLabel} para ${townId} (${numAttacks} ataques)`, 'dodge');
            _log(`⏱️ Primeiro ataque: ${new Date(firstTime * 1000).toLocaleTimeString()}`, 'dodge');
            _log(`⏱️ Último ataque: ${new Date(lastTime * 1000).toLocaleTimeString()}`, 'dodge');
            _log(`⏱️ Enviar ${CONFIG.TEMPO_ANTECEDENCIA}s ANTES`, 'dodge');
            _log(`⏱️ Voltar ${CONFIG.MARGEM_SEGURANCA_RETORNO}s APÓS (${new Date((lastTime + CONFIG.MARGEM_SEGURANCA_RETORNO) * 1000).toLocaleTimeString()})`, 'dodge');
            _playSound('danger');

            dodgeState.executedGroups[groupKey] = true;

            // ENVIAR TERRESTRES
            _sendSupportForGroup(townId, destino, firstTime, lastTime, groupKey, 'ground');

            // ENVIAR NAVAIS
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
        var panel = document.getElementById('herald-panel');
        if (!panel) return;

        var list = panel.querySelector('.hw-attack-list');
        if (!list) return;
        list.innerHTML = '';

        var now = _gameNow();
        var attackCount = 0;

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
            list.innerHTML = `
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
                var returnStr = new Date((data.lastTime + CONFIG.MARGEM_SEGURANCA_RETORNO) * 1000).toLocaleTimeString();

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
    // 🎨 PAINEL
    // ═══════════════════════════════════════════════════════════════════════

    function _addHeraldIcon() {
        var icon = document.createElement('span');
        icon.className = 'hw-control-icon';
        icon.innerHTML = '🛡️';
        icon.title = 'Herald SO - Dodge V49.2 FINAL';

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

        b.herald.control = icon;
        icon.addEventListener('click', function() { _showPanel(); });
        _log('✅ Ícone adicionado', 'success');
    }

    function _showPanel() {
        var existing = document.getElementById('herald-panel');
        if (existing) {
            existing.style.display = existing.style.display === 'none' ? 'flex' : 'none';
            return;
        }

        var panel = document.createElement('div');
        panel.id = 'herald-panel';
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
                    <input type="checkbox" ${CONFIG.AUTO_DODGE ? 'checked' : ''} onchange="window._hwToggleDodge(this.checked)">
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
                ⭐ Menos de ${CONFIG.JANELA_GRUPO}s = GRUPO | ${CONFIG.TEMPO_ANTECEDENCIA}s ANTES | ${CONFIG.MARGEM_SEGURANCA_RETORNO}s APÓS
            </div>
        `;

        document.body.appendChild(panel);

        window._hwSearch = function(val) {
            var items = panel.querySelectorAll('.hw-attack-item');
            var search = val.toLowerCase();
            for (var i = 0; i < items.length; i++) {
                items[i].style.display = items[i].textContent.toLowerCase().indexOf(search) >= 0 ? '' : 'none';
            }
        };

        window._hwRefresh = function() {
            _scanAttacks();
            _updatePanel();
        };

        window._hwClearAttacks = function() {
            if (!confirm('🗑️ Limpar todos os ataques?')) return;
            for (var key in dodgeState.groupTimers) {
                clearTimeout(dodgeState.groupTimers[key]);
            }
            for (var key in dodgeState.returnTimers) {
                clearTimeout(dodgeState.returnTimers[key]);
            }
            dodgeState.groupStatus = {};
            dodgeState.groupTimers = {};
            dodgeState.returnTimers = {};
            dodgeState.executedGroups = {};
            troopsSent = {};
            attackCommands = {};
            _updatePanel();
            _log('✅ Todos os ataques foram limpos', 'success');
        };

        window._hwTestDodge = function() {
            var towns = Object.keys(CIDADES);
            if (towns.length === 0) {
                _log('⚠️ Nenhuma cidade configurada!', 'warning');
                return;
            }
            var townId = parseInt(towns[0]);
            var destino = CIDADES[townId];
            var now = _gameNow();

            _log(`🧪 Simulando ataques para ${townId}...`, 'info');

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
                _log(`🧪 Ataque ${i+1} às ${new Date(arrival * 1000).toLocaleTimeString()}`, 'debug');
            }

            // Adicionar ataques à cidade
            cityAttacks = {};
            cityAttacks[townId] = attacks;

            _log(`🎯 ${attacks.length} ataques simulados!`, 'attack');

            // Processar manualmente
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
                var groupKey = townId + '_group_' + firstTime + '_' + g;
                var isGroup = group.length > 1;

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

                var dodgeDelay = Math.max(firstTime - now - CONFIG.TEMPO_ANTECEDENCIA, 0) * 1000;
                setTimeout(function(data, key) {
                    _executeDodgeForGroup(data.townId, data.destino, data.firstTime, data.lastTime, data.attacks, key, data.isGroup);
                }.bind(null, dodgeState.groupStatus[groupKey], groupKey), dodgeDelay);
            }

            _updatePanel();
        };

        window._hwToggleDodge = function(checked) {
            CONFIG.AUTO_DODGE = checked;
            _log(`🛡️ Dodge automático: ${checked ? 'ATIVADO' : 'DESATIVADO'}`, 'info');
        };

        _updatePanel();
        _log('📋 Painel aberto', 'success');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🚀 INICIALIZAÇÃO
    // ═══════════════════════════════════════════════════════════════════════

    var b = {
        herald: {
            active: false,
            control: null,
            start: function() {
                if (this.active) return;
                this.active = true;
                _log('🚀 Herald SO v49.2 - FINAL FUNCIONAL!', 'info');
                _log('🏙️ Cidades: ' + Object.keys(CIDADES).join(', '), 'info');
                _log('📦 Ataques com menos de ' + CONFIG.JANELA_GRUPO + 's = GRUPO', 'group');
                _log('⭐ Envia ' + CONFIG.TEMPO_ANTECEDENCIA + 's ANTES do primeiro', 'dodge');
                _log('⭐ Volta ' + CONFIG.MARGEM_SEGURANCA_RETORNO + 's APÓS o último', 'dodge');
                _log('🔴 ATUALIZAÇÃO EM TEMPO REAL!', 'success');

                _addHeraldIcon();
                _scanAttacks();

                setInterval(function() { _scanAttacks(); }, CONFIG.INTERVALO_REFRESH_ATAQUES * 1000);

                _log('✅ Sistema ativo!', 'success');
            },
            status: function() {
                var total = 0;
                for (var key in dodgeState.groupStatus) {
                    if (dodgeState.groupStatus.hasOwnProperty(key)) {
                        var data = dodgeState.groupStatus[key];
                        if (data && !data.dodged && data.lastTime > _gameNow()) {
                            total++;
                        }
                    }
                }
                _log(`📊 ${total} grupos pendentes`, 'info');
                return { groups: total };
            }
        }
    };

    function _waitForGrepolis(callback, maxAttempts) {
        maxAttempts = maxAttempts || 60;
        var attempts = 0;
        var check = function() {
            attempts++;
            try {
                if (typeof unsafeWindow !== 'undefined' && unsafeWindow.Game && unsafeWindow.Game.townId) {
                    callback();
                    return;
                }
            } catch(e) {}
            if (attempts < maxAttempts) { setTimeout(check, 500); }
            else { console.log('[HERALD] ⚠️ Grepolis não carregou'); }
        };
        check();
    }

    _waitForGrepolis(function() {
        console.log('[HERALD] 🚀 Grepolis detetado!');
        if (b.herald.start) b.herald.start();

        try {
            var win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
            if (win) {
                win.b = b;
                win.herald = b.herald;
                win.dodgeState = dodgeState;
                console.log('[HERALD] 🌐 Variáveis EXPORTADAS');
                console.log('[HERALD] 💡 Comandos:');
                console.log('  - b.herald.status() → Ver status');
                console.log('  - dodgeState.groupStatus → Ver todos os grupos');
            }
        } catch(e) {}

        console.log('[HERALD] ✅ Herald SO v49.2 - FINAL FUNCIONAL!');
        console.log('[HERALD] 📦 Ataques com menos de ' + CONFIG.JANELA_GRUPO + 's = GRUPO');
        console.log('[HERALD] 🔴 ATUALIZAÇÃO EM TEMPO REAL!');
    }, 120);

    console.log('[HERALD] 🛡️ Herald SO v49.2 - FINAL FUNCIONAL!');
    console.log('[HERALD] 📦 Ataques com menos de ' + CONFIG.JANELA_GRUPO + 's = GRUPO');
    console.log('[HERALD] 🔴 ATUALIZAÇÃO EM TEMPO REAL!');

})();
