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
// 📦 MÓDULO: AutoFarm (MODERNBOT CLONE)
// ═══════════════════════════════════════════════════════════════════════

class AutoFarm extends MultUtil {
    constructor(c, s) {
        super(c, s);

        // Load the settings
        this.timing = this.storage.load('af_timing', 300000);
        this.percent = this.storage.load('af_percent', 1);
        this.active = this.storage.load('af_active', false);
        this.gui = this.storage.load('af_gui', false);

        // Create the elements for the new menu
        const { $activity, $count } = this.createActivity("url(https://gpit.innogamescdn.com/images/game/premium_features/feature_icons_2.08.png) no-repeat 0 -240px");
        this.$activity = $activity;
        this.$count = $count;
        this.$activity.on('click', this.toggle.bind(this));

        this.createDropdown();
        this.updateButtons();

        this.timer = 0;
        this.lastTime = Date.now();
        this.polis_list = [];
        this._claimInProgress = false;
        this._settingsRendered = false;

        if (this.active) {
            this.active = setInterval(this.main.bind(this), 5000);
        }

        this.console.log('[AutoFarm] 🌾 ModernFarm carregado!');
        this.console.log('[AutoFarm] ⏱️ Intervalo: ' + (this.timing / 60000) + 'min');
        this.console.log('[AutoFarm] 📊 Armazenamento: ' + (this.percent * 100) + '%');
        this.console.log('[AutoFarm] 🖥️ GUI Mode: ' + (this.gui ? 'ON' : 'OFF'));
    }

