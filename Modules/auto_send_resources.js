// ═══════════════════════════════════════════════════════════════════════
// 📦 MÓDULO: AutoSendResources (ENVIO SIMPLES PARA QUALQUER CIDADE)
// ═══════════════════════════════════════════════════════════════════════

var AutoSendResources = class extends MultUtil {
    constructor(console, storage) {
        super(console, storage);
        this._active = false;
        this._intervalId = null;
        this._isSending = false;
        this._boundEvents = false;
        this._lastRun = null;
        
        // Carrega configurações salvas
        this.mode = this.storage.load('asr_mode') || 'manual';
        this.fromId = parseInt(this.storage.load('asr_from_id')) || 0;
        this.toId = parseInt(this.storage.load('asr_to_id')) || 0;
        this.amount = parseInt(this.storage.load('asr_amount')) || 100;
        this.interval = parseInt(this.storage.load('asr_interval')) || 20;
        this._active = this.storage.load('asr_active') === 'true';
        
        // Se estava ativo, reinicia
        if (this._active && this.fromId > 0 && this.toId > 0) {
            setTimeout(() => this.start(), 2000);
        }
    }

    _saveSettings() {
        this.storage.save('asr_mode', this.mode);
        this.storage.save('asr_from_id', this.fromId.toString());
        this.storage.save('asr_to_id', this.toId.toString());
        this.storage.save('asr_amount', this.amount.toString());
        this.storage.save('asr_interval', this.interval.toString());
        this.storage.save('asr_active', this._active ? 'true' : 'false');
    }

    start() {
        if (this._active) return;
        
        if (this.fromId === 0 || this.toId === 0) {
            HumanMessage.error('❌ Configure a cidade de origem e o ID de destino!');
            return;
        }
        
        this._active = true;
        this._saveSettings();
        this._startLoop();
        this._updateUI();
        
        this.console.log(`[AutoSend] ✅ Iniciado! ${this.fromId} → ${this.toId} | ${this.amount} de cada | ${this.interval}min`);
        HumanMessage.success(`📤 Envio iniciado: ${this.fromId} → ${this.toId}`);
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

    _startLoop() {
        if (this._intervalId) {
            clearInterval(this._intervalId);
        }
        this._tick();
        const intervalMs = this.interval * 60 * 1000;
        this._intervalId = setInterval(() => this._tick(), intervalMs);
    }

    async _tick() {
        if (this._isSending || !this._active) return;
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
            
            if (!from) {
                if (logEl.length) {
                    logEl.text(`❌ Cidade ${this.fromId} não existe!`);
                    logEl.css('color', '#ff0000');
                }
                this._isSending = false;
                return;
            }

            const res = from.resources();
            const capacity = from.getAvailableTradeCapacity();

            // Verifica se tem recursos suficientes
            if (res.wood < this.amount || res.stone < this.amount || res.iron < this.amount) {
                if (logEl.length) {
                    logEl.text(`${horaAtual} ⏸ 🪵${Math.floor(res.wood)} 🪨${Math.floor(res.stone)} ⚙${Math.floor(res.iron)} (precisa de ${this.amount} de cada)`);
                    logEl.css('color', '#ffff00');
                }
                this._isSending = false;
                return;
            }

            // Verifica capacidade do navio
            if (capacity < this.amount * 3) {
                if (logEl.length) {
                    logEl.text(`${horaAtual} ⏸ Capacidade insuficiente: ${capacity} (precisa ${this.amount * 3})`);
                    logEl.css('color', '#ffff00');
                }
                this._isSending = false;
                return;
            }

            if (logEl.length) {
                logEl.text(`${horaAtual} ⏳ Enviando ${this.amount} de cada para ID ${this.toId}...`);
                logEl.css('color', '#ffff00');
            }

            const resultado = await this._sendResources(this.fromId, this.toId, this.amount);

            if (resultado) {
                if (logEl.length) {
                    logEl.text(`${horaAtual} ✅ ${this.amount} de cada enviado!`);
                    logEl.css('color', '#00ff00');
                }
                this.console.log(`[AutoSend] ✅ ${this.amount} de cada → ID ${this.toId}`);
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

    // Envia recursos - método SIMPLES e DIRETO
    _sendResources(fromId, toId, amount) {
        return new Promise((resolve) => {
            try {
                // Prepara os dados para envio
                const data = {
                    id: parseInt(toId),
                    wood: amount,
                    stone: amount,
                    iron: amount,
                    town_id: parseInt(fromId),
                    nl_init: true
                };

                // Adiciona token CSRF se disponível
                if (Game && Game.csrfToken) {
                    data.csrf_token = Game.csrfToken;
                    data.token = Game.csrfToken;
                }

                const timer = setTimeout(() => {
                    this.console.log('[AutoSend] ⏱ Timeout - falha ao enviar');
                    resolve(false);
                }, 15000);

                // Tenta GPAjax
                if (typeof GPAjax !== 'undefined' && GPAjax.ajaxPost) {
                    GPAjax.ajaxPost('town_info', 'trade', data, true,
                        res => {
                            clearTimeout(timer);
                            if (res && !res.error) {
                                resolve(true);
                            } else {
                                this.console.log('[AutoSend] ❌ Erro GPAjax: ' + JSON.stringify(res));
                                resolve(false);
                            }
                        },
                        () => {
                            clearTimeout(timer);
                            resolve(false);
                        }
                    );
                    return;
                }

                // Tenta gpAjax
                if (typeof gpAjax !== 'undefined' && gpAjax.ajaxPost) {
                    gpAjax.ajaxPost('town_info', 'trade', data, true,
                        res => {
                            clearTimeout(timer);
                            if (res && !res.error) {
                                resolve(true);
                            } else {
                                this.console.log('[AutoSend] ❌ Erro gpAjax: ' + JSON.stringify(res));
                                resolve(false);
                            }
                        },
                        () => {
                            clearTimeout(timer);
                            resolve(false);
                        }
                    );
                    return;
                }

                // Tenta jQuery
                if (typeof $ !== 'undefined' && $.ajax) {
                    $.ajax({
                        url: '/game/action/town_info/trade',
                        method: 'POST',
                        data: data,
                        dataType: 'json',
                        success: (res) => {
                            clearTimeout(timer);
                            if (res && !res.error) {
                                resolve(true);
                            } else {
                                this.console.log('[AutoSend] ❌ Erro jQuery: ' + JSON.stringify(res));
                                resolve(false);
                            }
                        },
                        error: (xhr, status, error) => {
                            clearTimeout(timer);
                            this.console.log('[AutoSend] ❌ jQuery error: ' + error);
                            resolve(false);
                        }
                    });
                    return;
                }

                // Fallback: XMLHttpRequest
                const xhr = new XMLHttpRequest();
                xhr.open('POST', '/game/action/town_info/trade', true);
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                xhr.onload = function() {
                    clearTimeout(timer);
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response && !response.error) {
                            resolve(true);
                        } else {
                            this.console.log('[AutoSend] ❌ Erro XHR: ' + xhr.responseText);
                            resolve(false);
                        }
                    } catch(e) {
                        resolve(false);
                    }
                };
                xhr.onerror = function() {
                    clearTimeout(timer);
                    resolve(false);
                };
                xhr.send(new URLSearchParams(data));

            } catch(e) {
                this.console.log('[AutoSend] ❌ Exceção: ' + e?.message);
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
        const fromInput = uw.$('#asr_from_input');
        const toInput = uw.$('#asr_to_input');
        const amountInput = uw.$('#asr_amount_input');
        const intervalInput = uw.$('#asr_interval_input');
        const btnToggle = uw.$('#asr_toggle_btn');

        if (fromSelect.length && fromInput.length) {
            fromSelect.val(this.fromId);
            fromInput.val(this.fromId);
        }
        if (toInput.length) toInput.val(this.toId);
        if (amountInput.length) amountInput.val(this.amount);
        if (intervalInput.length) intervalInput.val(this.interval);
        if (btnToggle.length) {
            btnToggle.text(this._active ? '⏹️ Parar' : '▶️ Iniciar');
            btnToggle.css('background', this._active ? 'linear-gradient(135deg, #5a1e1e, #3a0a0a)' : 'linear-gradient(135deg, #2d5a1e, #1a3a0a)');
            btnToggle.css('border-color', this._active ? '#ff4444' : '#44ff88');
            btnToggle.css('color', this._active ? '#ff4444' : '#44ff88');
        }

        const logEl = uw.$('#asr_log');
        if (logEl.length && !this._active) {
            logEl.text('⏸ Parado');
            logEl.css('color', '#888');
        }
    }

    settings() {
        const towns = this._getTownsList();
        const optionsHtml = towns.map(t => 
            `<option value="${t.id}">${t.id} - ${t.name}</option>`
        ).join('');

        setTimeout(() => this._bindEvents(), 100);

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
                <!-- CIDADES -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                    <div>
                        <label style="color:#c8a86e; font-size:12px; display:block; margin-bottom:4px;">📤 De (sua cidade)</label>
                        <div style="display:flex; gap:6px;">
                            <select id="asr_from_select" style="flex:1; background:#2a1a0a; color:#c8a86e; border:1px solid #8B6914; border-radius:4px; padding:4px 6px; font-size:12px;">
                                <option value="0">Selecione</option>
                                ${optionsHtml}
                            </select>
                            <input type="number" id="asr_from_input" placeholder="ID" style="width:70px; background:#2a1a0a; color:#c8a86e; border:1px solid #8B6914; border-radius:4px; padding:4px 6px; font-size:12px; text-align:center;">
                        </div>
                    </div>
                    <div>
                        <label style="color:#c8a86e; font-size:12px; display:block; margin-bottom:4px;">📥 Para (ID da cidade destino - QUALQUER JOGADOR)</label>
                        <input type="number" id="asr_to_input" placeholder="ID da cidade destino" style="width:100%; background:#2a1a0a; color:#c8a86e; border:1px solid #8B6914; border-radius:4px; padding:4px 6px; font-size:12px;">
                    </div>
                </div>

                <!-- CONFIGURAÇÕES -->
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

                <!-- BOTÃO -->
                <div style="display:flex; gap:8px; margin-bottom:12px;">
                    <a href="#" id="asr_toggle_btn" class="attack-btn" style="flex:1; text-align:center; padding:8px; background:${this._active ? 'linear-gradient(135deg, #5a1e1e, #3a0a0a)' : 'linear-gradient(135deg, #2d5a1e, #1a3a0a)'}; border-color:${this._active ? '#ff4444' : '#44ff88'}; color:${this._active ? '#ff4444' : '#44ff88'};">
                        ${this._active ? '⏹️ Parar' : '▶️ Iniciar'}
                    </a>
                </div>

                <!-- LOG -->
                <div id="asr_log" style="padding:6px 10px; font-size:12px; min-height:20px; font-weight:bold; background:rgba(20,12,5,0.3); border-radius:4px; border:1px solid #2a1a0a; color:#888;">
                    ${this._active ? '🟢 Ativo' : '⏸ Parado'}
                </div>
                <div style="padding:4px 10px 0; font-size:10px; color:#888; border-top:1px solid #2a1a0a; margin-top:6px;">
                    ⏱ Última verificação: <span id="asr_timestamp">${this._active ? 'Aguardando...' : 'N/A'}</span>
                </div>

                <!-- INFO -->
                <div style="padding:6px 10px 0; font-size:10px; color:#665544; border-top:1px solid #2a1a0a; margin-top:6px;">
                    💡 Envia recursos da sua cidade para QUALQUER CIDADE DO MUNDO.<br>
                    ⚠️ Verifica: recursos disponíveis e capacidade do navio.
                </div>
            </div>
        </div>`;
    }

    _bindEvents() {
        if (this._boundEvents) return;
        this._boundEvents = true;

        const self = this;

        // Sincroniza select com input (Origem)
        uw.$('#asr_from_select').off('change.asr').on('change.asr', function() {
            const val = parseInt(this.value);
            if (val > 0) {
                uw.$('#asr_from_input').val(val);
                self.fromId = val;
                self._saveSettings();
            }
        });

        uw.$('#asr_from_input').off('change.asr').on('change.asr', function() {
            const val = parseInt(this.value);
            if (val > 0) {
                uw.$('#asr_from_select').val(val);
                self.fromId = val;
                self._saveSettings();
            }
        });

        // ID de destino
        uw.$('#asr_to_input').off('change.asr').on('change.asr', function() {
            const val = parseInt(this.value);
            if (val > 0) {
                self.toId = val;
                self._saveSettings();
            }
        });

        // Quantidade
        uw.$('#asr_amount_input').off('change.asr').on('change.asr', function() {
            const val = parseInt(this.value);
            if (val > 0) {
                self.amount = val;
                self._saveSettings();
            }
        });

        // Intervalo
        uw.$('#asr_interval_input').off('change.asr').on('change.asr', function() {
            const val = parseInt(this.value);
            if (val > 0) {
                self.interval = val;
                self._saveSettings();
                if (self._active) {
                    self.stop();
                    self.start();
                }
            }
        });

        // Botão Iniciar/Parar
        uw.$('#asr_toggle_btn').off('click.asr').on('click.asr', function(e) {
            e.preventDefault();
            if (self._active) {
                self.stop();
            } else {
                self.start();
            }
        });
    }
};
