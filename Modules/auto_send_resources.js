// ═══════════════════════════════════════════════════════════════════════
// 📦 MÓDULO: AutoSendResources (ENVIO PARA QUALQUER CIDADE DO MUNDO)
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
        this.mode = this.storage.load('asr_mode') || 'auto'; // 'auto' ou 'manual'
        this.fromId = parseInt(this.storage.load('asr_from_id')) || 0;
        this.toId = parseInt(this.storage.load('asr_to_id')) || 0;
        this.amount = parseInt(this.storage.load('asr_amount')) || 100;
        this.interval = parseInt(this.storage.load('asr_interval')) || 30;
        this._active = this.storage.load('asr_active') === 'true';
        
        // Se estava ativo, reinicia
        if (this._active) {
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
        
        // Se modo manual, verifica se as cidades estão configuradas
        if (this.mode === 'manual') {
            if (this.fromId === 0 || this.toId === 0) {
                HumanMessage.error('❌ Configure a cidade de origem e o ID de destino!');
                return;
            }
        }
        
        this._active = true;
        this._saveSettings();
        this._startLoop();
        this._updateUI();
        
        const modeText = this.mode === 'auto' ? 'Automático (suas cidades)' : `Manual → ID: ${this.toId}`;
        this.console.log(`[AutoSend] ✅ Iniciado! Modo: ${modeText} | Intervalo: ${this.interval}min`);
        HumanMessage.success(`📤 Envio iniciado (${modeText})`);
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

            const townIds = Object.keys(ITowns.towns);
            if (townIds.length < 1) {
                if (logEl.length) {
                    logEl.text('⚠️ Nenhuma cidade própria encontrada');
                    logEl.css('color', '#ffff00');
                }
                this._isSending = false;
                return;
            }

            if (this.mode === 'auto') {
                // === MODO AUTOMÁTICO: Envia das suas cidades para as mais pobres (suas cidades) ===
                await this._runAutoMode(logEl);
            } else {
                // === MODO MANUAL: Envia da sua cidade para QUALQUER cidade do mundo ===
                await this._runManualMode(logEl);
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

    async _runAutoMode(logEl) {
        const townIds = Object.keys(ITowns.towns);
        
        // Encontra a cidade mais pobre (suas cidades)
        const target = this._findPoorestTown(townIds);
        if (!target) {
            if (logEl.length) {
                logEl.text('❌ Nenhuma cidade destino encontrada');
                logEl.css('color', '#ff0000');
            }
            return;
        }

        const targetName = ITowns.towns[target].getName();
        const senders = townIds.filter(id => id !== target && this._isEligibleSender(id));
        
        if (!senders.length) {
            if (logEl.length) {
                logEl.text('⏸ Nenhuma cidade elegível para envio');
                logEl.css('color', '#ffff00');
            }
            this.console.log('[AutoSend] Nenhuma cidade elegível para envio.');
            return;
        }

        this.console.log(`[AutoSend] 🎯 Destino automático: ${targetName}`);
        if (logEl.length) {
            logEl.text(`🎯 Destino: ${targetName} | ${senders.length} cidades elegíveis`);
            logEl.css('color', '#ffff00');
        }

        // Envia em paralelo (excedente automático)
        const sendPromises = senders.map(fromId => this._sendResources(fromId, target));
        const sendResults = await Promise.allSettled(sendPromises);
        const results = sendResults.filter(r => r.status === 'fulfilled' && r.value);

        const totalSent = results.length;
        if (totalSent > 0) {
            const msg = `✅ ${totalSent} envio(s) concluído(s) para ${targetName}`;
            if (logEl.length) {
                logEl.text(msg);
                logEl.css('color', '#00ff00');
            }
            this.console.log(`[AutoSend] ${msg}`);
        }
    }

    async _runManualMode(logEl) {
        const from = ITowns.towns[this.fromId];
        
        if (!from) {
            if (logEl.length) {
                logEl.text(`❌ Cidade ${this.fromId} não existe!`);
                logEl.css('color', '#ff0000');
            }
            return;
        }

        // Verifica se a cidade de origem pode enviar
        if (!this._isEligibleSender(this.fromId)) {
            const res = from.resources();
            const pop = from.getAvailablePopulation();
            if (logEl.length) {
                logEl.text(`⏸ ${from.getName()}: pop ${pop} | 🪵${Math.floor(res.wood)} 🪨${Math.floor(res.stone)} ⚙${Math.floor(res.iron)}`);
                logEl.css('color', '#ffff00');
            }
            return;
        }

        const toName = this.toId; // Não temos nome de cidades de outros jogadores
        this.console.log(`[AutoSend] 📤 Manual: ${from.getName()} → ID ${this.toId}`);
        if (logEl.length) {
            logEl.text(`📤 Enviando ${from.getName()} → ID ${this.toId} (${this.amount} de cada)`);
            logEl.css('color', '#ffff00');
        }

        // Envia a quantidade definida pelo usuário
        const result = await this._sendResources(this.fromId, this.toId, this.amount);
        
        if (result) {
            const msg = `✅ ${this.amount} de cada enviado para ID ${this.toId}`;
            if (logEl.length) {
                logEl.text(msg);
                logEl.css('color', '#00ff00');
            }
            this.console.log(`[AutoSend] ${msg}`);
        } else {
            if (logEl.length) {
                logEl.text(`❌ Falha ao enviar para ID ${this.toId}`);
                logEl.css('color', '#ff0000');
            }
            this.console.log(`[AutoSend] ❌ Falha ao enviar para ID ${this.toId}`);
        }
    }

    // === MÉTODOS DO MODO AUTOMÁTICO ===

    // Cidade com menor % de storage (suas cidades)
    _findPoorestTown(townIds) {
        let bestId = null;
        let bestPct = Infinity;

        for (const id of townIds) {
            try {
                const town = ITowns.towns[id];
                const res = town.resources();
                const pct = (res.wood + res.stone + res.iron) / (res.storage * 3);
                if (pct < bestPct) {
                    bestPct = pct;
                    bestId = id;
                }
            } catch(e) {}
        }
        return bestId;
    }

    // Verifica se a cidade pode enviar recursos
    _isEligibleSender(townId) {
        try {
            const town = ITowns.towns[townId];
            const buildings = town.buildings().attributes;
            const res = town.resources();

            // 1. Pop disponível < 200
            if (town.getAvailablePopulation() >= 200) return false;

            // 2. Fila de construção vazia
            if ((town.buildingOrders?.()?.length ?? 0) > 0) return false;

            // 3. Mercado ativo com capacidade > 500
            if (!buildings.market || buildings.market < 1) return false;
            const capacity = town.getAvailableTradeCapacity();
            if (capacity < 500) return false;

            // 4. Tem recursos suficientes para enviar
            const amountToCheck = this.mode === 'manual' ? this.amount : Math.floor(capacity / 3);
            const hasResources = res.wood >= amountToCheck || res.stone >= amountToCheck || res.iron >= amountToCheck;
            if (!hasResources) return false;

            // 5. Pelo menos um recurso acima de 50% do storage (modo automático)
            if (this.mode === 'auto') {
                const threshold = res.storage * 0.5;
                const hasExcess = res.wood > threshold || res.stone > threshold || res.iron > threshold;
                if (!hasExcess) return false;
            }

            return true;
        } catch(e) {
            return false;
        }
    }

    // Envia recursos
    _sendResources(fromId, toId, customAmount = null) {
        return new Promise((resolve) => {
            try {
                const from = ITowns.towns[fromId];
                const fromRes = from.resources();
                const capacity = from.getAvailableTradeCapacity();

                if (capacity < 100) {
                    resolve(false);
                    return;
                }

                let wood, stone, iron;

                if (customAmount !== null && customAmount > 0) {
                    // Modo manual: usa a quantidade definida
                    const amount = Math.min(customAmount, Math.floor(capacity / 3));
                    wood = Math.min(amount, fromRes.wood);
                    stone = Math.min(amount, fromRes.stone);
                    iron = Math.min(amount, fromRes.iron);
                } else {
                    // Modo automático: envia excedente acima de 50%
                    const threshold = fromRes.storage * 0.5;
                    const excessW = Math.max(0, Math.floor(fromRes.wood - threshold));
                    const excessS = Math.max(0, Math.floor(fromRes.stone - threshold));
                    const excessI = Math.max(0, Math.floor(fromRes.iron - threshold));

                    const perRes = Math.floor(capacity / 3);
                    wood = Math.min(perRes, excessW);
                    stone = Math.min(perRes, excessS);
                    iron = Math.min(perRes, excessI);
                }

                const total = wood + stone + iron;
                if (total < 50) {
                    resolve(false);
                    return;
                }

                const fromName = from.getName();
                const data = {
                    id: parseInt(toId),
                    wood: wood,
                    stone: stone,
                    iron: iron,
                    town_id: parseInt(fromId),
                    nl_init: true
                };

                this.console.log(`[AutoSend] ${fromName} → ID ${toId}: ${wood}🪵 ${stone}🪨 ${iron}⚙`);

                const timer = setTimeout(() => {
                    this.console.log(`[AutoSend] ✗ ${fromName}: timeout`);
                    resolve(false);
                }, 15000);

                // Tenta vários métodos de envio
                if (typeof GPAjax !== 'undefined' && GPAjax.ajaxPost) {
                    GPAjax.ajaxPost('town_info', 'trade', data, true,
                        res => {
                            clearTimeout(timer);
                            resolve(res && !res.error);
                        },
                        () => {
                            clearTimeout(timer);
                            resolve(false);
                        }
                    );
                    return;
                }

                if (typeof gpAjax !== 'undefined' && gpAjax.ajaxPost) {
                    gpAjax.ajaxPost('town_info', 'trade', data, true,
                        res => {
                            clearTimeout(timer);
                            resolve(res && !res.error);
                        },
                        () => {
                            clearTimeout(timer);
                            resolve(false);
                        }
                    );
                    return;
                }

                if (typeof $ !== 'undefined' && $.ajax) {
                    $.ajax({
                        url: '/game/action/town_info/trade',
                        method: 'POST',
                        data: data,
                        dataType: 'json',
                        success: (res) => {
                            clearTimeout(timer);
                            resolve(res && !res.error);
                        },
                        error: () => {
                            clearTimeout(timer);
                            resolve(false);
                        }
                    });
                    return;
                }

                const xhr = new XMLHttpRequest();
                xhr.open('POST', '/game/action/town_info/trade', true);
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                xhr.onload = function() {
                    clearTimeout(timer);
                    try {
                        resolve(JSON.parse(xhr.responseText)?.error ? false : true);
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
                this.console.log('[AutoSend] Exceção: ' + e?.message);
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
        const modeRadios = uw.$('input[name="asr_mode"]');
        const manualDiv = uw.$('#asr_manual_div');
        const fromSelect = uw.$('#asr_from_select');
        const fromInput = uw.$('#asr_from_input');
        const toInput = uw.$('#asr_to_input');
        const amountInput = uw.$('#asr_amount_input');
        const intervalInput = uw.$('#asr_interval_input');
        const btnToggle = uw.$('#asr_toggle_btn');

        if (modeRadios.length) {
            modeRadios.val([this.mode]);
        }

        if (manualDiv.length) {
            manualDiv.css('display', this.mode === 'manual' ? 'block' : 'none');
        }

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
                <!-- MODO DE OPERAÇÃO -->
                <div style="margin-bottom:12px; display:flex; gap:20px; background:rgba(20,12,5,0.3); padding:8px 12px; border-radius:4px; border:1px solid #2a1a0a; flex-wrap:wrap;">
                    <label style="color:#c8a86e; font-size:13px; cursor:pointer;">
                        <input type="radio" name="asr_mode" value="auto" ${this.mode === 'auto' ? 'checked' : ''}> 
                        🤖 Automático (suas cidades)
                    </label>
                    <label style="color:#c8a86e; font-size:13px; cursor:pointer;">
                        <input type="radio" name="asr_mode" value="manual" ${this.mode === 'manual' ? 'checked' : ''}> 
                        🌍 Manual (qualquer cidade do mundo)
                    </label>
                </div>

                <!-- MODO MANUAL -->
                <div id="asr_manual_div" style="${this.mode === 'manual' ? 'display:block;' : 'display:none;'} margin-bottom:12px;">
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
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                        <div>
                            <label style="color:#c8a86e; font-size:12px; display:block; margin-bottom:4px;">📦 Quantidade (cada recurso)</label>
                            <input type="number" id="asr_amount_input" value="${this.amount}" min="1" style="width:100%; background:#2a1a0a; color:#c8a86e; border:1px solid #8B6914; border-radius:4px; padding:4px 6px; font-size:12px;">
                        </div>
                        <div>
                            <label style="color:#c8a86e; font-size:12px; display:block; margin-bottom:4px;">⏱ Intervalo (minutos)</label>
                            <input type="number" id="asr_interval_input" value="${this.interval}" min="1" style="width:100%; background:#2a1a0a; color:#c8a86e; border:1px solid #8B6914; border-radius:4px; padding:4px 6px; font-size:12px;">
                        </div>
                    </div>
                </div>

                <!-- CONTROLES (visíveis em ambos os modos) -->
                <div style="display:flex; gap:8px; margin-top:12px; margin-bottom:12px;">
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
                    💡 <b>Automático:</b> Envia de cidades com pop &lt; 200 + construções concluídas para a sua cidade mais pobre.<br>
                    💡 <b>Manual:</b> Envia da sua cidade escolhida para QUALQUER CIDADE DO MUNDO (basta colocar o ID).<br>
                    ⚠️ Condições de envio: pop &lt; 200, mercado ativo (capacidade > 500), construções concluídas.
                </div>
            </div>
        </div>`;
    }

    _bindEvents() {
        if (this._boundEvents) return;
        this._boundEvents = true;

        const self = this;

        // Modo de operação
        uw.$('input[name="asr_mode"]').off('change.asr').on('change.asr', function() {
            self.mode = this.value;
            self._saveSettings();
            self._updateUI();
            
            if (self._active) {
                self.stop();
                HumanMessage.info(`Modo alterado para ${self.mode === 'auto' ? 'Automático' : 'Manual'}. Reinicie para aplicar.`);
            }
        });

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

        // ID de destino (QUALQUER CIDADE DO MUNDO)
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