    /* ============================================================
       CREATE DROPDOWN
       ============================================================ */
    createDropdown = () => {
        this.$content = uw.$("<div></div>");
        this.$title = uw.$("<p>🌾 Modern Farm</p>").css({ 
            "text-align": "center", 
            "margin": "2px", 
            "font-weight": "bold", 
            "font-size": "16px",
            "color": "#ffd700"
        });
        this.$content.append(this.$title);

        // ===== INTERVALO =====
        this.$duration = uw.$("<p>⏱️ Intervalo:</p>").css({ 
            "text-align": "left", 
            "margin": "5px 2px 2px", 
            "font-weight": "bold",
            "color": "#d4c5a0"
        });
        this.$button5 = this.createButton("modern_farm_5", "5 min", this.toggleDuration.bind(this));
        this.$button10 = this.createButton("modern_farm_10", "10 min", this.toggleDuration.bind(this));
        this.$button20 = this.createButton("modern_farm_20", "20 min", this.toggleDuration.bind(this));
        this.$content.append(this.$duration, this.$button5, this.$button10, this.$button20);

        // ===== ARMAZENAMENTO =====
        this.$storage = uw.$("<p>📊 Armazenamento:</p>").css({ 
            "text-align": "left", 
            "margin": "5px 2px 2px", 
            "font-weight": "bold",
            "color": "#d4c5a0"
        });
        this.$button80 = this.createButton("modern_farm_80", "80%", this.toggleStorage.bind(this)).css({ "width": "70px" });
        this.$button90 = this.createButton("modern_farm_90", "90%", this.toggleStorage.bind(this)).css({ "width": "80px" });
        this.$button100 = this.createButton("modern_farm_100", "100%", this.toggleStorage.bind(this)).css({ "width": "80px" });
        this.$content.append(this.$storage, this.$button80, this.$button90, this.$button100);

        // ===== GUI =====
        this.$guiLabel = uw.$("<p>🖥️ Modo GUI:</p>").css({ 
            "text-align": "left", 
            "margin": "5px 2px 2px", 
            "font-weight": "bold",
            "color": "#d4c5a0"
        });
        this.$guiOn = this.createButton("modern_farm_gui_on", "ON", this.toggleGui.bind(this));
        this.$guiOff = this.createButton("modern_farm_gui_off", "OFF", this.toggleGui.bind(this));
        this.$content.append(this.$guiLabel, this.$guiOn, this.$guiOff);

        // ===== STATUS =====
        this.$status = uw.$("<div></div>").css({
            "margin": "8px 0 4px",
            "padding": "6px 8px",
            "background": "rgba(0,0,0,0.3)",
            "border-radius": "4px",
            "font-size": "11px",
            "color": "#a89070",
            "display": "grid",
            "grid-template-columns": "1fr 1fr",
            "gap": "2px 10px"
        });
        this.$status.html(`
            <span>Status: <span id="af-status-text" style="color:#ffd700;">${this.active ? '✅ Ativo' : '⏸️ Parado'}</span></span>
            <span>Timer: <span id="af-timer-display" style="color:#ffd700;">--</span></span>
            <span>Fazendas: <span id="af-farms-count" style="color:#ffd700;">0</span></span>
            <span>Próxima: <span id="af-next-collect" style="color:#ffd700;">--</span></span>
        `);
        this.$content.append(this.$status);

        // ===== BOTÕES PRINCIPAIS =====
        var btnGroup = uw.$("<div></div>").css({
            "display": "flex",
            "gap": "5px",
            "margin": "6px 0"
        });
        this.$startBtn = this.createButton("modern_farm_start", "▶ Iniciar", this.toggle.bind(this));
        this.$startBtn.css({
            "flex": "1",
            "background": "linear-gradient(180deg, #4a7a3a 0%, #2d5a1d 100%)",
            "border-color": "#6a9a5a",
            "color": "#fff",
            "font-size": "13px",
            "padding": "8px 12px"
        });
        this.$stopBtn = this.createButton("modern_farm_stop", "⏹ Parar", this.toggle.bind(this));
        this.$stopBtn.css({
            "flex": "1",
            "background": "linear-gradient(180deg, #7a3a3a 0%, #5a2a2a 100%)",
            "border-color": "#9a5a5a",
            "color": "#fff",
            "font-size": "13px",
            "padding": "8px 12px"
        });
        btnGroup.append(this.$startBtn, this.$stopBtn);
        this.$content.append(btnGroup);

        // ===== LOG =====
        this.$log = uw.$("<div></div>").css({
            "max-height": "50px",
            "overflow-y": "auto",
            "background": "rgba(0,0,0,0.4)",
            "border-radius": "4px",
            "padding": "4px 8px",
            "font-size": "10px",
            "color": "#8a8a7a",
            "margin-top": "4px",
            "border": "1px solid #2a1a12"
        });
        this.$log.html('<div class="log-entry log-info">🔹 Sistema pronto</div>');
        this.$content.append(this.$log);

        // ===== POPUP =====
        this.$popup = this.createPopup(423, 320, 170, this.$content);
        this.dropdown_active = false;

        const close = () => {
            if (!this.dropdown_active) this.$popup.hide();
            this.dropdown_active = false;
        };

        const open = () => {
            if (this.dropdown_active) this.$popup.show();
        };

        this.$activity.on({
            mouseenter: () => {
                this.dropdown_active = true;
                setTimeout(open, 1000);
            },
            mouseleave: () => {
                this.dropdown_active = false;
                setTimeout(close, 50);
            }
        });

        this.$popup.on({
            mouseenter: () => {
                this.dropdown_active = true;
            },
            mouseleave: () => {
                this.dropdown_active = false;
                setTimeout(close, 50);
            }
        });

        this.updateDropdownUI();
    };

    createButton = (id, label, callback) => {
        return uw.$(`<button id="${id}" class="button_new" style="font-size:11px;padding:4px 10px;margin:2px;border-radius:4px;">${label}</button>`)
            .on('click', callback);
    };

    updateButtons = () => {
        this.$button5.removeClass('disabled');
        this.$button10.removeClass('disabled');
        this.$button20.removeClass('disabled');
        this.$button80.removeClass('disabled');
        this.$button90.removeClass('disabled');
        this.$button100.removeClass('disabled');

        if (this.timing == 300000) this.$button5.addClass('disabled');
        if (this.timing == 600000) this.$button10.addClass('disabled');
        if (this.timing == 1200000) this.$button20.addClass('disabled');

        if (this.percent == 0.8) this.$button80.addClass('disabled');
        if (this.percent == 0.9) this.$button90.addClass('disabled');
        if (this.percent == 1) this.$button100.addClass('disabled');

        this.$guiOn.removeClass('disabled');
        this.$guiOff.removeClass('disabled');
        if (this.gui) this.$guiOn.addClass('disabled');
        else this.$guiOff.addClass('disabled');

        if (this.active) {
            this.$startBtn.text('▶ Rodando...');
            this.$startBtn.css('opacity', '0.6');
            this.$stopBtn.css('display', 'inline-block');
        } else {
            this.$startBtn.text('▶ Iniciar');
            this.$startBtn.css('opacity', '1');
            this.$stopBtn.css('display', 'inline-block');
        }

        this.updateDropdownUI();
    };

