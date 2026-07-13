// ═══════════════════════════════════════════════════════════════════════
// 🛡️ FALLBACK PARA GM_addStyle - ANTES DE TUDO
// ═══════════════════════════════════════════════════════════════════════

if (typeof GM_addStyle === 'undefined') {
    window.GM_addStyle = function(css) {
        try {
            var style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
            console.log('[MultBot] ✅ CSS injetado via fallback (GM_addStyle)');
            return true;
        } catch(e) {
            console.error('[MultBot] ❌ Erro ao adicionar CSS: ' + e.message);
            return false;
        }
    };
    console.log('[MultBot] ✅ GM_addStyle fallback instalado');
}

// ═══════════════════════════════════════════════════════════════════════
// 🎨 CSS DO AUTOATTACK - TEMA CASTANHO
// ═══════════════════════════════════════════════════════════════════════

GM_addStyle(`
    .attack-btn {
        display: inline-block !important;
        padding: 6px 14px !important;
        background: linear-gradient(135deg, #3a2510, #2a1a0a) !important;
        border: 1px solid #8B6914 !important;
        border-radius: 4px !important;
        color: #c8a86e !important;
        cursor: pointer !important;
        font-size: 12px !important;
        font-weight: bold !important;
        transition: all 0.3s ease !important;
        text-decoration: none !important;
        margin: 2px !important;
    }
    .attack-btn:hover {
        background: linear-gradient(135deg, #4a3520, #3a2510) !important;
        border-color: #d4a017 !important;
        color: #ffd700 !important;
        box-shadow: 0 0 20px rgba(139, 105, 20, 0.2) !important;
        transform: translateY(-1px) !important;
    }
    .attack-btn.running {
        background: linear-gradient(135deg, #2d5a1e, #1a3a0a) !important;
        border-color: #44ff88 !important;
        color: #44ff88 !important;
    }
    .attack-btn.stopped {
        background: linear-gradient(135deg, #5a1e1e, #3a0a0a) !important;
        border-color: #ff4444 !important;
        color: #ff4444 !important;
    }
    .attack-btn.disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
        filter: grayscale(50%) !important;
    }
    .attack-btn.disabled:hover {
        transform: none !important;
        box-shadow: none !important;
    }
    .attacks_list {
        list-style: none !important;
        padding: 0 !important;
        margin: 0 !important;
        max-height: 280px !important;
        overflow-y: auto !important;
    }
    .attacks_list li {
        padding: 6px 8px !important;
        border-bottom: 1px solid #2a1a0a !important;
        font-size: 12px !important;
        position: relative !important;
        background: rgba(20, 12, 5, 0.3) !important;
        border-radius: 4px !important;
        margin: 2px 0 !important;
        min-height: 32px !important;
    }
    .attacks_list li.odd { background: rgba(30, 20, 10, 0.2) !important; }
    .attacks_list li.even { background: rgba(50, 35, 20, 0.15) !important; }
    .attacks_list li:hover { background: rgba(139, 105, 20, 0.15) !important; border-color: #8B6914 !important; }
    .attacks_list .attack_type32x32 {
        display: inline-block !important;
        width: 32px !important;
        height: 32px !important;
        background-image: url(https://grepolis.com/images/attack_types_sprite.png) !important;
        background-repeat: no-repeat !important;
        vertical-align: middle !important;
        margin-right: 8px !important;
        background-size: 500px 150px !important;
    }
    .attacks_list .arrow {
        display: inline-block !important;
        width: 16px !important;
        height: 16px !important;
        background-image: url(https://grepolis.com/images/arrows.png) !important;
        background-position: 0 -32px !important;
        vertical-align: middle !important;
        margin: 0 4px !important;
    }
    .attacks_list .row1 { font-weight: bold !important; color: #d4a017 !important; display: inline-block !important; font-size: 11px !important; }
    .attacks_list .row2 { font-size: 10px !important; color: #a89070 !important; display: block !important; margin-top: 2px !important; }
    .attacks_list .row2.expired { color: #ff4444 !important; }
    .attacks_list .attack_bot_timer {
        position: absolute !important;
        right: 10px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        color: #44ff88 !important;
        font-weight: bold !important;
        font-size: 14px !important;
        font-family: 'Consolas', monospace !important;
        text-shadow: 0 0 10px rgba(68, 255, 136, 0.2) !important;
    }
    .attacks_list .attack_bot_timer.success { color: #44ff88 !important; }
    .attacks_list .attack_bot_timer.error { color: #ff4444 !important; }
    .attacks_list .show_units {
        cursor: pointer !important;
        color: #8B6914 !important;
        font-size: 10px !important;
        display: inline-block !important;
        margin-left: 4px !important;
        transition: color 0.2s ease !important;
    }
    .attacks_list .show_units:hover { color: #d4a017 !important; }
    .origin_town_units {
        display: none !important;
        padding: 5px 0 !important;
        border-top: 1px solid #2a1a0a !important;
        margin-top: 5px !important;
        clear: both !important;
    }
    .origin_town_units .unit_icon25x25 {
        display: inline-block !important;
        width: 25px !important;
        height: 25px !important;
        background-image: url(https://grepolis.com/images/units_sprite.png) !important;
        background-repeat: no-repeat !important;
        color: #ffd700 !important;
        font-size: 11px !important;
        text-align: center !important;
        line-height: 25px !important;
        font-weight: bold !important;
        margin: 2px !important;
        text-shadow: 0 0 10px rgba(255, 215, 0, 0.2) !important;
        background-size: 500px 150px !important;
    }
    .attack-status {
        padding: 8px 0 !important;
        color: #a89070 !important;
        font-size: 12px !important;
        clear: both !important;
        border-top: 1px solid #2a1a0a !important;
        margin-top: 8px !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
    }
    .attack-status .status-dot {
        display: inline-block !important;
        width: 10px !important;
        height: 10px !important;
        border-radius: 50% !important;
        margin-right: 8px !important;
    }
    .attack-status .status-dot.idle { background: #666 !important; }
    .attack-status .status-dot.running { background: #44ff88 !important; animation: pulse-dot 1s ease-in-out infinite !important; }
    .attack-status .status-dot.done { background: #ffd700 !important; }
    .attack-status .status-dot.error { background: #ff4444 !important; }
    @keyframes pulse-dot {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(0.8); }
    }
    .attacks_list::-webkit-scrollbar { width: 4px !important; }
    .attacks_list::-webkit-scrollbar-track { background: #1a1008 !important; }
    .attacks_list::-webkit-scrollbar-thumb { background: #8B6914 !important; border-radius: 2px !important; }
    .attacks_list::-webkit-scrollbar-thumb:hover { background: #d4a017 !important; }
`);

