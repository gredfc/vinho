// ═══════════════════════════════════════════════════════════════════════
// 🛡️ FALLBACK PARA GM_addStyle - ANTES DE TUDO
// ═══════════════════════════════════════════════════════════════════════

// Se GM_addStyle não estiver definido, criar uma implementação
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
// 📦 MULTBOT
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

        // ⭐ AUTO SEND RESOURCES (TEU SCRIPT) - Inicializado e integrado
        this.autoSendResources  = this._safeInit('AutoSendResources', () => new AutoSendResources(this.console, this.storage));

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
                // ⭐ NOVA ABA "SEND FREE" COM O TEU SCRIPT
                {
                    title: '📤 Send Free',
                    id: 'send_free',
                    render: this.settingsSendFree,
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

    settingsStatus = () => {
        return this.statusPanel ? this.statusPanel.settings() : this._missingModuleHtml('Status');
    };

    settingsFarm = () => {
        let html = '';
        html += this.autoRuralLevel ? this.autoRuralLevel.settings() : this._missingModuleHtml('Auto Rural Level');
        html += this.autoRuralTrade ? this.autoRuralTrade.settings() : this._missingModuleHtml('Auto Rural Trade');
        return html;
    };

    // ⭐ ABA "SEND FREE" - O TEU SCRIPT APARECE AQUI
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

// ═══════════════════════════════════════════════════════════════════════
// 📦 AUTO SEND RESOURCES - TEU SCRIPT INTEGRADO
// ═══════════════════════════════════════════════════════════════════════

class AutoSendResources extends MultUtil {
    constructor(c, s) {
        super(c, s);
        this._active = false;
        this._intervalId = null;
        this._lastRun = null;

        // ═══════════════════════════════════════════════════════
        //  CONFIGURAÇÃO DO TEU SCRIPT
        // ═══════════════════════════════════════════════════════
        this.FROM = 154;
        this.TO = 2195;
        this.AMOUNT = 500;
        this.INTERVALO = 1200; // 20 minutos em segundos
        // ═══════════════════════════════════════════════════════

        if (this.storage.load('asr_active', false)) {
            setTimeout(() => this.start(), 2500);
        }
    }

    settings = () => {
        requestAnimationFrame(() => this._updateTitle());
        return `
        <div class="game_border" style="margin-bottom:20px;">
            <div class="game_border_top"></div><div class="game_border_bottom"></div>
            <div class="game_border_left"></div><div class="game_border_right"></div>
            <div class="game_border_corner corner1"></div><div class="game_border_corner corner2"></div>
            <div class="game_border_corner corner3"></div><div class="game_border_corner corner4"></div>
            ${this.getTitleHtml('asr_title', `📦 Envio ${this.FROM} → ${this.TO} (${this.AMOUNT} cada - 20min)`, this.toggle, '', this._active)}
            <div style="padding:5px 10px;font-weight:bold;color:#2c1810;">
                Envia ${this.AMOUNT} madeira + ${this.AMOUNT} pedra + ${this.AMOUNT} prata (${this.AMOUNT * 3} total) a cada 20 minutos
            </div>
            <div style="padding:2px 10px 4px;font-size:11px;color:#5a3a0a;">
                📍 ${this.FROM} → ${this.TO} | ⏱ 20 min | ✅ Condições: recursos ≥ ${this.AMOUNT} cada + capacidade ≥ ${this.AMOUNT * 3}
            </div>
            <div id="asr_log" style="padding:2px 10px 8px;font-size:12px;color:#2c1810;min-height:18px;font-weight:bold;"></div>
            <div style="padding:0 10px 4px;font-size:10px;color:#888;border-top:1px solid #ddd;margin-top:2px;">
                ⏱ Última verificação: <span id="asr_timestamp">Aguardando...</span>
            </div>
        </div>`;
    };

    toggle = () => {
        if (this._active) this.stop();
        else this.start();
    };

    start() {
        if (this._active) return;
        this._active = true;
        this.storage.save('asr_active', true);
        this._updateTitle();
        this.console.log(`[AutoSend] ✅ Iniciado! ${this.FROM} → ${this.TO} | ${this.AMOUNT} de cada | 20min`);
        this._tick();
        this._intervalId = setInterval(() => this._tick(), this.INTERVALO * 1000);
    }

    stop() {
        this._active = false;
        this.storage.save('asr_active', false);
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
        this._updateTitle();
        this.console.log('[AutoSend] ⏹ Parado.');
        uw.$('#asr_log').text('⏹ Desativado');
    }

    _updateTitle() {
        const title = uw.$('#asr_title');
        if (title.length) {
            title.css('filter', this._active
                ? 'brightness(100%) saturate(186%) hue-rotate(241deg)'
                : '');
        }
    }

    async _tick() {
        const logEl = uw.$('#asr_log');
        const timestampEl = uw.$('#asr_timestamp');
        const horaAtual = new Date().toLocaleTimeString();

        if (timestampEl.length) {
            timestampEl.text(horaAtual);
        }

        this.console.log(`[AutoSend] 🔍 Verificando ${this.FROM} → ${this.TO}...`);

        try {
            if (typeof ITowns === 'undefined' || !ITowns.towns || Object.keys(ITowns.towns).length === 0) {
                if (logEl.length) {
                    logEl.text('⏳ Aguardando jogo...');
                    logEl.css('color', '#ffff00');
                }
                return;
            }

            const from = ITowns.towns[this.FROM];
            const to = ITowns.towns[this.TO];

            if (!from || !to) {
                if (logEl.length) {
                    logEl.text(`❌ Cidade ${this.FROM} ou ${this.TO} não existe!`);
                    logEl.css('color', '#ff0000');
                }
                return;
            }

            const res = from.resources();
            const capacity = from.getAvailableTradeCapacity();

            // Verifica recursos
            if (res.wood < this.AMOUNT || res.stone < this.AMOUNT || res.iron < this.AMOUNT) {
                if (logEl.length) {
                    logEl.text(`${horaAtual} ⏸ 🪵${Math.floor(res.wood)} 🪨${Math.floor(res.stone)} ⚙${Math.floor(res.iron)}`);
                    logEl.css('color', '#ffff00');
                }
                return;
            }

            // Verifica capacidade
            if (capacity < this.AMOUNT * 3) {
                if (logEl.length) {
                    logEl.text(`${horaAtual} ⏸ Cap: ${capacity}`);
                    logEl.css('color', '#ffff00');
                }
                return;
            }

            // ENVIA
            if (logEl.length) {
                logEl.text(`${horaAtual} ⏳ Enviando ${this.AMOUNT} de cada...`);
                logEl.css('color', '#ffff00');
            }

            const resultado = await this._sendResources(this.FROM, this.TO, this.AMOUNT);

            if (resultado) {
                if (logEl.length) {
                    logEl.text(`${horaAtual} ✅ ${this.AMOUNT} de cada enviado!`);
                    logEl.css('color', '#00ff00');
                }
                this.console.log(`[AutoSend] ✅ Enviado ${this.AMOUNT} de cada → ${to.getName()}`);
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

                const timer = setTimeout(() => {
                    resolve(false);
                }, 15000);

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

                resolve(false);
            } catch(e) {
                resolve(false);
            }
        });
    }
}