    updateDropdownUI = () => {
        var statusText = this.$status.find('#af-status-text');
        if (statusText.length) {
            statusText.text(this.active ? '✅ Ativo' : '⏸️ Parado');
            statusText.css('color', this.active ? '#44ff88' : '#ff6b6b');
        }

        var timerDisplay = this.$status.find('#af-timer-display');
        if (timerDisplay.length) {
            var seconds = Math.max(0, Math.ceil(this.timer / 1000));
            var mins = Math.floor(seconds / 60);
            var secs = seconds % 60;
            timerDisplay.text(mins + 'min ' + secs + 's');
        }

        var farmsCount = this.$status.find('#af-farms-count');
        if (farmsCount.length) {
            farmsCount.text(this.polis_list?.length || 0);
        }

        var nextCollect = this.$status.find('#af-next-collect');
        if (nextCollect.length) {
            if (this.timer > 0) {
                nextCollect.text(Math.floor(this.timer/60000) + 'min ' + Math.floor((this.timer%60000)/1000) + 's');
            } else {
                nextCollect.text('Agora!');
            }
        }

        var isCaptainActive = false;
        try {
            isCaptainActive = $('.advisor_frame.captain div').hasClass('captain_active');
        } catch(e) {}
        this.$count.text(Math.round(Math.max(this.timer, 0) / 1000));
        this.$count.css('color', isCaptainActive ? "#1aff1a" : "yellow");
    };

    toggleDuration = (event) => {
        const { id } = event.currentTarget;
        if (id == "modern_farm_5") this.timing = 300000;
        if (id == "modern_farm_10") this.timing = 600000;
        if (id == "modern_farm_20") this.timing = 1200000;
        this.storage.save('af_timing', this.timing);
        this.updateButtons();
        this.console.log('[AutoFarm] ⏱️ Intervalo: ' + (this.timing / 60000) + 'min');
        this.log('⏱️ Intervalo: ' + (this.timing / 60000) + 'min', 'info');
        if (this._settingsRendered) this.renderSettings();
    };

    toggleStorage = (event) => {
        const { id } = event.currentTarget;
        if (id == "modern_farm_80") this.percent = 0.8;
        if (id == "modern_farm_90") this.percent = 0.9;
        if (id == "modern_farm_100") this.percent = 1;
        this.storage.save('af_percent', this.percent);
        this.updateButtons();
        this.console.log('[AutoFarm] 📊 Armazenamento: ' + (this.percent * 100) + '%');
        this.log('📊 Armazenamento: ' + (this.percent * 100) + '%', 'info');
        if (this._settingsRendered) this.renderSettings();
    };

    toggleGui = (event) => {
        const { id } = event.currentTarget;
        if (id == "modern_farm_gui_on") this.gui = true;
        if (id == "modern_farm_gui_off") this.gui = false;
        this.storage.save('af_gui', this.gui);
        this.updateButtons();
        this.console.log('[AutoFarm] 🖥️ GUI Mode: ' + (this.gui ? 'ON' : 'OFF'));
        this.log('🖥️ GUI Mode: ' + (this.gui ? 'ON' : 'OFF'), 'info');
        if (this._settingsRendered) this.renderSettings();
    };

    toggle = () => {
        if (this.active) {
            clearInterval(this.active);
            this.active = null;
            this.console.log('[AutoFarm] ⏹️ AutoFarm parado');
            this.log('⏹️ AutoFarm parado', 'warning');
            this.updateButtons();
            this.storage.save('af_active', false);
        } else {
            this.updateTimer();
            this.active = setInterval(this.main.bind(this), 5000);
            this.console.log('[AutoFarm] 🚀 AutoFarm iniciado!');
            this.log('🚀 AutoFarm iniciado!', 'success');
            this.storage.save('af_active', true);
        }
        this.updateButtons();
        this.updateDropdownUI();
        if (this._settingsRendered) this.renderSettings();
    };

