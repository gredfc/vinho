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
// 📦 MULTBOT - COM CONFIGURAÇÃO NO PAINEL (VERSÃO ESTÁVEL)
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

        // ⭐ AutoSendResources com configuração
        this.autoSendResources  = this._safeInit('AutoSendResources', () => new AutoSendResources(this.console, this.storage));

        // ⭐ PERSONALIZA O MÓDULO COM CONFIGURAÇÃO
        if (this.autoSendResources) {
            this._personalizarAutoSendResources();
        }

        this.settingsFactory = this._safeInit('SettingsWindow', () => new createGrepoWindow({
            id: 'MULT_BOT',
            title: 'MultBot',
            size: [845, 560],
            tabs: [
                { title: multT('tab_status'), id: 'status', render: this.settingsStatus },
                { title: multT('tab_farm'), id: 'farm', render: this.settingsFarm },
                { title: multT('tab_build'), id: 'build', render: this.settingsBuild },
                { title: multT('tab_train'), id: 'train', render: this.settingsTrain },
                { title: multT('tab_mix'), id: 'mix', render: this.settingsMix },
                { title: multT('tab_attack'), id: 'attack', render: this.settingsAttack },
                { title: '📤 Send Free', id: 'send_free', render: this.settingsSendFree },
                { title: multT('tab_mult'), id: 'mult', render: this.settingsMult },
                { title: multT('tab_console'), id: 'console', render: this.console.renderSettings },
            ],
            start_tab: 0,
        }));

        this.setup();
    }

    _safeInit = (name, factory) => {
        try {
            return factory();
        } catch (e) {
            const msg = '[MultBot] ✗ Failed to initialize module "' + name + '": ' + (e?.message ?? e);
            console.error(msg, e);
            try {
                if (this.console && typeof this.console.log === 'function') this.console.log(msg);
            } catch (_) {}
            return null;
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // ⭐ PERSONALIZAÇÃO DO AutoSendResources
    // ═══════════════════════════════════════════════════════════════════════
    _personalizarAutoSendResources() {
        const module = this.autoSendResources;

        const DEFAULT_CONFIG = {
            from: 154,
            to: 2195,
            amount: 500,
            intervalo: 1200
        };

        module._getConfig = function() {
            return {
                from: parseInt(this.storage.load('asr_from')) || DEFAULT_CONFIG.from,
                to: parseInt(this.storage.load('asr_to')) || DEFAULT_CONFIG.to,
                amount: parseInt(this.storage.load('asr_amount')) || DEFAULT_CONFIG.amount,
                intervalo: parseInt(this.storage.load('asr_intervalo')) || DEFAULT_CONFIG.intervalo
            };
        };

        module._saveConfig = function(from, to, amount, intervalo) {
            this.storage.save('asr_from', from);
            this.storage.save('asr_to', to);
            this.storage.save('asr_amount', amount);
            this.storage.save('asr_intervalo', intervalo);
            
            var logEl = uw.$('#asr_log');
            if (logEl.length) {
                logEl.text('Configuracao salva: ' + from + ' -> ' + to + ' | ' + amount + ' cada | ' + (intervalo/60) + 'min');
                logEl.css('color', '#00aa00');
            }
            
            if (this._active) {
                this.stop();
                setTimeout(function() { this.start(); }.bind(this), 500);
            }
        };

        module.settings = function() {
            var config = this._getConfig();
            
            requestAnimationFrame(function() { this._updateTitle(); }.bind(this));
            
            setTimeout(function() {
                var fromEl = document.getElementById('asr_config_from');
                var toEl = document.getElementById('asr_config_to');
                var amountEl = document.getElementById('asr_config_amount');
                var intervaloEl = document.getElementById('asr_config_intervalo');
                if (fromEl) fromEl.value = config.from;
                if (toEl) toEl.value = config.to;
                if (amountEl) amountEl.value = config.amount;
                if (intervaloEl) intervaloEl.value = config.intervalo / 60;
            }, 100);
            
            return `
            <div class="game_border" style="margin-bottom:20px;">
                <div class="game_border_top"></div><div class="game_border_bottom"></div>
                <div class="game_border_left"></div><div class="game_border_right"></div>
                <div class="game_border_corner corner1"></div><div class="game_border_corner corner2"></div>
                <div class="game_border_corner corner3"></div><div class="game_border_corner corner4"></div>
                ${this.getTitleHtml('asr_title', '📦 Envio ' + config.from + ' -> ' + config.to + ' (' + config.amount + ' cada - ' + (config.intervalo/60) + 'min)', this.toggle, '', this._active)}
                
                <div style="padding:8px 10px;background:#f5f0e8;border-radius:4px;margin:5px 10px;border:1px solid #d4c9b8;">
                    <div style="font-weight:bold;font-size:12px;color:#3a2a1a;margin-bottom:5px;">⚙️ Configuracao</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:11px;">
                        <div>
                            <label style="display:block;color:#5a4a3a;font-weight:bold;">📍 Origem</label>
                            <input id="asr_config_from" type="number" value="' + config.from + '" style="width:100%;padding:3px 5px;border:1px solid #c4b9a8;border-radius:3px;font-size:11px;background:#fff;">
                        </div>
                        <div>
                            <label style="display:block;color:#5a4a3a;font-weight:bold;">📍 Destino</label>
                            <input id="asr_config_to" type="number" value="' + config.to + '" style="width:100%;padding:3px 5px;border:1px solid #c4b9a8;border-radius:3px;font-size:11px;background:#fff;">
                        </div>
                        <div>
                            <label style="display:block;color:#5a4a3a;font-weight:bold;">📦 Quantidade</label>
                            <input id="asr_config_amount" type="number" value="' + config.amount + '" style="width:100%;padding:3px 5px;border:1px solid #c4b9a8;border-radius:3px;font-size:11px;background:#fff;">
                        </div>
                        <div style="grid-column:span 3;">
                            <label style="display:block;color:#5a4a3a;font-weight:bold;">⏱ Intervalo (minutos)</label>
                            <input id="asr_config_intervalo" type="number" value="' + (config.intervalo/60) + '" style="width:100%;padding:3px 5px;border:1px solid #c4b9a8;border-radius:3px;font-size:11px;background:#fff;">
                        </div>
                    </div>
                    <div style="margin-top:5px;text-align:right;">
                        <button id="asr_config_save" style="padding:3px 12px;background:#4a7a4a;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:11px;">💾 Salvar</button>
                        <button id="asr_config_default" style="padding:3px 12px;background:#8a7a6a;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:11px;margin-left:4px;">↺ Padrao</button>
                    </div>
                </div>
                
                <div id="asr_info" style="padding:2px 10px 4px;font-size:11px;color:#5a3a0a;">
                    📤 Envia ' + config.amount + ' madeira + ' + config.amount + ' pedra + ' + config.amount + ' prata (' + (config.amount * 3) + ' total) a cada ' + (config.intervalo/60) + ' minutos<br>
                    📍 ' + config.from + ' -> ' + config.to + ' | ✅ Recursos >= ' + config.amount + ' cada + Capacidade >= ' + (config.amount * 3) + '
                </div>
                <div id="asr_log" style="padding:2px 10px 8px;font-size:12px;color:#2c1810;min-height:18px;font-weight:bold;"></div>
                <div style="padding:0 10px 4px;font-size:10px;color:#888;border-top:1px solid #ddd;margin-top:2px;">
                    ⏱ Ultima verificacao: <span id="asr_timestamp">Aguardando...</span>
                </div>
            </div>`;
        };

        module._tick = async function() {
            var config = this._getConfig();
            var logEl = uw.$('#asr_log');
            var timestampEl = uw.$('#asr_timestamp');
            var horaAtual = new Date().toLocaleTimeString();

            if (timestampEl.length) {
                timestampEl.text(horaAtual);
            }

            this.console.log('[AutoSend] Verificando ' + config.from + ' -> ' + config.to + '...');

            try {
                if (typeof ITowns === 'undefined' || !ITowns.towns || Object.keys(ITowns.towns).length === 0) {
                    if (logEl.length) {
                        logEl.text('Aguardando jogo...');
                        logEl.css('color', '#ffff00');
                    }
                    return;
                }

                var from = ITowns.towns[config.from];
                var to = ITowns.towns[config.to];

                if (!from || !to) {
                    if (logEl.length) {
                        logEl.text('Cidade ' + config.from + ' ou ' + config.to + ' nao existe!');
                        logEl.css('color', '#ff0000');
                    }
                    return;
                }

                var res = from.resources();
                var capacity = from.getAvailableTradeCapacity();

                if (res.wood < config.amount || res.stone < config.amount || res.iron < config.amount) {
                    if (logEl.length) {
                        logEl.text(horaAtual + ' ⏸ ' + '🪵' + Math.floor(res.wood) + ' 🪨' + Math.floor(res.stone) + ' ⚙' + Math.floor(res.iron));
                        logEl.css('color', '#ffff00');
                    }
                    return;
                }

                if (capacity < config.amount * 3) {
                    if (logEl.length) {
                        logEl.text(horaAtual + ' ⏸ Cap: ' + capacity);
                        logEl.css('color', '#ffff00');
                    }
                    return;
                }

                if (logEl.length) {
                    logEl.text(horaAtual + ' ⏳ Enviando ' + config.amount + ' de cada...');
                    logEl.css('color', '#ffff00');
                }

                var resultado = await this._sendResources(config.from, config.to, config.amount);

                if (resultado) {
                    if (logEl.length) {
                        logEl.text(horaAtual + ' ✅ ' + config.amount + ' de cada enviado!');
                        logEl.css('color', '#00ff00');
                    }
                    this.console.log('[AutoSend] ✅ ' + config.amount + ' de cada -> ' + to.getName());
                } else {
                    if (logEl.length) {
                        logEl.text(horaAtual + ' ❌ Falha no envio');
                        logEl.css('color', '#ff0000');
                    }
                    this.console.log('[AutoSend] ❌ Falha ao enviar');
                }

            } catch(e) {
                if (logEl.length) {
                    logEl.text('❌ ' + e.message);
                    logEl.css('color', '#ff0000');
                }
                this.console.log('[AutoSend] ❌ Erro: ' + e.message);
            }
        };

        module.start = function() {
            if (this._active) return;
            var config = this._getConfig();
            this._active = true;
            this.storage.save('asr_active', true);
            this._updateTitle();
            this.console.log('[AutoSend] ✅ Iniciado! ' + config.from + ' -> ' + config.to + ' | ' + config.amount + ' de cada | ' + (config.intervalo/60) + 'min');
            this._tick();
            if (this._intervalId) clearInterval(this._intervalId);
            this._intervalId = setInterval(function() { this._tick(); }.bind(this), config.intervalo * 1000);
        };

        var originalAfterRender = module.afterRender;
        module.afterRender = function() {
            if (originalAfterRender) originalAfterRender.call(this);

            var saveBtn = document.getElementById('asr_config_save');
            if (saveBtn) {
                var newSaveBtn = saveBtn.cloneNode(true);
                saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
                newSaveBtn.addEventListener('click', function() {
                    var fromEl = document.getElementById('asr_config_from');
                    var toEl = document.getElementById('asr_config_to');
                    var amountEl = document.getElementById('asr_config_amount');
                    var intervaloEl = document.getElementById('asr_config_intervalo');
                    
                    var from = parseInt(fromEl?.value) || 154;
                    var to = parseInt(toEl?.value) || 2195;
                    var amount = parseInt(amountEl?.value) || 500;
                    var intervalo = (parseInt(intervaloEl?.value) || 20) * 60;

                    if (from === to) {
                        alert('A cidade de origem e destino nao podem ser iguais!');
                        return;
                    }

                    this._saveConfig(from, to, amount, intervalo);
                    
                    var title = uw.$('#asr_title');
                    if (title.length) {
                        title.text('📦 Envio ' + from + ' -> ' + to + ' (' + amount + ' cada - ' + (intervalo/60) + 'min)');
                    }
                    
                    if (fromEl) fromEl.value = from;
                    if (toEl) toEl.value = to;
                    if (amountEl) amountEl.value = amount;
                    if (intervaloEl) intervaloEl.value = intervalo / 60;
                }.bind(this));
            }

            var defaultBtn = document.getElementById('asr_config_default');
            if (defaultBtn) {
                var newDefaultBtn = defaultBtn.cloneNode(true);
                defaultBtn.parentNode.replaceChild(newDefaultBtn, defaultBtn);
                newDefaultBtn.addEventListener('click', function() {
                    document.getElementById('asr_config_from').value = 154;
                    document.getElementById('asr_config_to').value = 2195;
                    document.getElementById('asr_config_amount').value = 500;
                    document.getElementById('asr_config_intervalo').value = 20;
                    
                    var logEl = uw.$('#asr_log');
                    if (logEl.length) {
                        logEl.text('Configuracao padrao carregada (154->2195, 500, 20min). Clique em "Salvar" para aplicar.');
                        logEl.css('color', '#888800');
                    }
                });
            }
        };

        console.log('[MultBot] ✅ AutoSendResources personalizado com configuracao!');
    }

    settingsStatus = function() {
        return this.statusPanel ? this.statusPanel.settings() : this._missingModuleHtml('Status');
    };

    settingsFarm = function() {
        var html = '';
        html += this.autoRuralLevel ? this.autoRuralLevel.settings() : this._missingModuleHtml('Auto Rural Level');
        html += this.autoRuralTrade ? this.autoRuralTrade.settings() : this._missingModuleHtml('Auto Rural Trade');
        return html;
    };

    settingsSendFree = function() {
        var html = '';
        html += this.autoSendResources ? this.autoSendResources.settings() : this._missingModuleHtml('Auto Send Resources');
        return html;
    };

    settingsBuild = function() {
        var html = '';
        html += this.autoGratis ? this.autoGratis.settings() : this._missingModuleHtml('Auto Gratis');
        html += this.autoBuild ? this.autoBuild.settings() : this._missingModuleHtml('Auto Build');
        return html;
    };

    settingsMix = function() {
        var html = '';
        html += this.autoBootcamp ? this.autoBootcamp.settings() : this._missingModuleHtml('Auto Bootcamp');
        html += this.autoParty ? this.autoParty.settings() : this._missingModuleHtml('Auto Party');
        html += this.autoHide ? this.autoHide.settings() : this._missingModuleHtml('Auto Hide');
        html += this.autoMilitia ? this.autoMilitia.settings() : this._missingModuleHtml('Auto Militia');
        html += this.autoQuest ? this.autoQuest.settings() : this._missingModuleHtml('Auto Quest');
        return html;
    };

    settingsAttack = function() {
        var html = '';
        html += this.autoAttack ? this.autoAttack.settings() : this._missingModuleHtml('Auto Dodge');
        return html;
    };

    settingsTrain = function() {
        var html = '';
        html += this.autoTrain ? this.autoTrain.settings() : this._missingModuleHtml('Auto Train');
        return html;
    };

    settingsMult = function() {
        var html = '';
        html += this.multTools ? this.multTools.settings() : this._missingModuleHtml('Mult Tools');
        html += this.colonizeShipSender ? this.colonizeShipSender.settings() : this._missingModuleHtml('Colonize Ship Sender');
        html += this.autoResearch ? this.autoResearch.settings() : this._missingModuleHtml('Auto Research');
        html += this.autoAresSacrifice ? this.autoAresSacrifice.settings() : this._missingModuleHtml('Auto Ares Sacrifice');
        return html;
    };

    _missingModuleHtml = function(name) {
        return '<div class="game_border" style="margin-bottom:20px;"><div style="padding:8px;font-size:11px;color:#f87171;">⚠ ' + multT('module_failed', { name: name }) + '</div></div>';
    };

    setup = function() {
        if (this.settingsFactory) this.settingsFactory.activate();

        uw.$('.gods_area_buttons').append(
            '<div class="circle_button mult_bot_settings" onclick="window.multBot.settingsFactory.openWindow()">' +
                '<div style="width:27px;height:27px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;color:#ffffff;text-shadow:0 0 12px rgba(255,255,255,0.3),0 0 25px rgba(255,255,255,0.1);" class="icon js-caption" title="MultBot">N</div>' +
            '</div>'
        );

        var editController = function() {
            var townController = uw.layout_main_controller.sub_controllers.find(function(controller) { return controller.name === 'town_name_area'; });
            if (!townController) {
                setTimeout(editController, 2500);
                return;
            }

            var oldRender = townController.controller.town_groups_list_view.render;
            townController.controller.town_groups_list_view.render = function() {
                oldRender.call(this);
                var both = '<div style="position:absolute;display:flex;align-items:center;justify-content:center;font-size:13px;margin:1px;position:absolute;height:20px;width:25px;right:18px;" title="' + multT('tooltip_build_and_train') + '">🔨🔧</div>';
                var build = '<div style="display:flex;align-items:center;justify-content:center;font-size:14px;margin:1px;position:absolute;height:20px;width:25px;right:18px;" title="' + multT('tooltip_build') + '">🔨</div>';
                var troop = '<div style="display:flex;align-items:center;justify-content:center;font-size:14px;margin:1px;position:absolute;height:20px;width:25px;right:18px;" title="' + multT('tooltip_train') + '">🔧</div>';
                var townIds = uw.multBot.autoBuild ? Object.keys(uw.multBot.autoBuild.towns_buildings) : [];
                var troopsIds = uw.multBot.autoTrain ? uw.multBot.autoTrain.getActiveList().map(function(entry) { return entry.toString(); }) : [];
                uw.$('.town_group_town').each(function() {
                    var townId = parseInt(uw.$(this).attr('data-townid'));
                    var is_build = townIds.includes(townId.toString());
                    var id_troop = troopsIds.includes(townId.toString());
                    if (!id_troop && !is_build) return;
                    if (id_troop && !is_build) uw.$(this).prepend(troop);
                    else if (is_build && !id_troop) uw.$(this).prepend(build);
                    else uw.$(this).prepend(both);
                });
            };
        };

        setTimeout(editController, 2500);
    };

    createMultMenu = function() {
        var $menu = uw.$('<div id="mult_menu" class="toolbar_activities"></div>');
        $menu.css({
            'position': 'absolute',
            'top': '3px',
            'left': '400px',
            'z-index': '1000'
        });

        var $left = uw.$('<div class="left"></div>');
        var $middle = uw.$('<div class="middle"></div>');
        var $right = uw.$('<div class="right"></div>');

        $menu.append($left, $middle, $right);
        uw.$("#ui_box").prepend($menu);

        return $middle;
    }

};

if (!window.__multbot_loaded__) {
    window.__multbot_loaded__ = true;
    var _multbot_loader = setInterval(function() {
        if (uw.$("#loader").length > 0) return;
        uw.multBot = new MultBot();
        clearInterval(_multbot_loader);
    }, 100);
}
