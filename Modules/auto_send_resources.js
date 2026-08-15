// ═══════════════════════════════════════════════════════════════════════
// 📦 MÓDULO: AutoSendResources (BASEADO NO SEU ORIGINAL + INTERFACE IDS)
// ═══════════════════════════════════════════════════════════════════════

var AutoSendResources = class extends MultUtil {
    constructor(c, s) {
        super(c, s);
        this._active = false;
        this._intervalId = null;
        this._lastRun = null;
        this._boundEvents = false;
        this._isSending = false;
        
        // Carrega configurações salvas
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
        this.storage.save('asr_from_id', this.fromId.toString());
        this.storage.save('asr_to_id', this.toId.toString());
        this.storage.save('asr_amount', this.amount.toString());
        this.storage.save('asr_interval', this.interval.toString());
        this.storage.save('asr_active', this._active ? 'true' : 'false');
    }

    settings = () => {
        requestAnimationFrame(() => this._updateTitle());
        const towns = this._getTownsList();
        const optionsHtml = towns.map(t => 
            `<option value="${t.id}">${t.id} - ${t.name}</option>`
        ).join('');

        setTimeout(() => this._bindEvents(), 100);

        return `
        <div class="game_border" style="margin-bottom:20px;">
            <div class="game_border_top"></div><div class="game_border_bottom"></div>
            <div class="game_border_left"></div><div class="game_border_right"></div>
            <div class="game_border_corner corner1"></div><div class="game_border_corner corner2"></div>
            <div class="game_border_corner corner3"></div><div class="game_border_corner corner4"></div>
            ${this.getTitleHtml('asr_title', '📤 Envio de Recursos', this.toggle, '', this._active)}
            
            <div style="padding:10px 12px;">
                <!-- CIDADES -->
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
                        <label style="color:#c8a86e; font-size:12px; display:block; margin-bottom:4px;">📥 Para (Destino - QUALQUER CIDADE)</label>
                        <div style="display:flex; gap:6px;">
                            <select id="asr_to_select" style="flex:1; background:#2a1a0a; color:#c8a86e; border:1px solid #8B6914; border-radius:4px; padding:4px 6px; font-size:12px;">
                                <option value="0">Selecione (suas cidades)</option>
                                ${optionsHtml}
                            </select>
                            <input type="number" id="asr_to_input" placeholder="ID" style="width:70px; background:#2a1a0a; color:#c8a86e; border:1px solid #8B6914; border-radius:4px; padding:4px 6px; font-size:12px; text-align:center;">
                        </div>
                        <div style="font-size:9px; color:#665544; margin-top:2px;">💡 Pode digitar ID de qualquer cidade do mundo</div>
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

                <!-- BOTÕES -->
                <div style="display:flex; gap:8px; margin-bottom:12px;">
                    <a href="#" id="asr_toggle_btn" class="attack-btn" style="flex:1; text-align:center; padding:8px; background:${this._active ? 'linear-gradient(135deg, #5a1e1e, #3a0a0a)' : 'linear-gradient(135deg, #2d5a1e, #1a3a0a)'}; border-color:${this._active ? '#ff4444' : '#44ff88'}; color:${this._active ? '#ff4444' : '#44ff88'};">
                        ${this._active ? '⏹️ Parar' : '▶️ Iniciar'}
                    </a>
                    <a href="#" id="asr_test_btn" class="attack-btn" style="flex:0 0 auto; padding:8px 16px; background:linear-gradient(135deg, #3a2510, #2a1a0a); border-color:#8B6914; color:#c8a86e;">
                        🧪 Testar Envio
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
    };

    _getTownsList() {
        if (typeof ITowns === 'undefined' || !ITowns.towns) return [];
        return Object.values(ITowns.towns).map(town => ({
            id: town.id,
            name: town.getName(),
            resources: town.resources ? town.resources() : null
        }));
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
                self._updateTitle();
            }
        });

        uw.$('#asr_from_input').off('change.asr').on('change.asr', function() {
            const val = parseInt(this.value);
            if (val > 0) {
                uw.$('#asr_from_select').val(val);
                self.fromId = val;
                self._saveSettings();
                self._updateTitle();
            }
        });

        // Sincroniza select com input (Destino)
        uw.$('#asr_to_select').off('change.asr').on('change.asr', function() {
            const val = parseInt(this.value);
            if (val > 0) {
                uw.$('#asr_to_input').val(val);
                self.toId = val;
                self._saveSettings();
                self._updateTitle();
            }
        });

        uw.$('#asr_to_input').off('change.asr').on('change.asr', function() {
            const val = parseInt(this.value);
            if (val > 0) {
                uw.$('#asr_to_select').val(val);
                self.toId = val;
                self._saveSettings();
                self._updateTitle();
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

        // Botão Testar Envio
        uw.$('#asr_test_btn').off('click.asr').on('click.asr', function(e) {
            e.preventDefault();
            if (self.fromId === 0 || self.toId === 0) {
                HumanMessage.error('❌ Configure origem e destino primeiro!');
                return;
            }
            if (self._isSending) {
                HumanMessage.warn('⏳ Já está enviando...');
                return;
            }
            HumanMessage.info('🧪 Testando envio...');
            self._tick();
        });
    }

    toggle = () => {
        if (this._active) this.stop();
        else this.start();
    };

    start() {
        if (this._active) return;
        if (this.fromId === 0 || this.toId === 0) {
            HumanMessage.error('❌ Configure a cidade de origem e o ID de destino!');
            return;
        }
        if (this.fromId === this.toId) {
            HumanMessage.error('❌ Origem e destino não podem ser iguais!');
            return;
        }
        
        this._active = true;
        this.storage.save('asr_active', true);
        this._saveSettings();
        this._updateTitle();
        this.console.log(`[AutoSend] ✅ Iniciado! ${this.fromId} → ${this.toId} | ${this.amount} de cada | ${this.interval}min`);
        HumanMessage.success(`📤 Envio iniciado: ${this.fromId} → ${this.toId}`);
        this._tick();
        this._intervalId = setInterval(() => this._tick(), this.interval * 60 * 1000);
    }

    stop() {
        this._active = false;
        this.storage.save('asr_active', false);
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
        this._updateTitle();
        this.console.log('[AutoSend] ⏹ Parado!');
        HumanMessage.info('⏹ Envio parado!');
        
        const logEl = uw.$('#asr_log');
        if (logEl.length) {
            logEl.text('⏸ Parado');
            logEl.css('color', '#888');
        }
    }

    _updateTitle() {
        const title = uw.$('#asr_title');
        if (title.length) {
            if (this._active) {
                title.css('filter', 'brightness(100%) saturate(186%) hue-rotate(241deg)');
            } else {
                title.css('filter', '');
            }
            
            // Atualiza o texto do título
            const fromName = this.fromId > 0 ? (ITowns.towns[this.fromId]?.getName?.() || this.fromId) : '?';
            const toName = this.toId > 0 ? (ITowns.towns[this.toId]?.getName?.() || this.toId) : '?';
            const status = this._active ? '🟢' : '⏸';
            const text = `${status} ${fromName} → ${toName} (${this.amount} cada)`;
            
            // Procura o elemento de texto dentro do título
            const titleText = title.find('.asr-title-text');
            if (titleText.length) {
                titleText.text(text);
            } else {
                // Se não encontrar, tenta definir de outra forma
                const html = title.html();
                const newHtml = html.replace(/<span class="asr-title-text">.*?<\/span>/, `<span class="asr-title-text">${text}</span>`);
                title.html(newHtml);
            }
        }
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
            // Verifica se o jogo está carregado
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

            const fromName = from.getName();
            const res = from.resources();
            const capacity = from.getAvailableTradeCapacity();

            // Verifica recursos
            if (res.wood < this.amount || res.stone < this.amount || res.iron < this.amount) {
                if (logEl.length) {
                    logEl.text(`${horaAtual} ⏸ 🪵${Math.floor(res.wood)} 🪨${Math.floor(res.stone)} ⚙${Math.floor(res.iron)} (precisa ${this.amount} de cada)`);
                    logEl.css('color', '#ffff00');
                }
                this.console.log(`[AutoSend] ⏸ ${fromName}: recursos insuficientes`);
                this._isSending = false;
                return;
            }

            // Verifica capacidade
            if (capacity < this.amount * 3) {
                if (logEl.length) {
                    logEl.text(`${horaAtual} ⏸ Capacidade: ${capacity} (precisa ${this.amount * 3})`);
                    logEl.css('color', '#ffff00');
                }
                this.console.log(`[AutoSend] ⏸ ${fromName}: capacidade insuficiente (${capacity})`);
                this._isSending = false;
                return;
            }

            if (logEl.length) {
                logEl.text(`${horaAtual} ⏳ Enviando ${this.amount} de cada para ID ${this.toId}...`);
                logEl.css('color', '#ffff00');
            }

            // ENVIA OS RECURSOS - USANDO O MÉTODO ORIGINAL
            const resultado = await this._sendResources(this.fromId, this.toId, this.amount);

            if (resultado) {
                if (logEl.length) {
                    logEl.text(`${horaAtual} ✅ ${this.amount} de cada enviado!`);
                    logEl.css('color', '#00ff00');
                }
                this.console.log(`[AutoSend] ✅ ${fromName} → ID ${this.toId}: ${this.amount} de cada`);
                HumanMessage.success(`📤 ${this.amount} de cada enviado de ${fromName}`);
            } else {
                if (logEl.length) {
                    logEl.text(`${horaAtual} ❌ Falha no envio`);
                    logEl.css('color', '#ff0000');
                }
                this.console.log(`[AutoSend] ❌ ${fromName} → ID ${this.toId}: falha`);
                HumanMessage.error(`❌ Falha ao enviar de ${fromName}`);
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

    // ═══════════════════════════════════════════════════════════════════
    // MÉTODO DE ENVIO - IGUAL AO SEU ORIGINAL
    // ═══════════════════════════════════════════════════════════════════

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

                const timer = setTimeout(() => {
                    this.console.log('[AutoSend] ⏱ Timeout');
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
                                this.console.log('[AutoSend] ❌ GPAjax error: ' + JSON.stringify(res));
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
                                this.console.log('[AutoSend] ❌ gpAjax error: ' + JSON.stringify(res));
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
                                this.console.log('[AutoSend] ❌ jQuery error: ' + JSON.stringify(res));
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
                            this.console.log('[AutoSend] ❌ XHR error: ' + xhr.responseText);
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
};