    generateList = () => {
        const islands_list = new Set();
        const polis_list = [];
        let minResource = 0;
        let min_percent = 0;

        const { models: towns } = uw.MM.getOnlyCollectionByName('Town');

        for (const town of towns) {
            const { on_small_island, island_id, id } = town.attributes;
            if (on_small_island || islands_list.has(island_id)) continue;

            const { wood, stone, iron, storage } = uw.ITowns.getTown(id).resources();
            minResource = Math.min(wood, stone, iron);
            min_percent = storage > 0 ? minResource / storage : 0;

            if (min_percent < this.percent) continue;

            islands_list.add(island_id);
            polis_list.push(id);
        }

        return polis_list;
    };

    getNextCollection = () => {
        const collection = uw.MM.getOnlyCollectionByName('FarmTownPlayerRelation');
        const models = collection?.models ?? [];
        if (models.length === 0) return 0;

        const lootCounts = {};
        for (const model of models) {
            const { lootable_at } = model.attributes;
            lootCounts[lootable_at] = (lootCounts[lootable_at] || 0) + 1;
        }

        let maxLootableTime = 0;
        let maxValue = 0;
        for (const lootableTime in lootCounts) {
            const value = lootCounts[lootableTime];
            if (value < maxValue) continue;
            maxLootableTime = parseInt(lootableTime);
            maxValue = value;
        }

        const seconds = maxLootableTime - Math.floor(Date.now() / 1000);
        return seconds > 0 ? seconds * 1000 : 0;
    };

    updateTimer = () => {
        const currentTime = Date.now();
        this.timer -= currentTime - this.lastTime;
        this.lastTime = currentTime;

        const isCaptainActive = uw.GameDataPremium.isAdvisorActivated('captain');
        this.$count.text(Math.round(Math.max(this.timer, 0) / 1000));
        this.$count.css('color', isCaptainActive ? "#1aff1a" : "yellow");
        this.updateDropdownUI();
    };

    claim = async () => {
        if (this._claimInProgress) {
            this.console.log('[AutoFarm] ⏳ Coleta já em progresso...');
            return;
        }

        this._claimInProgress = true;
        const isCaptainActive = uw.GameDataPremium.isAdvisorActivated('captain');
        this.polis_list = this.generateList();

        try {
            if (isCaptainActive && !this.gui) {
                try {
                    await this.fakeOpening();
                    await this.sleep(Math.random() * 2000 + 1000);
                    await this.fakeSelectAll();
                    await this.sleep(Math.random() * 2000 + 1000);
                    if (this.timing <= 600000) {
                        await this.claimMultiple(300, 600);
                    } else {
                        await this.claimMultiple(1200, 2400);
                    }
                    await this.fakeUpdate();
                    setTimeout(() => {
                        try { uw.WMap.removeFarmTownLootCooldownIconAndRefreshLootTimers(); } catch(e) {}
                    }, 2000);
                    this._claimInProgress = false;
                    return;
                } catch (e) {
                    this.console.log('[AutoFarm] Captain path failed: ' + (e?.message ?? e));
                }
            }

            if (isCaptainActive && this.gui) {
                try {
                    await this.fakeGuiUpdate();
                    this._claimInProgress = false;
                    return;
                } catch (e) {
                    this.console.log('[AutoFarm] Captain GUI path failed: ' + (e?.message ?? e));
                }
            }

            await this.claimOneByOne();
            this._claimInProgress = false;

        } catch (e) {
            this.console.log('[AutoFarm] Erro no claim: ' + (e?.message ?? e));
            this._claimInProgress = false;
        }
    };