// ═══════════════════════════════════════════════════════════════════════
// 📦 MÓDULO: DataExchanger (para o AutoAttack)
// ═══════════════════════════════════════════════════════════════════════

var DataExchangerAA = {
    default_handler: function(callback, returnJson) {
        return function(response) {
            var data = response.json || response;
            if (data.redirect) { window.location.href = data.redirect; return; }
            if (data.maintenance && typeof MaintenanceWindowFactory !== 'undefined') {
                MaintenanceWindowFactory.openMaintenanceWindow(data.maintenance);
                return;
            }
            if (data.notifications && typeof NotificationLoader !== 'undefined') {
                NotificationLoader.recvNotifyData(data, 'data');
                delete data.notifications;
                delete data.next_fetch_in;
            }
            if (returnJson) return callback(response);
            return callback(data);
        };
    },
    attack_planner: function(townId, callback) {
        var data = {
            town_id: townId, action: 'attacks', h: Game.csrfToken,
            json: JSON.stringify({ town_id: townId, nl_init: true })
        };
        var url = window.location.protocol + '//' + document.domain + '/game/attack_planer';
        $.ajax({ url: url, data: data, method: 'GET', dataType: 'json', success: this.default_handler(callback) });
    },
    town_info_attack: function(townId, attackData, callback) {
        var data = {
            town_id: townId, action: 'attack', h: Game.csrfToken,
            json: JSON.stringify({
                id: attackData.target_id, nl_init: true, origin_town_id: attackData.town_id,
                preselect: true, preselect_units: attackData.units, town_id: Game.townId
            })
        };
        var url = window.location.protocol + '//' + document.domain + '/game/town_info';
        $.ajax({ url: url, data: data, method: 'GET', dataType: 'json', success: this.default_handler(callback) });
    },
    send_units: function(townId, type, targetId, units, callback) {
        var url = window.location.protocol + '//' + document.domain + '/game/town_info?' + $.param({
            town_id: townId, action: 'send_units', h: Game.csrfToken
        });
        var data = {
            json: JSON.stringify($.extend({
                id: targetId, type: type, town_id: townId, nl_init: true
            }, units))
        };
        $.ajax({ url: url, data: data, method: 'POST', dataType: 'json', success: this.default_handler(callback) });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// 📦 MÓDULO: AutoAttack
// ═══════════════════════════════════════════════════════════════════════

var AutoAttackModule = {
    settings: { autostart: false },
    attacks: [],
    attacks_timers: [],
    checked_count: 0,
    isRunning: false,
    panelElement: null,
    isInitialized: false,

    init: function() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        console.log('⚔️ AutoAttack inicializado!');
    },

    checkPremium: function() {
        try {
            return $('.advisor_frame.captain div').hasClass('captain_active');
        } catch(e) {
            return false;
        }
    },

    loadAttackQueue: function(callback) {
        var self = this;
        var container = document.getElementById('attack-list-container');
        if (container) {
            container.innerHTML = '<p style="color:#a89070;font-size:12px;padding:10px 0;">⏳ A carregar ataques...</p>';
        }

        DataExchangerAA.attack_planner(Game.townId, function(data) {
            self.setAttackData(data);
            self.setAttackQueue(container);
            if (callback) callback();
        });
    },

    setAttackData: function(data) {
        if (this.checkPremium()) {
            this.attacks = data.data && data.data.attacks !== undefined ? data.data.attacks : [];
        } else {
            this.attacks = [];
        }
    },

    setAttackQueue: function(container) {
        var self = this;
        var list = document.createElement('ul');
        list.className = 'attacks_list';

        if (!container) {
            container = document.getElementById('attack-list-container');
        }

        if (!this.attacks || this.attacks.length === 0) {
            if (container) {
                container.innerHTML = '<p style="color:#a89070;font-size:12px;padding:10px 0;">📭 Nenhum ataque planejado</p>';
            }
            this.updateStatus('idle', 'Nenhum ataque', 0);
            return;
        }

        $.each(this.attacks, function(index, attack) {
            index++;
            var row = self.attackOrderRow(attack, index);
            list.appendChild(row);
        });

        if (container) {
            container.innerHTML = '';
            container.appendChild(list);
        }
        this.updateStatus('idle', 'Pronto', this.attacks.length);
    },

    attackOrderRow: function(attack, index) {
        var self = this;
        var unitsDiv = document.createElement('div');
        unitsDiv.className = 'origin_town_units';

        if (attack.units) {
            $.each(attack.units, function(id, count) {
                if (count > 0) {
                    var unitDiv = document.createElement('div');
                    unitDiv.className = 'unit_icon25x25 ' + id;
                    unitDiv.textContent = count;
                    unitsDiv.appendChild(unitDiv);
                }
            });
        }

        var row = document.createElement('li');
        row.className = 'attacks_row ' + ((index % 2 === 0) ? 'odd' : 'even');
        row.id = 'attack_order_id_' + attack.id;

        var timerText = '';
        var timer = this.attacks_timers.find(function(t) { return t.attack_id === attack.id; });
        if (timer) {
            timerText = timer.is_running ? this.toHHMMSS(attack.send_at - Timestamp.now()) : timer.message_text;
        }

        row.innerHTML = `
            <div style="display:flex; align-items:center; flex-wrap:wrap;">
                <div class="attack_type32x32 ${attack.type}"></div>
                <div class="arrow"></div>
                <div class="row1">
                    ${attack.origin_town_link || '???'} (${attack.origin_player_link || '???'})
                    <span class="small_arrow"></span>
                    ${attack.target_town_link || '???'} (${attack.target_player_link || '???'})
                    <span class="show_units">📦</span>
                </div>
                <div class="attack_bot_timer">${timerText}</div>
            </div>
            <div class="row2${attack.send_at <= Timestamp.now() ? ' expired' : ''}">
                <span>Partida</span> ${DateHelper.formatDateTimeNice(attack.send_at)}
                <span>Chegada</span> ${DateHelper.formatDateTimeNice(attack.arrival_at)}
            </div>
        `;

        row.appendChild(unitsDiv);

        var showUnits = row.querySelector('.show_units');
        if (showUnits) {
            showUnits.addEventListener('click', function(e) {
                e.stopPropagation();
                var units = row.querySelector('.origin_town_units');
                if (units) {
                    units.style.display = units.style.display === 'none' || units.style.display === '' ? 'block' : 'none';
                }
            });
        }

        return row;
    },

    start: function() {
        var self = this;

        if (this.isRunning) {
            console.log('⚠️ AutoAttack já está em execução!');
            return;
        }

        if (!this.checkPremium()) {
            HumanMessage.error('Premium Captain necessário!');
            return;
        }

        console.log('⚔️ Iniciando AutoAttack...');
        this.isRunning = true;
        this.attacks_timers = [];

        DataExchangerAA.attack_planner(Game.townId, function(data) {
            self.setAttackData(data);

            if (!self.attacks || self.attacks.length === 0) {
                HumanMessage.error('Nenhum ataque disponível!');
                self.isRunning = false;
                self.updateStatus('error', 'Nenhum ataque', 0);
                self.setAttackQueue(document.getElementById('attack-list-container'));
                return;
            }

            var deferreds = [];
            $.each(self.attacks, function(index, attack) {
                var def = $.Deferred();
                self.checkAttack(attack, index).then(function() {
                    def.resolve();
                });
                deferreds.push(def);
            });

            $.when.apply($, deferreds).done(function() {
                self.checked_count = 0;
                var runningCount = self.countRunningAttacks();
                if (runningCount === 0) {
                    HumanMessage.error('Nenhum ataque disponível.');
                    self.isRunning = false;
                    self.updateStatus('error', 'Nenhum ataque', 0);
                } else {
                    HumanMessage.success('Enviando: ' + runningCount + ' ataques.');
                    self.updateStatus('running', 'Executando ' + runningCount + ' ataques', self.attacks.length);
                }
            });
        });
    },

    checkAttack: function(attack, index) {
        var def = $.Deferred();
        var self = this;

        if (attack.send_at >= Timestamp.now()) {
            self.checked_count++;
            setTimeout(function() {
                DataExchangerAA.town_info_attack(attack.town_id, attack, function(data) {
                    if (data.json) {
                        if (!data.json.same_island || GameDataUnits.hasNavalUnits(attack.units)) {
                            var capacity = GameDataUnits.calculateCapacity(attack.town_id, attack.units);
                            if (capacity.needed_capacity > capacity.total_capacity) {
                                var msg = 'Capacidade insuficiente';
                                var msgEl = document.querySelector('#attack_order_id_' + attack.id + ' .attack_bot_timer');
                                if (msgEl) {
                                    msgEl.className = 'attack_bot_timer';
                                    msgEl.textContent = msg;
                                }
                                self.addAttack(index, msg);
                                def.resolve();
                                return false;
                            }
                        }
                        self.addAttack(index);
                        def.resolve();
                    }
                });
            }, ((self.checked_count * 1000) / 2));
        } else {
            var msg = 'Expirado';
            self.addAttack(index, msg);
            var msgEl = document.querySelector('#attack_order_id_' + attack.id + ' .attack_bot_timer');
            if (msgEl) {
                msgEl.className = 'attack_bot_timer';
                msgEl.textContent = msg;
            }
            def.resolve();
        }

        return def;
    },

    addAttack: function(index, message) {
        var self = this;
        var attack = this.attacks[index];

        if (!attack) return;

        var timer = {
            is_running: false,
            attack_id: attack.id,
            interval: null,
            message_text: message || ''
        };

        if (message) {
            this.attacks_timers.push(timer);
            return;
        }

        timer.is_running = true;
        timer.interval = setInterval(function() {
            var currentAttack = self.attacks[index];
            if (!currentAttack) {
                timer.is_running = false;
                clearInterval(timer.interval);
                return;
            }

            var timeLeft = currentAttack.send_at - Timestamp.now();
            var msgEl = document.querySelector('#attack_order_id_' + timer.attack_id + ' .attack_bot_timer');
            if (msgEl) {
                msgEl.textContent = self.toHHMMSS(timeLeft);
            }

            if (timeLeft === 300 || timeLeft === 120 || timeLeft === 60) {
                console.log('⚔️ [' + currentAttack.origin_town_name + ' → ' + currentAttack.target_town_name + '] Partida em ' + self.toHHMMSS(timeLeft));
            }

            if (currentAttack.send_at <= Timestamp.now()) {
                timer.is_running = false;
                self.sendAttack(currentAttack);
                self.stopTimer(timer);
            }
        }, 1000);

        this.attacks_timers.push(timer);
    },

    stopTimer: function(timer) {
        clearInterval(timer.interval);
        if (this.countRunningAttacks() === 0) {
            console.log('⚔️ Todos os ataques finalizados!');
            this.isRunning = false;
            this.updateStatus('done', 'Finalizado', this.attacks.length);
            this.setAttackQueue(document.getElementById('attack-list-container'));
        }
    },

    countRunningAttacks: function() {
        return this.attacks_timers.filter(function(t) { return t.is_running; }).length;
    },

    sendAttack: function(attack) {
        var self = this;
        DataExchangerAA.send_units(
            attack.town_id,
            attack.type,
            attack.target_town_id,
            this.unitsToSend(attack.units),
            function(data) {
                var timer = self.attacks_timers.find(function(t) { return t.attack_id === attack.id; });
                var msgEl = document.querySelector('#attack_order_id_' + attack.id + ' .attack_bot_timer');
                if (data.success && timer) {
                    timer.message_text = '✅ Sucesso!';
                    if (msgEl) {
                        msgEl.className = 'attack_bot_timer success';
                        msgEl.textContent = '✅';
                    }
                    console.log('⚔️ [' + attack.origin_town_name + ' → ' + attack.target_town_name + '] ' + data.success);
                } else if (data.error && timer) {
                    timer.message_text = '❌ Falha!';
                    if (msgEl) {
                        msgEl.className = 'attack_bot_timer error';
                        msgEl.textContent = '❌';
                    }
                    console.log('⚔️ [' + attack.origin_town_name + ' → ' + attack.target_town_name + '] ' + data.error);
                }
            }
        );
    },

    unitsToSend: function(units) {
        var result = {};
        $.each(units, function(id, count) {
            if (count > 0) {
                result[id] = count;
            }
        });
        return result;
    },

    toHHMMSS: function(seconds) {
        if (seconds < 0) seconds = 0;
        var hours = Math.floor(seconds / 3600);
        var minutes = Math.floor((seconds % 3600) / 60);
        var secs = Math.floor(seconds % 60);
        var ret = '';
        if (hours > 0) {
            ret += hours + ':' + (minutes < 10 ? '0' : '');
        }
        ret += minutes + ':' + (secs < 10 ? '0' : '');
        ret += secs;
        return ret;
    },

    updateStatus: function(state, text, count) {
        var dot = document.getElementById('attack-status-dot');
        var statusText = document.getElementById('attack-status-text');
        var countEl = document.getElementById('attack-count');

        if (dot) {
            dot.className = 'status-dot ' + state;
        }
        if (statusText) {
            statusText.textContent = text;
        }
        if (countEl && count !== undefined) {
            countEl.textContent = count + ' ataques';
        }
    },

    stop: function() {
        this.isRunning = false;
        this.attacks_timers.forEach(function(t) {
            clearInterval(t.interval);
        });
        this.attacks_timers = [];
        console.log('⚔️ AutoAttack parado!');
        this.updateStatus('idle', 'Pronto', this.attacks.length);
        this.setAttackQueue(document.getElementById('attack-list-container'));
        HumanMessage.info('AutoAttack parado!');
    },

    settings: function() {
        var self = this;
        var isCaptain = this.checkPremium();

        setTimeout(function() {
            self.loadAttackQueue();
        }, 500);

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
            <div class="game_header bold" style="color:#d4a017;font-size:14px;padding:8px 12px;background:linear-gradient(135deg,#3a2510,#2a1a0a);border-bottom:2px solid #8B6914;">
                ⚔️ Plano de Ataques <span style="font-size:10px;color:#c8a86e;font-weight:normal;">(Premium Captain necessário)</span>
            </div>
            <div style="padding:10px 12px;">
                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px;">
                    <a href="#" class="attack-btn" id="attack-activate-btn">▶️ Ativar Ataques</a>
                    <a href="#" class="attack-btn" id="attack-refresh-btn">🔄 Atualizar</a>
                    <a href="#" class="attack-btn" id="attack-planner-btn">📋 Planejador</a>
                    <a href="#" class="attack-btn" id="attack-stop-btn" style="color:#ff6b6b;">⏹️ Parar</a>
                </div>
                <div id="attack-list-container">
                    <p style="color:#a89070;font-size:12px;padding:10px 0;">⏳ A carregar ataques...</p>
                </div>
                <div class="attack-status">
                    <span>
                        <span class="status-dot idle" id="attack-status-dot"></span>
                        <span id="attack-status-text">Pronto</span>
                    </span>
                    <span id="attack-count">${this.attacks ? this.attacks.length : 0} ataques</span>
                </div>
                ${!isCaptain ? `<div style="padding:8px 0;color:#ff6b6b;font-size:12px;">⚠️ Premium Captain necessário para enviar ataques</div>` : ''}
            </div>
        </div>`;
    }
};

// ═══════════════════════════════════════════════════════════════════════
// 📦 MULTBOT - CORRIGIDO (AutoFarm carregado do módulo externo)
// ═══════════════════════════════════════════════════════════════════════

var MultBot = class {
    constructor() {
        this.console = new BotConsole();
        this.storage = new MultStorage();

        this.$ui = uw.$("#ui_box");
        this.$menu = this.createMultMenu();
        const $divider = uw.$('<div class="divider"></div>');

        // ⭐ AUTO FARM - Carregado do módulo externo (NÃO usar _safeInit)
        if (typeof AutoFarm !== 'undefined') {
            this.autoFarm = new AutoFarm(this.console, this.storage);
            if (this.autoFarm) {
                this.$menu.append(this.autoFarm.$activity);
                this.$ui.append(this.autoFarm.$popup);
            }
            console.log('[MultBot] ✅ AutoFarm carregado do módulo externo');
        } else {
            this.autoFarm = null;
            console.log('[MultBot] ⚠️ AutoFarm não disponível');
        }

        // ⭐ RESTANTES MÓDULOS (que NÃO estão no auto_farm.js)
        this.autoGratis         = this._safeInit('AutoGratis', () => new AutoGratis(this.console, this.storage));
        this.autoRuralLevel     = this._safeInit('AutoRuralLevel', () => new AutoRuralLevel(this.console, this.storage));
        this.autoBuild          = this._safeInit('AutoBuild', () => new AutoBuild(this.console, this.storage));
        this.autoRuralTrade     = this._safeInit('AutoRuralTrade', () => new AutoRuralTrade(this.console, this.storage));
        this.autoBootcamp       = this._safeInit('AutoBootcamp', () => new AutoBootcamp(this.console, this.storage));
        this.autoParty          = this._safeInit('AutoParty', () => new AutoParty(this.console, this.storage));
        this.autoTrain          = this._safeInit('AutoTrain', () => new AutoTrain(this.console, this.storage));
        this.autoHide           = this._safeInit('AutoHide', () => new AutoHide(this.console, this.storage));
        this.antiRage           = this._safeInit('AntiRage', () => new AntiRage(this.console, this.storage));
        this.autoTrade          = this._safeInit('AutoTrade', () => new AutoTrade(this.console, this.storage));
        this.colonizeShipSender = this._safeInit('ColonizeShipSender', () => new ColonizeShipSender(this.console, this.storage));
        this.multTools          = this._safeInit('MultTools', () => new MultTools(this.console, this.storage));
        this.autoQuest          = this._safeInit('AutoQuest', () => new AutoQuest(this.console, this.storage));
        this.autoMilitia        = this._safeInit('AutoMilitia', () => new AutoMilitia(this.console, this.storage));
        this.autoAttack         = this._safeInit('AutoDodge', () => new AutoDodge(this.console, this.storage));
        this.autoAresSacrifice  = this._safeInit('AutoAresSacrifice', () => new AutoAresSacrifice(this.console, this.storage));
        this.autoResearch       = this._safeInit('AutoResearch', () => new AutoResearch(this.console, this.storage));
        this.statusPanel        = this._safeInit('StatusPanel', () => new StatusPanel(this.console, this.storage));

        // ⭐ AUTOATTACK
        this.autoAttackModule = AutoAttackModule;
        this.autoAttackModule.init();

        // AutoSendResources
        this.autoSendResources  = this._safeInit('AutoSendResources', () => new AutoSendResources(this.console, this.storage));

        if (this.autoSendResources) {
            const FROM = 154;
            const TO = 2195;
            const AMOUNT = 0;
            const INTERVALO = 0;

            this.autoSendResources.settings = function() {
                requestAnimationFrame(() => this._updateTitle());
                return `
                <div class="game_border" style="margin-bottom:20px;">
                    <div class="game_border_top"></div><div class="game_border_bottom"></div>
                    <div class="game_border_left"></div><div class="game_border_right"></div>
                    <div class="game_border_corner corner1"></div><div class="game_border_corner corner2"></div>
                    <div class="game_border_corner corner3"></div><div class="game_border_corner corner4"></div>
                    ${this.getTitleHtml('asr_title', `📦 Envio ${FROM} → ${TO} (${AMOUNT} cada - 20min)`, this.toggle, '', this._active)}
                    <div style="padding:5px 10px;font-weight:bold;color:#2c1810;">
                        📤 Envia ${AMOUNT} madeira + ${AMOUNT} pedra + ${AMOUNT} prata (${AMOUNT * 3} total) a cada 20 minutos
                    </div>
                    <div style="padding:2px 10px 4px;font-size:11px;color:#5a3a0a;">
                        📍 ${FROM} → ${TO} | ⏱ 20 min | ✅ Recursos ≥ ${AMOUNT} cada + Capacidade ≥ ${AMOUNT * 3}
                    </div>
                    <div id="asr_log" style="padding:2px 10px 8px;font-size:12px;color:#2c1810;min-height:18px;font-weight:bold;"></div>
                    <div style="padding:0 10px 4px;font-size:10px;color:#888;border-top:1px solid #ddd;margin-top:2px;">
                        ⏱ Última verificação: <span id="asr_timestamp">Aguardando...</span>
                    </div>
                </div>`;
            };

            this.autoSendResources._tick = async function() {
                const logEl = uw.$('#asr_log');
                const timestampEl = uw.$('#asr_timestamp');
                const horaAtual = new Date().toLocaleTimeString();

                if (timestampEl.length) {
                    timestampEl.text(horaAtual);
                }

                this.console.log(`[AutoSend] 🔍 Verificando ${FROM} → ${TO}...`);

                try {
                    if (typeof ITowns === 'undefined' || !ITowns.towns || Object.keys(ITowns.towns).length === 0) {
                        if (logEl.length) {
                            logEl.text('⏳ Aguardando jogo...');
                            logEl.css('color', '#ffff00');
                        }
                        return;
                    }

                    const from = ITowns.towns[FROM];
                    const to = ITowns.towns[TO];

                    if (!from || !to) {
                        if (logEl.length) {
                            logEl.text(`❌ Cidade ${FROM} ou ${TO} não existe!`);
                            logEl.css('color', '#ff0000');
                        }
                        return;
                    }

                    const res = from.resources();
                    const capacity = from.getAvailableTradeCapacity();

                    if (res.wood < AMOUNT || res.stone < AMOUNT || res.iron < AMOUNT) {
                        if (logEl.length) {
                            logEl.text(`${horaAtual} ⏸ 🪵${Math.floor(res.wood)} 🪨${Math.floor(res.stone)} ⚙${Math.floor(res.iron)}`);
                            logEl.css('color', '#ffff00');
                        }
                        return;
                    }

                    if (capacity < AMOUNT * 3) {
                        if (logEl.length) {
                            logEl.text(`${horaAtual} ⏸ Cap: ${capacity}`);
                            logEl.css('color', '#ffff00');
                        }
                        return;
                    }

                    if (logEl.length) {
                        logEl.text(`${horaAtual} ⏳ Enviando ${AMOUNT} de cada...`);
                        logEl.css('color', '#ffff00');
                    }

                    const resultado = await this._sendResources(FROM, TO, AMOUNT);

                    if (resultado) {
                        if (logEl.length) {
                            logEl.text(`${horaAtual} ✅ ${AMOUNT} de cada enviado!`);
                            logEl.css('color', '#00ff00');
                        }
                        this.console.log(`[AutoSend] ✅ ${AMOUNT} de cada → ${to.getName()}`);
                    } else {
                        if (logEl.length) {
                            logEl.text(`${horaAtual} ❌ Falha no envio`);
                            logEl.css('color', '#ff0000');
                        }
                        this.console.log(`[AutoSend] ❌ Falha ao enviar`);
                    }

                } catch(e) {
                    if (logEl.length) {
                        logEl.text(`❌ ${e.message}`);
                        logEl.css('color', '#ff0000');
                    }
                    this.console.log(`[AutoSend] ❌ Erro: ${e.message}`);
                }
            };

            this.autoSendResources._sendResources = function(fromId, toId, amount) {
                return new Promise((resolve) => {
                    try {
                        const data = {
                            id: parseInt(toId),
                            wood: amount,
                            stone: amount,
                            iron: amount,
                            town_id: parseInt(fromId),
                            nl_init: true
                        };

                        if (Game && Game.csrfToken) {
                            data.csrf_token = Game.csrfToken;
                            data.token = Game.csrfToken;
                        }

                        const timer = setTimeout(() => resolve(false), 15000);

                        if (typeof GPAjax !== 'undefined' && GPAjax.ajaxPost) {
                            GPAjax.ajaxPost('town_info', 'trade', data, true,
                                res => { clearTimeout(timer); resolve(res && !res.error); },
                                () => { clearTimeout(timer); resolve(false); }
                            );
                            return;
                        }

                        if (typeof gpAjax !== 'undefined' && gpAjax.ajaxPost) {
                            gpAjax.ajaxPost('town_info', 'trade', data, true,
                                res => { clearTimeout(timer); resolve(res && !res.error); },
                                () => { clearTimeout(timer); resolve(false); }
                            );
                            return;
                        }

                        if (typeof $ !== 'undefined' && $.ajax) {
                            $.ajax({
                                url: '/game/action/town_info/trade',
                                method: 'POST',
                                data: data,
                                dataType: 'json',
                                success: (res) => { clearTimeout(timer); resolve(res && !res.error); },
                                error: () => { clearTimeout(timer); resolve(false); }
                            });
                            return;
                        }

                        const xhr = new XMLHttpRequest();
                        xhr.open('POST', '/game/action/town_info/trade', true);
                        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                        xhr.onload = function() {
                            clearTimeout(timer);
                            try { resolve(JSON.parse(xhr.responseText)?.error ? false : true); }
                            catch(e) { resolve(false); }
                        };
                        xhr.onerror = function() { clearTimeout(timer); resolve(false); };
                        xhr.send(new URLSearchParams(data));

                    } catch(e) {
                        console.error('❌ Erro ao enviar:', e);
                        resolve(false);
                    }
                });
            };

            this.autoSendResources.start = function() {
                if (this._active) return;
                this._active = true;
                this.storage.save('asr_active', true);
                this._updateTitle();
                this.console.log(`[AutoSend] ✅ Iniciado! ${FROM} → ${TO} | ${AMOUNT} de cada | 20min`);
                this._tick();
                this._intervalId = setInterval(() => this._tick(), INTERVALO * 1000);
            };

            console.log('[MultBot] ✅ AutoSendResources personalizado com sucesso!');
        }

        this.settingsFactory = this._safeInit('SettingsWindow', () => new createGrepoWindow({
            id: 'MULT_BOT',
            title: 'MultBot',
            size: [845, 560],
            tabs: [
                {
                    title: multT('tab_status'),
                    id: 'status',
                    render: this.settingsStatus,
                },
                {
                    title: '🌾 Farm',
                    id: 'farm',
                    render: this.settingsFarm,
                },
                {
                    title: multT('tab_build'),
                    id: 'build',
                    render: this.settingsBuild,
                },
                {
                    title: multT('tab_train'),
                    id: 'train',
                    render: this.settingsTrain,
                },
                {
                    title: multT('tab_mix'),
                    id: 'mix',
                    render: this.settingsMix,
                },
                {
                    title: multT('tab_attack'),
                    id: 'attack',
                    render: this.settingsAttack,
                },
                {
                    title: '📤 Send Free',
                    id: 'send_free',
                    render: this.settingsSendFree,
                },
                {
                    title: '📋 Plano',
                    id: 'plano',
                    render: this.settingsPlano,
                },
                {
                    title: multT('tab_mult'),
                    id: 'mult',
                    render: this.settingsMult,
                },
                {
                    title: multT('tab_console'),
                    id: 'console',
                    render: this.console.renderSettings,
                },
            ],
            start_tab: 0,
        }));

        this.setup();

        // ⭐ Configura os eventos dos botões da aba Plano
        this._setupPlanoEvents();
    }

    _safeInit = (name, factory) => {
        try {
            return factory();
        } catch (e) {
            const msg = `[MultBot] ✗ Failed to initialize module "${name}": ${e?.message ?? e}`;
            console.error(msg, e);
            try {
                if (this.console && typeof this.console.log === 'function') this.console.log(msg);
            } catch (_) {}
            return null;
        }
    };

    _setupPlanoEvents() {
        var self = this;
        
        var observer = new MutationObserver(function() {
            var activateBtn = document.getElementById('attack-activate-btn');
            var refreshBtn = document.getElementById('attack-refresh-btn');
            var plannerBtn = document.getElementById('attack-planner-btn');
            var stopBtn = document.getElementById('attack-stop-btn');

            if (activateBtn && !activateBtn._listenerAdded) {
                activateBtn._listenerAdded = true;
                activateBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    if (self.autoAttackModule) {
                        self.autoAttackModule.start();
                    }
                });
            }

            if (refreshBtn && !refreshBtn._listenerAdded) {
                refreshBtn._listenerAdded = true;
                refreshBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    if (self.autoAttackModule) {
                        self.autoAttackModule.loadAttackQueue();
                        HumanMessage.success('Ataques atualizados!');
                    }
                });
            }

            if (plannerBtn && !plannerBtn._listenerAdded) {
                plannerBtn._listenerAdded = true;
                plannerBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    try {
                        AttackPlannerWindowFactory.openAttackPlannerWindow();
                    } catch(e) {
                        console.log('⚠️ Erro ao abrir planejador:', e.message);
                    }
                });
            }

            if (stopBtn && !stopBtn._listenerAdded) {
                stopBtn._listenerAdded = true;
                stopBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    if (self.autoAttackModule) {
                        self.autoAttackModule.stop();
                    }
                });
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    settingsStatus = () => {
        return this.statusPanel ? this.statusPanel.settings() : this._missingModuleHtml('Status');
    };

    // ⭐ ABA FARM - COM AUTO FARM
    settingsFarm = () => {
        var html = '';
        if (this.autoFarm) {
            html += '<div id="af-settings-container">';
            html += this.autoFarm.settings();
            html += '</div>';
            setTimeout(function() {
                if (window.multBot && window.multBot.autoFarm) {
                    window.multBot.autoFarm.bindSettingsEvents();
                }
            }, 100);
        } else {
            html += this._missingModuleHtml('Auto Farm');
        }
        return html;
    };

    settingsSendFree = () => {
        let html = '';
        html += this.autoSendResources ? this.autoSendResources.settings() : this._missingModuleHtml('Auto Send Resources');
        return html;
    };

    settingsBuild = () => {
        let html = '';
        html += this.autoGratis ? this.autoGratis.settings() : this._missingModuleHtml('Auto Gratis');
        html += this.autoBuild ? this.autoBuild.settings() : this._missingModuleHtml('Auto Build');
        return html;
    };

    settingsMix = () => {
        let html = '';
        html += this.autoBootcamp ? this.autoBootcamp.settings() : this._missingModuleHtml('Auto Bootcamp');
        html += this.autoParty ? this.autoParty.settings() : this._missingModuleHtml('Auto Party');
        html += this.autoHide ? this.autoHide.settings() : this._missingModuleHtml('Auto Hide');
        html += this.autoMilitia ? this.autoMilitia.settings() : this._missingModuleHtml('Auto Militia');
        html += this.autoQuest ? this.autoQuest.settings() : this._missingModuleHtml('Auto Quest');
        return html;
    };

    settingsAttack = () => {
        let html = '';
        html += this.autoAttack ? this.autoAttack.settings() : this._missingModuleHtml('Auto Dodge');
        return html;
    };

    settingsPlano = () => {
        return this.autoAttackModule ? this.autoAttackModule.settings() : this._missingModuleHtml('AutoAttack');
    };

    settingsTrain = () => {
        let html = '';
        html += this.autoTrain ? this.autoTrain.settings() : this._missingModuleHtml('Auto Train');
        return html;
    };

    settingsMult = () => {
        let html = '';
        html += this.multTools ? this.multTools.settings() : this._missingModuleHtml('Mult Tools');
        html += this.colonizeShipSender ? this.colonizeShipSender.settings() : this._missingModuleHtml('Colonize Ship Sender');
        html += this.autoResearch ? this.autoResearch.settings() : this._missingModuleHtml('Auto Research');
        html += this.autoAresSacrifice ? this.autoAresSacrifice.settings() : this._missingModuleHtml('Auto Ares Sacrifice');
        return html;
    };

    _missingModuleHtml = (name) => {
        return `<div class="game_border" style="margin-bottom:20px;">
            <div style="padding:8px;font-size:11px;color:#f87171;">
                ⚠ ${multT('module_failed', { name })}
            </div>
        </div>`;
    };

    setup = () => {
        if (this.settingsFactory) this.settingsFactory.activate();

        uw.$('.gods_area_buttons').append(`
            <div class='circle_button mult_bot_settings' onclick='window.multBot.settingsFactory.openWindow()'>
                <div style='width: 27px; height: 27px; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:bold; color:#ffffff; text-shadow:0 0 12px rgba(255,255,255,0.3), 0 0 25px rgba(255,255,255,0.1);' class='icon js-caption' title='MultBot'>
                    N
                </div>
            </div>
        `);

        const editController = () => {
            const townController = uw.layout_main_controller.sub_controllers.find(controller => controller.name === 'town_name_area');
            if (!townController) {
                setTimeout(editController, 2500);
                return;
            }

            const oldRender = townController.controller.town_groups_list_view.render;
            townController.controller.town_groups_list_view.render = function () {
                oldRender.call(this);
                const both = `<div style='position: absolute; display:flex; align-items:center; justify-content:center; font-size:13px; margin: 1px; position: absolute; height: 20px; width: 25px; right: 18px;' title='${multT('tooltip_build_and_train')}'>🔨🔧</div>`;
                const build = `<div style='display:flex; align-items:center; justify-content:center; font-size:14px; margin: 1px; position: absolute; height: 20px; width: 25px; right: 18px;' title='${multT('tooltip_build')}'>🔨</div>`;
                const troop = `<div style='display:flex; align-items:center; justify-content:center; font-size:14px; margin: 1px; position: absolute; height: 20px; width: 25px; right: 18px;' title='${multT('tooltip_train')}'>🔧</div>`;
                const townIds = uw.multBot.autoBuild ? Object.keys(uw.multBot.autoBuild.towns_buildings) : [];
                const troopsIds = uw.multBot.autoTrain ? uw.multBot.autoTrain.getActiveList().map(entry => entry.toString()) : [];
                uw.$('.town_group_town').each(function () {
                    const townId = parseInt(uw.$(this).attr('data-townid'));
                    const is_build = townIds.includes(townId.toString());
                    const id_troop = troopsIds.includes(townId.toString());
                    if (!id_troop && !is_build) return;
                    if (id_troop && !is_build) uw.$(this).prepend(troop);
                    else if (is_build && !id_troop) uw.$(this).prepend(build);
                    else uw.$(this).prepend(both);
                });
            };
        };

        setTimeout(editController, 2500);
    };

    createMultMenu = () => {
        const $menu = uw.$('<div id="mult_menu" class="toolbar_activities"></div>');
        $menu.css({
            'position': 'absolute',
            'top': '3px',
            'left': '400px',
            'z-index': '1000',
        });

        const $left = uw.$('<div class="left"></div>');
        const $middle = uw.$('<div class="middle"></div>');
        const $right = uw.$('<div class="right"></div>');

        $menu.append($left, $middle, $right);
        uw.$("#ui_box").prepend($menu);

        return $middle;
    }

};

if (!window.__multbot_loaded__) {
    window.__multbot_loaded__ = true;
    var _multbot_loader = setInterval(() => {
        if (uw.$("#loader").length > 0) return;
        uw.multBot = new MultBot();
        clearInterval(_multbot_loader);
    }, 100);
}
