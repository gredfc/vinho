// ═══════════════════════════════════════════════════════════════════════
// 📦 MÓDULO: AutoFarm (MODERNBOT CLONE) - SEM DROPDOWN
// ═══════════════════════════════════════════════════════════════════════

if (typeof AutoFarm === 'undefined') {
    
var AutoFarm = class extends MultUtil {
    constructor(c, s) {
        super(c, s);

        // Load the settings
        this.timing = this.storage.load('af_timing', 300000);
        this.percent = this.storage.load('af_percent', 1);
        this.active = this.storage.load('af_active', false);
        this.gui = this.storage.load('af_gui', false);

        // ⭐ REMOVIDO: dropdown e activity (só visível na aba Farm)
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
       UPDATE BUTTONS
       ============================================================ */
    updateButtons = () => {
        // Não precisa de botões no dropdown
    };

    /* ============================================================
       TOGGLE
       ============================================================ */
    toggle = () => {
        if (this.active) {
            clearInterval(this.active);
            this.active = null;
            this.console.log('[AutoFarm] ⏹️ AutoFarm parado');
            this.log('⏹️ AutoFarm parado', 'warning');
            this.storage.save('af_active', false);
        } else {
            this.updateTimer();
            this.active = setInterval(this.main.bind(this), 5000);
            this.console.log('[AutoFarm] 🚀 AutoFarm iniciado!');
            this.log('🚀 AutoFarm iniciado!', 'success');
            this.storage.save('af_active', true);
        }
        if (this._settingsRendered) this.renderSettings();
    };

    /* ============================================================
       GENERATE LIST
       ============================================================ */
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

    /* ============================================================
       GET NEXT COLLECTION
       ============================================================ */
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

    /* ============================================================
       UPDATE TIMER
       ============================================================ */
    updateTimer = () => {
        const currentTime = Date.now();
        this.timer -= currentTime - this.lastTime;
        this.lastTime = currentTime;
        this.updateDropdownUI();
    };

    /* ============================================================
       UPDATE DROPDOWN UI (simplificado)
       ============================================================ */
    updateDropdownUI = () => {
        // Não precisa de dropdown
    };

    /* ============================================================
       CLAIM
       ============================================================ */
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

    /* ============================================================
       CLAIM ONE BY ONE
       ============================================================ */
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

    /* ============================================================
       CLAIM SINGLE
       ============================================================ */
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

    /* ============================================================
       CLAIM MULTIPLE
       ============================================================ */
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

    /* ============================================================
       FAKE OPENING
       ============================================================ */
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

    /* ============================================================
       FAKE SELECT ALL
       ============================================================ */
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

    /* ============================================================
       FAKE UPDATE
       ============================================================ */
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

    /* ============================================================
       FAKE GUI UPDATE
       ============================================================ */
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

    /* ============================================================
       GET TOTAL RESOURCES
       ============================================================ */
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

    /* ============================================================
       MAIN LOOP
       ============================================================ */
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

    /* ============================================================
       SLEEP
       ============================================================ */
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

    /* ============================================================
       LOG
       ============================================================ */
    log = (message, type = 'info') => {
        // Log apenas para console
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: '📘' };
        const icon = icons[type] || '📘';
        console.log('[AutoFarm] ' + icon + ' ' + message);
    };

    /* ============================================================
       SETTINGS PARA A ABA FARM (ÚNICA INTERFACE)
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
       RENDER SETTINGS
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
                self.renderSettings();
            });
        });

        document.getElementById('af-btn-start-settings')?.addEventListener('click', function(e) {
            e.preventDefault();
            self.toggle();
        });

        document.getElementById('af-btn-stop-settings')?.addEventListener('click', function(e) {
            e.preventDefault();
            if (self.active) {
                clearInterval(self.active);
                self.active = null;
                self.storage.save('af_active', false);
                self.console.log('[AutoFarm] ⏹️ AutoFarm parado');
                self.log('⏹️ AutoFarm parado', 'warning');
                self.renderSettings();
            }
        });
    };
}

console.log('[MultBot] ✅ AutoFarm registado (sem dropdown)');

} else {
    console.log('[MultBot] ⚠️ AutoFarm já existe, a usar o existente');
}