    claimOneByOne = async () => {
        let max = 60;
        const { models: player_relation_models } = uw.MM.getOnlyCollectionByName('FarmTownPlayerRelation');
        const { models: farm_town_models } = uw.MM.getOnlyCollectionByName('FarmTown');
        const now = Math.floor(Date.now() / 1000);
        
        for (let town_id of this.polis_list) {
            let town = uw.ITowns.towns[town_id];
            let x = town.getIslandCoordinateX();
            let y = town.getIslandCoordinateY();

            for (let farm_town of farm_town_models) {
                if (farm_town.attributes.island_x != x) continue;
                if (farm_town.attributes.island_y != y) continue;

                for (let relation of player_relation_models) {
                    if (farm_town.attributes.id != relation.attributes.farm_town_id) continue;
                    if (relation.attributes.relation_status !== 1) continue;
                    if (relation.attributes.lootable_at !== null && now < relation.attributes.lootable_at) continue;

                    await this.claimSingle(town_id, relation.attributes.farm_town_id, relation.id, Math.ceil(this.timing / 600000));
                    await this.sleep(500);
                    if (!max) return;
                    max -= 1;
                }
            }
        }

        setTimeout(() => {
            try { uw.WMap.removeFarmTownLootCooldownIconAndRefreshLootTimers(); } catch(e) {}
        }, 2000);
    };

    claimSingle = async (town_id, farm_town_id, relation_id, option = 1) => {
        const data = {
            model_url: `FarmTownPlayerRelation/${relation_id}`,
            action_name: 'claim',
            arguments: {
                farm_town_id: farm_town_id,
                type: 'resources',
                option: option,
            },
            town_id: town_id,
            nl_init: true
        };
        try {
            await this.ajaxPostWithTimeout('frontend_bridge', 'execute', data);
        } catch (e) {
            this.console.log('[AutoFarm] Erro ao coletar rural: ' + (e?.message ?? e));
        }
    };

    claimMultiple = async (base = 300, boost = 600) => {
        const data = {
            towns: this.polis_list,
            time_option_base: base,
            time_option_booty: boost,
            claim_factor: 'normal',
            town_id: uw.ITowns.getCurrentTown().id,
            nl_init: true,
        };
        try {
            await this.ajaxPostWithTimeout('farm_town_overviews', 'claim_loads_multiple', data, 45000);
        } catch (e) {
            this.console.log('[AutoFarm] Erro em claimMultiple: ' + (e?.message ?? e));
            throw e;
        }
    };

    fakeOpening = async () => {
        try {
            const town_id = uw.ITowns.getCurrentTown().id;
            await this.ajaxGetWithTimeout('farm_town_overviews', 'index', { 
                town_id: town_id, 
                nl_init: true 
            });
            await this.sleep(10);
            await this.fakeUpdate();
        } catch (e) {
            this.console.log('[AutoFarm] Erro em fakeOpening: ' + (e?.message ?? e));
            throw e;
        }
    };

    fakeSelectAll = async () => {
        const data = {
            town_ids: this.polis_list,
            town_id: uw.ITowns.getCurrentTown().id,
            nl_init: true,
        };
        try {
            await this.ajaxGetWithTimeout('farm_town_overviews', 'get_farm_towns_from_multiple_towns', data);
        } catch (e) {
            this.console.log('[AutoFarm] Erro em fakeSelectAll: ' + (e?.message ?? e));
            throw e;
        }
    };

    fakeUpdate = async () => {
        const town = uw.ITowns.getCurrentTown();
        const { attributes: booty } = town.getResearches();
        const { attributes: trade_office } = town.getBuildings();
        const data = {
            island_x: town.getIslandCoordinateX(),
            island_y: town.getIslandCoordinateY(),
            current_town_id: town.id,
            booty_researched: booty ? 1 : 0,
            diplomacy_researched: '',
            trade_office: trade_office ? 1 : 0,
            town_id: town.id,
            nl_init: true,
        };
        try {
            await this.ajaxGetWithTimeout('farm_town_overviews', 'get_farm_towns_for_town', data);
        } catch (e) {
            this.console.log('[AutoFarm] Erro em fakeUpdate: ' + (e?.message ?? e));
            throw e;
        }
    };

    fakeGuiUpdate = () =>
        new Promise(async (myResolve, myReject) => {
            try {
                uw.$(".toolbar_button.premium .icon").trigger('mouseenter');
                await this.sleep(1019.39, 127.54);
                uw.$(".farm_town_overview a").trigger('click');
                await this.sleep(1156.65, 165.62);
                uw.$(".checkbox.select_all").trigger("click");
                await this.sleep(1036.20, 135.69);
                uw.$("#fto_claim_button").trigger("click");
                await this.sleep(1036.20, 135.69);
                const el = uw.$(".confirmation .btn_confirm.button_new");
                if (el.length) {
                    el.trigger("click");
                    await this.sleep(1036.20, 135.69);
                }
                uw.$(".icon_right.icon_type_speed.ui-dialog-titlebar-close").trigger("click");
                myResolve();
            } catch (e) {
                this.console.log('[AutoFarm] Erro em fakeGuiUpdate: ' + (e?.message ?? e));
                myReject(e);
            }
        });

