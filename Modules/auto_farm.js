// ============================================================
// 📦 MÓDULO: AutoFarm - ModernBot Clone
// ============================================================

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

        // Open and close the dropdown with the mouse
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

        // Update the dropdown UI
        this.updateDropdownUI();
    };

    /* ============================================================
       CREATE BUTTON
       ============================================================ */
    createButton = (id, label, callback) => {
        return uw.$(`<button id="${id}" class="button_new" style="font-size:11px;padding:4px 10px;margin:2px;border-radius:4px;">${label}</button>`)
            .on('click', callback);
    };

    /* ============================================================
       UPDATE BUTTONS
       ============================================================ */
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

        // Botões principais
        if (this.active) {
            this.$startBtn.text('▶ Rodando...');
            this.$startBtn.css('opacity', '0.6');
            this.$stopBtn.css('display', 'inline-block');
        } else {
            this.$startBtn.text('▶ Iniciar');
            this.$startBtn.css('opacity', '1');
            this.$stopBtn.css('display', 'inline-block');
        }

        // Atualiza dropdown
        this.updateDropdownUI();
    };

    /* ============================================================
       UPDATE DROPDOWN UI
       ============================================================ */
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

        // Atualiza o contador
        var isCaptainActive = false;
        try {
            isCaptainActive = $('.advisor_frame.captain div').hasClass('captain_active');
        } catch(e) {}
        this.$count.text(Math.round(Math.max(this.timer, 0) / 1000));
        this.$count.css('color', isCaptainActive ? "#1aff1a" : "yellow");
    };

    /* ============================================================
       TOGGLE DURATION
       ============================================================ */
    toggleDuration = (event) => {
        const { id } = event.currentTarget;

        if (id == "modern_farm_5") this.timing = 300000;
        if (id == "modern_farm_10") this.timing = 600000;
        if (id == "modern_farm_20") this.timing = 1200000;

        this.storage.save('af_timing', this.timing);
        this.updateButtons();
        this.console.log('[AutoFarm] ⏱️ Intervalo: ' + (this.timing / 60000) + 'min');
        this.log('⏱️ Intervalo: ' + (this.timing / 60000) + 'min', 'info');
    };

    /* ============================================================
       TOGGLE STORAGE
       ============================================================ */
    toggleStorage = (event) => {
        const { id } = event.currentTarget;

        if (id == "modern_farm_80") this.percent = 0.8;
        if (id == "modern_farm_90") this.percent = 0.9;
        if (id == "modern_farm_100") this.percent = 1;

        this.storage.save('af_percent', this.percent);
        this.updateButtons();
        this.console.log('[AutoFarm] 📊 Armazenamento: ' + (this.percent * 100) + '%');
        this.log('📊 Armazenamento: ' + (this.percent * 100) + '%', 'info');
    };

    /* ============================================================
       TOGGLE GUI
       ============================================================ */
    toggleGui = (event) => {
        const { id } = event.currentTarget;

        if (id == "modern_farm_gui_on") this.gui = true;
        if (id == "modern_farm_gui_off") this.gui = false;

        this.storage.save('af_gui', this.gui);
        this.updateButtons();
        this.console.log('[AutoFarm] 🖥️ GUI Mode: ' + (this.gui ? 'ON' : 'OFF'));
        this.log('🖥️ GUI Mode: ' + (this.gui ? 'ON' : 'OFF'), 'info');
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
    };

    /* ============================================================
       GENERATE LIST - 1 polis per island
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

        const isCaptainActive = uw.GameDataPremium.isAdvisorActivated('captain');
        this.$count.text(Math.round(Math.max(this.timer, 0) / 1000));
        this.$count.css('color', isCaptainActive ? "#1aff1a" : "yellow");
        this.updateDropdownUI();
    };

    /* ============================================================
       CLAIM - MAIN
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
            // If the captain is active and NOT in GUI mode
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

            // If the captain is active and in GUI mode
            if (isCaptainActive && this.gui) {
                try {
                    await this.fakeGuiUpdate();
                    this._claimInProgress = false;
                    return;
                } catch (e) {
                    this.console.log('[AutoFarm] Captain GUI path failed: ' + (e?.message ?? e));
                }
            }

            // Fallback: claim one by one
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
                // Open the farm town overview
                uw.$(".toolbar_button.premium .icon").trigger('mouseenter');
                await this.sleep(1019.39, 127.54);

                // Click on the farm town overview
                uw.$(".farm_town_overview a").trigger('click');
                await this.sleep(1156.65, 165.62);

                // Select all the polis
                uw.$(".checkbox.select_all").trigger("click");
                await this.sleep(1036.20, 135.69);

                // Claim the resources
                uw.$("#fto_claim_button").trigger("click");
                await this.sleep(1036.20, 135.69);

                // Confirm the claim if needed
                const el = uw.$(".confirmation .btn_confirm.button_new");
                if (el.length) {
                    el.trigger("click");
                    await this.sleep(1036.20, 135.69);
                }

                // Close the window
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

        let total = {
            wood: 0,
            stone: 0,
            iron: 0,
            storage: 0,
        };

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
       SETTINGS - Para o painel do MultBot
       ============================================================ */
    settings = () => {
        return this.settingsHTML();
    };

    settingsHTML = () => {
        // Força a atualização da UI
        setTimeout(() => {
            this.updateButtons();
            this.updateDropdownUI();
        }, 100);

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
                    <span id="af-status-text-settings" style="color:${this.active ? '#44ff88' : '#ff6b6b'};">${this.active ? '🟢 Executando' : '⏸️ Parado'}</span>
                    <span id="af-timer-settings" style="color:#ffd700;font-family:monospace;">${this.formatTimer()}</span>
                </div>

                <!-- Intervalo -->
                <div style="padding:5px 0;">
                    <span style="color:#d4a017;font-weight:bold;">⏱️ Intervalo:</span>
                    <div style="display:flex;gap:6px;padding:5px 0;flex-wrap:wrap;">
                        <button class="button_new" id="af-btn-5min" style="font-size:11px;padding:3px 12px;${this.timing === 300000 ? 'background:linear-gradient(135deg,#2d5a1e,#3d7a2e);border-color:#44ff88;color:#44ff88;' : ''}">5 min</button>
                        <button class="button_new" id="af-btn-10min" style="font-size:11px;padding:3px 12px;${this.timing === 600000 ? 'background:linear-gradient(135deg,#2d5a1e,#3d7a2e);border-color:#44ff88;color:#44ff88;' : ''}">10 min</button>
                        <button class="button_new" id="af-btn-20min" style="font-size:11px;padding:3px 12px;${this.timing === 1200000 ? 'background:linear-gradient(135deg,#2d5a1e,#3d7a2e);border-color:#44ff88;color:#44ff88;' : ''}">20 min</button>
                    </div>
                </div>

                <!-- Armazenamento -->
                <div style="padding:5px 0;">
                    <span style="color:#d4a017;font-weight:bold;">📊 Armazenamento:</span>
                    <div style="display:flex;gap:6px;padding:5px 0;flex-wrap:wrap;">
                        <button class="button_new" id="af-btn-80" style="font-size:11px;padding:3px 12px;${this.percent === 0.8 ? 'background:linear-gradient(135deg,#2d5a1e,#3d7a2e);border-color:#44ff88;color:#44ff88;' : ''}">80%</button>
                        <button class="button_new" id="af-btn-90" style="font-size:11px;padding:3px 12px;${this.percent === 0.9 ? 'background:linear-gradient(135deg,#2d5a1e,#3d7a2e);border-color:#44ff88;color:#44ff88;' : ''}">90%</button>
                        <button class="button_new" id="af-btn-100" style="font-size:11px;padding:3px 12px;${this.percent === 1 ? 'background:linear-gradient(135deg,#2d5a1e,#3d7a2e);border-color:#44ff88;color:#44ff88;' : ''}">100%</button>
                    </div>
                </div>

                <!-- GUI -->
                <div style="padding:5px 0;">
                    <span style="color:#d4a017;font-weight:bold;">🖥️ Modo GUI:</span>
                    <div style="display:flex;gap:6px;padding:5px 0;flex-wrap:wrap;">
                        <button class="button_new" id="af-btn-gui-on" style="font-size:11px;padding:3px 12px;${this.gui ? 'background:linear-gradient(135deg,#2d5a1e,#3d7a2e);border-color:#44ff88;color:#44ff88;' : ''}">ON</button>
                        <button class="button_new" id="af-btn-gui-off" style="font-size:11px;padding:3px 12px;${!this.gui ? 'background:linear-gradient(135deg,#2d5a1e,#3d7a2e);border-color:#44ff88;color:#44ff88;' : ''}">OFF</button>
                    </div>
                </div>

                <!-- Botões Principais -->
                <div style="display:flex;gap:6px;padding:10px 0;border-top:1px solid #2a1f0e;margin-top:5px;">
                    <button class="button_new" id="af-btn-start" style="flex:1;background:linear-gradient(180deg,#4a7a3a,#2d5a1d);border-color:#6a9a5a;color:#fff;font-weight:bold;padding:8px 12px;">
                        ${this.active ? '🔄 Executando...' : '▶️ Iniciar Farm'}
                    </button>
                    <button class="button_new" id="af-btn-stop" style="flex:1;background:linear-gradient(180deg,#7a3a3a,#5a2a2a);border-color:#9a5a5a;color:#fff;font-weight:bold;padding:8px 12px;">
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
       FORMAT TIMER
       ============================================================ */
    formatTimer = () => {
        var seconds = Math.max(0, Math.ceil(this.timer / 1000));
        var mins = Math.floor(seconds / 60);
        var secs = seconds % 60;
        return mins + 'm ' + secs + 's';
    };

    /* ============================================================
       BIND EVENTS - Chamado depois do settings ser renderizado
       ============================================================ */
    bindEvents = () => {
        var self = this;

        // Intervalo
        document.getElementById('af-btn-5min')?.addEventListener('click', function() {
            self.timing = 300000;
            self.storage.save('af_timing', self.timing);
            self.updateButtons();
            self.console.log('[AutoFarm] ⏱️ Intervalo: 5min');
            self.renderSettings();
        });

        document.getElementById('af-btn-10min')?.addEventListener('click', function() {
            self.timing = 600000;
            self.storage.save('af_timing', self.timing);
            self.updateButtons();
            self.console.log('[AutoFarm] ⏱️ Intervalo: 10min');
            self.renderSettings();
        });

        document.getElementById('af-btn-20min')?.addEventListener('click', function() {
            self.timing = 1200000;
            self.storage.save('af_timing', self.timing);
            self.updateButtons();
            self.console.log('[AutoFarm] ⏱️ Intervalo: 20min');
            self.renderSettings();
        });

        // Armazenamento
        document.getElementById('af-btn-80')?.addEventListener('click', function() {
            self.percent = 0.8;
            self.storage.save('af_percent', self.percent);
            self.updateButtons();
            self.console.log('[AutoFarm] 📊 Armazenamento: 80%');
            self.renderSettings();
        });

        document.getElementById('af-btn-90')?.addEventListener('click', function() {
            self.percent = 0.9;
            self.storage.save('af_percent', self.percent);
            self.updateButtons();
            self.console.log('[AutoFarm] 📊 Armazenamento: 90%');
            self.renderSettings();
        });

        document.getElementById('af-btn-100')?.addEventListener('click', function() {
            self.percent = 1;
            self.storage.save('af_percent', self.percent);
            self.updateButtons();
            self.console.log('[AutoFarm] 📊 Armazenamento: 100%');
            self.renderSettings();
        });

        // GUI
        document.getElementById('af-btn-gui-on')?.addEventListener('click', function() {
            self.gui = true;
            self.storage.save('af_gui', self.gui);
            self.updateButtons();
            self.console.log('[AutoFarm] 🖥️ GUI: ON');
            self.renderSettings();
        });

        document.getElementById('af-btn-gui-off')?.addEventListener('click', function() {
            self.gui = false;
            self.storage.save('af_gui', self.gui);
            self.updateButtons();
            self.console.log('[AutoFarm] 🖥️ GUI: OFF');
            self.renderSettings();
        });

        // Start / Stop
        document.getElementById('af-btn-start')?.addEventListener('click', function() {
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

        document.getElementById('af-btn-stop')?.addEventListener('click', function() {
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

    /* ============================================================
       RENDER SETTINGS - Recarrega o painel
       ============================================================ */
    renderSettings = () => {
        // Atualiza o conteúdo no painel do MultBot
        var container = document.getElementById('af-settings-container');
        if (container) {
            container.innerHTML = this.settingsHTML();
            this.bindEvents();
        }
    };
}
