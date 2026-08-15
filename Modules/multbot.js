// ═══════════════════════════════════════════════════════════════════════
// 📦 MÓDULO: AutoSendResources (VERSÃO COMPLETA COM UI)
// ═══════════════════════════════════════════════════════════════════════

var AutoSendResources = class {
    constructor(console, storage) {
        this.console = console;
        this.storage = storage;
        this._active = false;
        this._intervalId = null;
        this._isSending = false;
        
        // Carrega configurações salvas
        this._loadSettings();
        
        // Inicia o loop se estava ativo
        if (this._active) {
            this._startLoop();
        }
    }

    _loadSettings() {
        this.fromId = parseInt(this.storage.load('asr_from_id')) || 0;
        this.toId = parseInt(this.storage.load('asr_to_id')) || 0;
        this.amount = parseInt(this.storage.load('asr_amount')) || 100;
        this.interval = parseInt(this.storage.load('asr_interval')) || 20; // minutos
        this._active = this.storage.load('asr_active') === 'true';
    }

    _saveSettings() {
        this.storage.save('asr_from_id', this.fromId.toString());
        this.storage.save('asr_to_id', this.toId.toString());
        this.storage.save('asr_amount', this.amount.toString());
        this.storage.save('asr_interval', this.interval.toString());
        this.storage.save('asr_active', this._active ? 'true' : 'false');
    }

    _startLoop() {
        if (this._intervalId) clearInterval(this._intervalId);
        this._tick();
        const intervalMs = this.interval * 60 * 1000;
        this._intervalId = setInterval(() => this._tick(), intervalMs);
        this.console.log(`[AutoSend] ✅ Iniciado! ${this.fromId} → ${this.toId} | ${this.amount} de cada | ${this.interval}min`);
    }

    async _tick() {
        if (this._isSending) return;
        this._isSending = true;

        const logEl = uw.$('#asr_log');
        const timestampEl = uw.$('#asr_timestamp');
        const horaAtual = new Date().toLocaleTimeString();

        if (timestampEl.length) {
            timestampEl.text(horaAtual);
        }

        try {
            if (typeof ITowns === 'undefined' || !ITowns.towns || Object.keys(ITowns.towns).length === 0) {
                if (logEl.length) {
                    logEl.text('⏳ Aguardando jogo...');
                    logEl.css('color', '#ffff00');
                }
                this._isSending = false;
                return;
            }

            const from = ITowns.towns[this.fromId];
            const to = ITowns.towns[this.toId];

            if (!from || !to) {
                if (logEl.length) {
                    logEl.text(`❌ Cidade ${this.fromId} ou ${this.toId} não existe!`);
                    logEl.css('color', '#ff0000');
                }
                this._isSending = false;
                return;
            }

            const res = from.resources();
            const capacity = from.getAvailableTradeCapacity();

            if (res.wood < this.amount || res.stone < this.amount || res.iron < this.amount) {
                if (logEl.length) {
                    logEl.text(`${horaAtual} ⏸ 🪵${Math.floor(res.wood)} 🪨${Math.floor(res.stone)} ⚙${Math.floor(res.iron)}`);
                    logEl.css('color', '#ffff00');
                }
                this._isSending = false;
                return;
            }

            if (capacity < this.amount * 3) {
                if (logEl.length) {
                    logEl.text(`${horaAtual} ⏸ Cap: ${capacity}`);
                    logEl.css('color', '#ffff00');
                }
                this._isSending = false;
                return;
            }

            if (logEl.length) {
                logEl.text(`${horaAtual} ⏳ Enviando ${this.amount} de cada...`);
                logEl.css('color', '#ffff00');
            }

            const resultado = await this._sendResources(this.fromId, this.toId, this.amount);

            if (resultado) {
                if (logEl.length) {
                    logEl.text(`${horaAtual} ✅ ${this.amount} de cada enviado!`);
                    logEl.css('color', '#00ff00');
                }
                this.console.log(`[AutoSend] ✅ ${this.amount} de cada → ${to.getName()}`);
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

        this._isSending = false;
    }

    _sendResources(fromId, toId, amount) {
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
    }

    _getTownsList() {
        if (typeof ITowns === 'undefined' || !ITowns.towns) return [];
        return Object.values(ITowns.towns).map(town => ({
            id: town.id,
            name: town.getName(),
            resources: town.resources ? town.resources() : null
        }));
    }

    _updateUI() {
        const fromSelect = uw.$('#asr_from_select');
        const toSelect = uw.$('#asr_to_select');
        const fromInput = uw.$('#asr_from_input');
        const toInput = uw.$('#asr_to_input');
        const amountInput = uw.$('#asr_amount_input');
        const intervalInput = uw.$('#asr_interval_input');
        const btnToggle = uw.$('#asr_toggle_btn');

        if (fromSelect.length && fromInput.length) {
            fromSelect.val(this.fromId);
            fromInput.val(this.fromId);
        }
        if (toSelect.length && toInput.length) {
            toSelect.val(this.toId);
            toInput.val(this.toId);
        }
        if (amountInput.length) amountInput.val(this.amount);
        if (intervalInput.length) intervalInput.val(this.interval);
        if (btnToggle.length) {
            btnToggle.text(this._active ? '⏹️ Parar' : '▶️ Iniciar');
            btnToggle.css('background', this._active ? 'linear-gradient(135deg, #5a1e1e, #3a0a0a)' : 'linear-gradient(135deg, #2d5a1e, #1a3a0a)');
            btnToggle.css('border-color', this._active ? '#ff4444' : '#44ff88');
            btnToggle.css('color', this._active ? '#ff4444' : '#44ff88');
        }
    }

    settings() {
        const towns = this._getTownsList();
        const optionsHtml = towns.map(t => 
            `<option value="${t.id}">${t.id} - ${t.name}</option>`
        ).join('');

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
                📤 Envio Automático de Recursos
            </div>
            <div style="padding:12px;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                    <div>
                        <label style="color:#c8a86e; font-size:12px; display:block; margin-bottom:4px;">📤 De (Origem)</label>
                        <div style="display:flex; gap:6px;">
                            <select id="asr_from_select" style="flex:1; background:#2a1a0a; color:#c8a86e; border:1px solid #8B6914; border-radius:4px; padding:4px 6px; font-size:12px;">
                                <option value="0">Selecione</option>
                                ${optionsHtml}
                            </select>
                            <input type="number" id="asr_from_input" placeholder="ID" style="width:70px; background:#2a1a0a; color:#c8a86e; border:1px solid #8B6914; border-radius:4px; padding:4px 6px; font-size:12px; text-align:center;">
                        </div>
                    </div>
                    <div>
                        <label style="color:#c8a86e; font-size:12px; display:block; margin-bottom:4px;">📥 Para (Destino)</label>
                        <div style="display:flex; gap:6px;">
                            <select id="asr_to_select" style="flex:1; background:#2a1a0a; color:#c8a86e; border:1px solid #8B6914; border-radius:4px; padding:4px 6px; font-size:12px;">
                                <option value="0">Selecione</option>
                                ${optionsHtml}
                            </select>
                            <input type="number" id="asr_to_input" placeholder="ID" style="width:70px; background:#2a1a0a; color:#c8a86e; border:1px solid #8B6914; border-radius:4px; padding:4px 6px; font-size:12px; text-align:center;">
                        </div>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                    <div>
                        <label style="color:#c8a86e; font-size:12px; display:block; margin-bottom:4px;">📦 Quantidade (cada recurso)</label>
                        <input type="number" id="asr_amount_input" value="${this.amount}" min="1" style="width:100%; background:#2a1a0a; color:#c8a86e; border:1px solid #8B6914; border-radius:4px; padding:4px 6px; font-size:12px;">
                    </div>
                    <div>
                        <label style="color:#c8a86e; font-size:12px; display:block; margin-bottom:4px;">⏱ Intervalo (minutos)</label>
                        <input type="number" id="asr_interval_input" value="${this.interval}" min="1" style="width:100%; background:#2a1a0a; color:#c8a86e; border:1px solid #8B6914; border-radius:4px; padding:4px 6px; font-size:12px;">
                    </div>
                </div>
                <div style="display:flex; gap:8px; margin-bottom:12px;">
                    <a href="#" id="asr_toggle_btn" class="attack-btn" style="flex:1; text-align:center; padding:8px; background:${this._active ? 'linear-gradient(135deg, #5a1e1e, #3a0a0a)' : 'linear-gradient(135deg, #2d5a1e, #1a3a0a)'}; border-color:${this._active ? '#ff4444' : '#44ff88'}; color:${this._active ? '#ff4444' : '#44ff88'};">
                        ${this._active ? '⏹️ Parar' : '▶️ Iniciar'}
                    </a>
                    <a href="#" id="asr_apply_btn" class="attack-btn" style="flex:0 0 auto; padding:8px 16px; background:linear-gradient(135deg, #3a2510, #2a1a0a); border-color:#8B6914; color:#c8a86e;">
                        ✅ Aplicar
                    </a>
                </div>
                <div id="asr_log" style="padding:6px 10px; font-size:12px; color:#2c1810; min-height:20px; font-weight:bold; background:rgba(20,12,5,0.3); border-radius:4px; border:1px solid #2a1a0a;">
                    ${this._active ? '🟢 Ativo' : '⏸ Parado'}
                </div>
                <div style="padding:4px 10px 0; font-size:10px; color:#888; border-top:1px solid #2a1a0a; margin-top:6px;">
                    ⏱ Última verificação: <span id="asr_timestamp">${this._active ? 'Aguardando...' : 'N/A'}</span>
                </div>
            </div>
        </div>`;
    }

    _bindEvents() {
        const self = this;

        // Sincroniza select com input (Origem)
        uw.$('#asr_from_select').off('change').on('change', function() {
            const val = parseInt(this.value);
            if (val > 0) {
                uw.$('#asr_from_input').val(val);
                self.fromId = val;
            }
        });

        uw.$('#asr_from_input').off('change').on('change', function() {
            const val = parseInt(this.value);
            if (val > 0) {
                uw.$('#asr_from_select').val(val);
                self.fromId = val;
            }
        });

        // Sincroniza select com input (Destino)
        uw.$('#asr_to_select').off('change').on('change', function() {
            const val = parseInt(this.value);
            if (val > 0) {
                uw.$('#asr_to_input').val(val);
                self.toId = val;
            }
        });

        uw.$('#asr_to_input').off('change').on('change', function() {
            const val = parseInt(this.value);
            if (val > 0) {
                uw.$('#asr_to_select').val(val);
                self.toId = val;
            }
        });

        // Botão Aplicar
        uw.$('#asr_apply_btn').off('click').on('click', function(e) {
            e.preventDefault();
            
            const fromVal = parseInt(uw.$('#asr_from_input').val());
            const toVal = parseInt(uw.$('#asr_to_input').val());
            const amountVal = parseInt(uw.$('#asr_amount_input').val());
            const intervalVal = parseInt(uw.$('#asr_interval_input').val());

            if (!fromVal || !toVal) {
                HumanMessage.error('❌ Selecione as cidades de origem e destino!');
                return;
            }

            if (fromVal === toVal) {
                HumanMessage.error('❌ Origem e destino não podem ser iguais!');
                return;
            }

            if (amountVal < 1) {
                HumanMessage.error('❌ Quantidade deve ser maior que 0!');
                return;
            }

            if (intervalVal < 1) {
                HumanMessage.error('❌ Intervalo deve ser maior que 0 minutos!');
                return;
            }

            self.fromId = fromVal;
            self.toId = toVal;
            self.amount = amountVal;
            self.interval = intervalVal;
            self._saveSettings();

            // Se estava ativo, reinicia com novas configurações
            if (self._active) {
                self.stop();
                self.start();
            }

            HumanMessage.success(`✅ Configurações salvas! ${self.fromId} → ${self.toId} | ${self.amount} de cada | ${self.interval}min`);
            self.console.log(`[AutoSend] ✅ Configurações atualizadas: ${self.fromId} → ${self.toId} | ${self.amount} de cada | ${self.interval}min`);
            self._updateUI();
        });

        // Botão Iniciar/Parar
        uw.$('#asr_toggle_btn').off('click').on('click', function(e) {
            e.preventDefault();
            if (self._active) {
                self.stop();
            } else {
                // Verifica se as cidades estão configuradas
                if (!self.fromId || !self.toId) {
                    HumanMessage.error('❌ Configure as cidades de origem e destino primeiro!');
                    return;
                }
                if (self.fromId === self.toId) {
                    HumanMessage.error('❌ Origem e destino não podem ser iguais!');
                    return;
                }
                self.start();
            }
        });
    }

    start() {
        if (this._active) return;
        this._active = true;
        this._saveSettings();
        this._startLoop();
        this._updateUI();
        this.console.log(`[AutoSend] ✅ Iniciado! ${this.fromId} → ${this.toId} | ${this.amount} de cada | ${this.interval}min`);
        HumanMessage.success(`📤 Envio iniciado: ${this.fromId} → ${this.toId} | ${this.amount} de cada | ${this.interval}min`);
    }

    stop() {
        if (!this._active) return;
        this._active = false;
        this._saveSettings();
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
        this._updateUI();
        this.console.log('[AutoSend] ⏹ Parado!');
        HumanMessage.info('⏹ Envio de recursos parado!');
        
        const logEl = uw.$('#asr_log');
        if (logEl.length) {
            logEl.text('⏸ Parado');
            logEl.css('color', '#888');
        }
    }

    toggle() {
        if (this._active) {
            this.stop();
        } else {
            this.start();
        }
    }

    _updateTitle() {
        // Método para compatibilidade com a interface
    }
};

// ═══════════════════════════════════════════════════════════════════════
// 📦 MULTBOT - ATUALIZADO COM A NOVA VERSÃO DO SEND FREE
// ═══════════════════════════════════════════════════════════════════════

var MultBot = class {
    constructor() {
        this.console = new BotConsole();
        this.storage = new MultStorage();

        this.$ui = uw.$("#ui_box");
        this.$menu = this.createMultMenu();
        const $divider = uw.$('<div class="divider"></div>');

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

        // ⭐ AUTOSENDRESOURCES - NOVA VERSÃO COMPLETA
        this.autoSendResources = new AutoSendResources(this.console, this.storage);

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
                    title: multT('tab_farm'),
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
        this._setupPlanoEvents();
        
        // ⭐ Configura os eventos do Send Free
        setTimeout(() => {
            if (this.autoSendResources) {
                this.autoSendResources._bindEvents();
                this.autoSendResources._updateUI();
            }
        }, 500);
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

    settingsFarm = () => {
        let html = '';
        html += this.autoRuralLevel ? this.autoRuralLevel.settings() : this._missingModuleHtml('Auto Rural Level');
        html += this.autoRuralTrade ? this.autoRuralTrade.settings() : this._missingModuleHtml('Auto Rural Trade');
        return html;
    };

    settingsSendFree = () => {
        let html = '';
        html += this.autoSendResources ? this.autoSendResources.settings() : this._missingModuleHtml('Auto Send Resources');
        // Rebind eventos após renderizar
        setTimeout(() => {
            if (this.autoSendResources) {
                this.autoSendResources._bindEvents();
                this.autoSendResources._updateUI();
            }
        }, 100);
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