    getTotalResources = () => {
        const polis_list = this.generateList();
        let total = { wood: 0, stone: 0, iron: 0, storage: 0 };
        for (let town_id of polis_list) {
            const town = uw.ITowns.getTown(town_id);
            const { wood, stone, iron, storage } = town.resources();
            total.wood += wood;
            total.stone += stone;
            total.iron += iron;
            total.storage += storage;
        }
        return total;
    };

    main = async () => {
        if (window.__multbot_captcha_active) return;
        try {
            const next_collection = this.getNextCollection();
            if (next_collection && (this.timer > next_collection + 60 * 1000 || this.timer < next_collection)) {
                this.timer = next_collection + Math.floor(Math.random() * 20000) + 10000;
            }

            if (this.timer < 1) {
                this.polis_list = this.generateList();
                clearInterval(this.active);
                this.active = null;

                await this.claim();
                this.active = setInterval(this.main.bind(this), 5000);

                const rand = Math.floor(Math.random() * 20000) + 10000;
                this.timer = this.timing + rand;
                if (this.timer < next_collection) this.timer = next_collection + rand;
            }

            this.updateTimer();
        } catch (e) {
            this.console.log('[AutoFarm] Erro no main(): ' + (e?.message ?? e));
            if (!this.active) this.active = setInterval(this.main.bind(this), 5000);
        }
    };

    sleep = (ms, stdDev) => {
        if (typeof stdDev === 'undefined') {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        const mean = ms;
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        num = num * stdDev + mean;
        return new Promise(resolve => setTimeout(resolve, num));
    };

    log = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        const $log = this.$log;
        const $entry = uw.$(`<div class="log-entry log-${type}">[${timestamp}] ${message}</div>`);
        $entry.css({
            'color': type === 'success' ? '#8bc34a' : 
                     type === 'error' ? '#ef5350' : 
                     type === 'warning' ? '#ffb74d' : '#64b5f6'
        });
        $log.prepend($entry);
        while ($log.children().length > 20) {
            $log.children().last().remove();
        }
    };

    /* ============================================================
       SETTINGS PARA A ABA FARM
       ============================================================ */
    settings = () => {
        this._settingsRendered = true;
        var isActive = this.active;
        var seconds = Math.max(0, Math.ceil(this.timer / 1000));
        var mins = Math.floor(seconds / 60);
        var secs = seconds % 60;
        var timerStr = mins + 'm ' + secs + 's';

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
            <div class="game_header bold" style="color:#d4a017;font-size:14px;padding:8px 12px;background:linear-gradient(135deg,#2a1f0e,#1a1208);border-bottom:2px solid #8B6914;">
                🌾 AutoFarm <span style="font-size:10px;color:#c8a86e;font-weight:normal;">(ModernBot Clone)</span>
            </div>
            <div style="padding:10px 12px;">
                <!-- Status -->
                <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #2a1f0e;margin-bottom:8px;">
                    <span style="color:#c8a86e;font-weight:bold;">📌 Estado:</span>
                    <span id="af-status-text-settings" style="color:${isActive ? '#44ff88' : '#ff6b6b'};">${isActive ? '🟢 Executando' : '⏸️ Parado'}</span>
                    <span style="color:#ffd700;font-family:monospace;">${timerStr}</span>
                </div>

                <!-- Intervalo -->
                <div style="padding:5px 0;">
                    <span style="color:#d4a017;font-weight:bold;">⏱️ Intervalo:</span>
                    <div style="display:flex;gap:6px;padding:5px 0;flex-wrap:wrap;">
                        <button class="button_new af-btn-settings" data-value="300000" style="font-size:11px;padding:3px 12px;${this.timing === 300000 ? 'background:linear-gradient(135deg,#2d5a1e,#3d7a2e);border-color:#44ff88;color:#44ff88;' : ''}">5 min</button>
                        <button class="button_new af-btn-settings" data-value="600000" style="font-size:11px;padding:3px 12px;${this.timing === 600000 ? 'background:linear-gradient(135deg,#2d5a1e,#3d7a2e);border-color:#44ff88;color:#44ff88;' : ''}">10 min</button>
                        <button class="button_new af-btn-settings" data-value="1200000" style="font-size:11px;padding:3px 12px;${this.timing === 1200000 ? 'background:linear-gradient(135deg,#2d5a1e,#3d7a2e);border-color:#44ff88;color:#44ff88;' : ''}">20 min</button>
                    </div>
                </div>

                <!-- Armazenamento -->
                <div style="padding:5px 0;">
                    <span style="color:#d4a017;font-weight:bold;">📊 Armazenamento:</span>
                    <div style="display:flex;gap:6px;padding:5px 0;flex-wrap:wrap;">
                        <button class="button_new af-btn-settings" data-value="0.8" style="font-size:11px;padding:3px 12px;${this.percent === 0.8 ? 'background:linear-gradient(135deg,#2d5a1e,#3d7a2e);border-color:#44ff88;color:#44ff88;' : ''}">80%</button>
                        <button class="button_new af-btn-settings" data-value="0.9" style="font-size:11px;padding:3px 12px;${this.percent === 0.9 ? 'background:linear-gradient(135deg,#2d5a1e,#3d7a2e);border-color:#44ff88;color:#44ff88;' : ''}">90%</button>
                        <button class="button_new af-btn-settings" data-value="1" style="font-size:11px;padding:3px 12px;${this.percent === 1 ? 'background:linear-gradient(135deg,#2d5a1e,#3d7a2e);border-color:#44ff88;color:#44ff88;' : ''}">100%</button>
                    </div>
                </div>

                <!-- GUI -->
                <div style="padding:5px 0;">
                    <span style="color:#d4a017;font-weight:bold;">🖥️ Modo GUI:</span>
                    <div style="display:flex;gap:6px;padding:5px 0;flex-wrap:wrap;">
                        <button class="button_new af-btn-settings" data-value="true" style="font-size:11px;padding:3px 12px;${this.gui ? 'background:linear-gradient(135deg,#2d5a1e,#3d7a2e);border-color:#44ff88;color:#44ff88;' : ''}">ON</button>
                        <button class="button_new af-btn-settings" data-value="false" style="font-size:11px;padding:3px 12px;${!this.gui ? 'background:linear-gradient(135deg,#2d5a1e,#3d7a2e);border-color:#44ff88;color:#44ff88;' : ''}">OFF</button>
                    </div>
                </div>

                <!-- Botões Principais -->
                <div style="display:flex;gap:6px;padding:10px 0;border-top:1px solid #2a1f0e;margin-top:5px;">
                    <button class="button_new" id="af-btn-start-settings" style="flex:1;background:linear-gradient(180deg,#4a7a3a,#2d5a1d);border-color:#6a9a5a;color:#fff;font-weight:bold;padding:8px 12px;">
                        ${isActive ? '🔄 Executando...' : '▶️ Iniciar Farm'}
                    </button>
                    <button class="button_new" id="af-btn-stop-settings" style="flex:1;background:linear-gradient(180deg,#7a3a3a,#5a2a2a);border-color:#9a5a5a;color:#fff;font-weight:bold;padding:8px 12px;">
                        ⏹️ Parar
                    </button>
                </div>

                <!-- Stats -->
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 10px;padding:5px 0;background:rgba(0,0,0,0.2);border-radius:4px;padding:8px 10px;font-size:11px;color:#a89070;">
                    <span>Fazendas: <span style="color:#ffd700;">${this.polis_list?.length || 0}</span></span>
                    <span>Próxima coleta: <span style="color:#ffd700;">${this.timer > 0 ? Math.floor(this.timer/60000) + 'min ' + Math.floor((this.timer%60000)/1000) + 's' : 'Agora!'}</span></span>
                    <span>Intervalo: <span style="color:#ffd700;">${this.timing/60000}min</span></span>
                    <span>Armazenamento: <span style="color:#ffd700;">${this.percent*100}%</span></span>
                </div>

                <div style="font-size:10px;color:#555;padding-top:8px;border-top:1px solid #1a1208;margin-top:5px;text-align:center;">
                    ⚡ Premium Captain recomendado | 1 cidade por ilha
                </div>
            </div>
        </div>`;
    };

    /* ============================================================
       RENDER SETTINGS - Recarrega o painel
       ============================================================ */
    renderSettings = () => {
        var container = document.getElementById('af-settings-container');
        if (container) {
            container.innerHTML = this.settings();
            this.bindSettingsEvents();
        }
    };

    /* ============================================================
       BIND SETTINGS EVENTS
       ============================================================ */
    bindSettingsEvents = () => {
        var self = this;

        // Botões de configuração
        document.querySelectorAll('.af-btn-settings').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                var value = this.getAttribute('data-value');
                var text = this.textContent.trim();

                if (text.includes('min')) {
                    self.timing = parseInt(value);
                    self.storage.save('af_timing', self.timing);
                    self.console.log('[AutoFarm] ⏱️ Intervalo: ' + (self.timing / 60000) + 'min');
                    self.log('⏱️ Intervalo: ' + (self.timing / 60000) + 'min', 'info');
                } else if (text.includes('%')) {
                    self.percent = parseFloat(value);
                    self.storage.save('af_percent', self.percent);
                    self.console.log('[AutoFarm] 📊 Armazenamento: ' + (self.percent * 100) + '%');
                    self.log('📊 Armazenamento: ' + (self.percent * 100) + '%', 'info');
                } else if (text === 'ON' || text === 'OFF') {
                    self.gui = value === 'true';
                    self.storage.save('af_gui', self.gui);
                    self.console.log('[AutoFarm] 🖥️ GUI Mode: ' + (self.gui ? 'ON' : 'OFF'));
                    self.log('🖥️ GUI Mode: ' + (self.gui ? 'ON' : 'OFF'), 'info');
                }
                self.updateButtons();
                self.renderSettings();
            });
        });

        // Botão Iniciar
        document.getElementById('af-btn-start-settings')?.addEventListener('click', function(e) {
            e.preventDefault();
            if (self.active) {
                clearInterval(self.active);
                self.active = null;
                self.storage.save('af_active', false);
                self.console.log('[AutoFarm] ⏹️ AutoFarm parado');
                self.log('⏹️ AutoFarm parado', 'warning');
            } else {
                self.updateTimer();
                self.active = setInterval(self.main.bind(self), 5000);
                self.storage.save('af_active', true);
                self.console.log('[AutoFarm] 🚀 AutoFarm iniciado!');
                self.log('🚀 AutoFarm iniciado!', 'success');
            }
            self.updateButtons();
            self.renderSettings();
        });

        // Botão Parar
        document.getElementById('af-btn-stop-settings')?.addEventListener('click', function(e) {
            e.preventDefault();
            if (self.active) {
                clearInterval(self.active);
                self.active = null;
                self.storage.save('af_active', false);
                self.console.log('[AutoFarm] ⏹️ AutoFarm parado');
                self.log('⏹️ AutoFarm parado', 'warning');
                self.updateButtons();
                self.renderSettings();
            }
        });
    };
}

// ═══════════════════════════════════════════════════════════════════════
// 📦 MULTBOT - COM AUTO FARM NA ABA FARM
// ═══════════════════════════════════════════════════════════════════════

var MultBot = class {
    constructor() {
        this.console = new BotConsole();
        this.storage = new MultStorage();

        this.$ui = uw.$("#ui_box");
        this.$menu = this.createMultMenu();
        const $divider = uw.$('<div class="divider"></div>');

        // ⭐ AUTO FARM - Inicializado primeiro
        this.autoFarm = this._safeInit('AutoFarm', () => new AutoFarm(this.console, this.storage));
        if (this.autoFarm) {
            this.$menu.append(this.autoFarm.$activity);
            this.$ui.append(this.autoFarm.$popup);
        }

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
            // Cria um container com ID para atualização
            html += '<div id="af-settings-container">';
            html += this.autoFarm.settings();
            html += '</div>';
            // Liga os eventos após renderizar
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
