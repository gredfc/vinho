// ============================================================
// 📦 MÓDULO: Autofarm (ModernBot Clone - ADAPTADO)
// ============================================================

var Autofarm = {
    settings: {
        timing: 300000,  // 5 minutos
        percent: 1,      // 100%
        active: false,
        gui: false
    },
    timer: 0,
    lastTime: 0,
    intervalId: null,
    polis_list: [],
    isRunning: false,
    farmButton: null,

    // ========================================
    // INIT
    // ========================================
    init: function() {
        ConsoleLog.Log('🌾 AutoFarm (ModernBot) inicializado', 1);
        this.loadSettings();
        this.lastTime = Date.now();
        
        // Se estava ativo, reinicia
        if (this.settings.active) {
            this.startFarm();
        }
    },

    // ========================================
    // LOAD SETTINGS
    // ========================================
    loadSettings: function() {
        try {
            var saved = localStorage.getItem('AutoFarm.Settings');
            if (saved) {
                var parsed = JSON.parse(saved);
                $.extend(this.settings, parsed);
            }
        } catch(e) {}
    },

    saveSettings: function() {
        try {
            localStorage.setItem('AutoFarm.Settings', JSON.stringify(this.settings));
        } catch(e) {}
    },

    // ========================================
    // GENERATE LIST - 1 cidade por ilha
    // ========================================
    generateList: function() {
        var islands_list = new Set();
        var polis_list = [];
        var minResource = 0;
        var min_percent = 0;

        try {
            var towns = MM.getOnlyCollectionByName('Town').models;

            for (var i = 0; i < towns.length; i++) {
                var town = towns[i];
                var attrs = town.attributes;
                if (attrs.on_small_island || islands_list.has(attrs.island_id)) continue;

                // Verifica percentual mínimo
                var resources = ITowns.getTown(attrs.id).resources();
                minResource = Math.min(resources.wood, resources.stone, resources.iron);
                min_percent = resources.storage > 0 ? minResource / resources.storage : 0;

                if (min_percent < this.settings.percent) continue;

                islands_list.add(attrs.island_id);
                polis_list.push(attrs.id);
            }
        } catch(e) {
            ConsoleLog.Log('⚠️ Erro ao gerar lista: ' + e.message, 1);
        }

        return polis_list;
    },

    // ========================================
    // GET NEXT COLLECTION
    // ========================================
    getNextCollection: function() {
        try {
            var collection = MM.getOnlyCollectionByName('FarmTownPlayerRelation');
            var models = collection?.models ?? [];
            if (models.length === 0) return 0;

            var lootCounts = {};
            for (var i = 0; i < models.length; i++) {
                var lootable_at = models[i].attributes.lootable_at;
                lootCounts[lootable_at] = (lootCounts[lootable_at] || 0) + 1;
            }

            var maxLootableTime = 0;
            var maxValue = 0;
            for (var time in lootCounts) {
                var value = lootCounts[time];
                if (value < maxValue) continue;
                maxLootableTime = parseInt(time);
                maxValue = value;
            }

            var seconds = maxLootableTime - Math.floor(Date.now() / 1000);
            return seconds > 0 ? seconds * 1000 : 0;
        } catch(e) {
            return 0;
        }
    },

    // ========================================
    // UPDATE TIMER
    // ========================================
    updateTimer: function() {
        var currentTime = Date.now();
        this.timer -= currentTime - this.lastTime;
        this.lastTime = currentTime;

        var displayTime = Math.max(0, Math.ceil(this.timer / 1000));
        var isCaptainActive = false;
        try {
            isCaptainActive = $('.advisor_frame.captain div').hasClass('captain_active');
        } catch(e) {}

        // Atualiza o botão
        if (this.farmButton) {
            if (this.settings.active) {
                var mins = Math.floor(displayTime / 60);
                var secs = displayTime % 60;
                this.farmButton.text('🔄 ' + mins + 'm ' + secs + 's');
                this.farmButton.addClass('running');
            } else {
                this.farmButton.text('▶️ Iniciar Farm');
                this.farmButton.removeClass('running');
            }
        }

        // Atualiza status
        var status = document.getElementById('farm-status');
        if (status) {
            if (this.settings.active) {
                status.textContent = '🟢 Executando (' + Math.floor(displayTime/60) + 'm ' + (displayTime%60) + 's)';
                status.style.color = '#44ff88';
            } else {
                status.textContent = '⏸️ Parado';
                status.style.color = '#ff6b6b';
            }
        }
    },

    // ========================================
    // CLAIM
    // ========================================
    claim: function() {
        return new Promise(async (resolve) => {
            try {
                var isCaptainActive = false;
                try {
                    isCaptainActive = $('.advisor_frame.captain div').hasClass('captain_active');
                } catch(e) {}

                this.polis_list = this.generateList();

                // Se capitão ativo e NÃO está em modo GUI
                if (isCaptainActive && !this.settings.gui) {
                    try {
                        await this.fakeOpening();
                        await this.sleep(Math.random() * 2000 + 1000);
                        await this.fakeSelectAll();
                        await this.sleep(Math.random() * 2000 + 1000);
                        if (this.settings.timing <= 600000) {
                            await this.claimMultiple(300, 600);
                        } else {
                            await this.claimMultiple(1200, 2400);
                        }
                        await this.fakeUpdate();
                        setTimeout(function() {
                            try { WMap.removeFarmTownLootCooldownIconAndRefreshLootTimers(); } catch(e) {}
                        }, 2000);
                        resolve();
                        return;
                    } catch(e) {
                        ConsoleLog.Log('[AutoFarm] Captain falhou: ' + e.message, 1);
                    }
                }

                // Se capitão ativo E modo GUI
                if (isCaptainActive && this.settings.gui) {
                    try {
                        await this.fakeGuiUpdate();
                        resolve();
                        return;
                    } catch(e) {
                        ConsoleLog.Log('[AutoFarm] Captain GUI falhou: ' + e.message, 1);
                    }
                }

                // Modo normal (sem capitão)
                await this.claimOneByOne();
                resolve();

            } catch(e) {
                ConsoleLog.Log('[AutoFarm] Erro no claim: ' + e.message, 1);
                resolve();
            }
        });
    },

    // ========================================
    // CLAIM ONE BY ONE
    // ========================================
    claimOneByOne: function() {
        return new Promise(async (resolve) => {
            try {
                var max = 60;
                var player_relation_models = MM.getOnlyCollectionByName('FarmTownPlayerRelation').models;
                var farm_town_models = MM.getOnlyCollectionByName('FarmTown').models;
                var now = Math.floor(Date.now() / 1000);

                for (var i = 0; i < this.polis_list.length; i++) {
                    var town_id = this.polis_list[i];
                    var town = ITowns.towns[town_id];
                    var x = town.getIslandCoordinateX();
                    var y = town.getIslandCoordinateY();

                    for (var j = 0; j < farm_town_models.length; j++) {
                        var farm_town = farm_town_models[j];
                        if (farm_town.attributes.island_x != x) continue;
                        if (farm_town.attributes.island_y != y) continue;

                        for (var k = 0; k < player_relation_models.length; k++) {
                            var relation = player_relation_models[k];
                            if (farm_town.attributes.id != relation.attributes.farm_town_id) continue;
                            if (relation.attributes.relation_status !== 1) continue;
                            if (relation.attributes.lootable_at !== null && now < relation.attributes.lootable_at) continue;

                            await this.claimSingle(town_id, relation.attributes.farm_town_id, relation.id, Math.ceil(this.settings.timing / 600000));
                            await this.sleep(500);
                            if (!max) { resolve(); return; }
                            max -= 1;
                        }
                    }
                }

                setTimeout(function() {
                    try { WMap.removeFarmTownLootCooldownIconAndRefreshLootTimers(); } catch(e) {}
                }, 2000);
                resolve();
            } catch(e) {
                resolve();
            }
        });
    },

    // ========================================
    // CLAIM SINGLE
    // ========================================
    claimSingle: function(town_id, farm_town_id, relation_id, option) {
        return new Promise((resolve) => {
            try {
                var data = {
                    model_url: 'FarmTownPlayerRelation/' + relation_id,
                    action_name: 'claim',
                    arguments: {
                        farm_town_id: farm_town_id,
                        type: 'resources',
                        option: option || 1
                    },
                    town_id: town_id,
                    nl_init: true
                };
                
                if (Game && Game.csrfToken) {
                    data.token = Game.csrfToken;
                }

                var timer = setTimeout(function() { resolve(); }, 10000);

                if (typeof gpAjax !== 'undefined' && gpAjax.ajaxPost) {
                    gpAjax.ajaxPost('frontend_bridge', 'execute', data, true,
                        function() { clearTimeout(timer); resolve(); },
                        function() { clearTimeout(timer); resolve(); }
                    );
                } else if (typeof GPAjax !== 'undefined' && GPAjax.ajaxPost) {
                    GPAjax.ajaxPost('frontend_bridge', 'execute', data, true,
                        function() { clearTimeout(timer); resolve(); },
                        function() { clearTimeout(timer); resolve(); }
                    );
                } else if (typeof $ !== 'undefined') {
                    $.ajax({
                        url: '/game/frontend_bridge?action=execute',
                        method: 'POST',
                        data: { json: JSON.stringify(data) },
                        dataType: 'json',
                        complete: function() { clearTimeout(timer); resolve(); }
                    });
                } else {
                    clearTimeout(timer);
                    resolve();
                }
            } catch(e) {
                resolve();
            }
        });
    },

    // ========================================
    // CLAIM MULTIPLE
    // ========================================
    claimMultiple: function(base, boost) {
        return new Promise((resolve) => {
            try {
                var data = {
                    towns: this.polis_list,
                    time_option_base: base,
                    time_option_booty: boost,
                    claim_factor: 'normal',
                    town_id: Game.townId,
                    nl_init: true
                };

                var timer = setTimeout(function() { resolve(); }, 30000);

                if (typeof gpAjax !== 'undefined' && gpAjax.ajaxPost) {
                    gpAjax.ajaxPost('farm_town_overviews', 'claim_loads_multiple', data, true,
                        function() { clearTimeout(timer); resolve(); },
                        function() { clearTimeout(timer); resolve(); }
                    );
                } else if (typeof GPAjax !== 'undefined' && GPAjax.ajaxPost) {
                    GPAjax.ajaxPost('farm_town_overviews', 'claim_loads_multiple', data, true,
                        function() { clearTimeout(timer); resolve(); },
                        function() { clearTimeout(timer); resolve(); }
                    );
                } else {
                    clearTimeout(timer);
                    resolve();
                }
            } catch(e) {
                resolve();
            }
        });
    },

    // ========================================
    // FAKE OPENING
    // ========================================
    fakeOpening: function() {
        return new Promise((resolve) => {
            try {
                var data = {
                    town_id: Game.townId,
                    nl_init: true
                };
                if (typeof gpAjax !== 'undefined' && gpAjax.ajaxGet) {
                    gpAjax.ajaxGet('farm_town_overviews', 'index', data, true, function() {
                        setTimeout(function() {
                            resolve();
                        }, 10);
                    });
                } else {
                    resolve();
                }
            } catch(e) {
                resolve();
            }
        });
    },

    // ========================================
    // FAKE SELECT ALL
    // ========================================
    fakeSelectAll: function() {
        return new Promise((resolve) => {
            try {
                var data = {
                    town_ids: this.polis_list,
                    town_id: Game.townId,
                    nl_init: true
                };
                if (typeof gpAjax !== 'undefined' && gpAjax.ajaxGet) {
                    gpAjax.ajaxGet('farm_town_overviews', 'get_farm_towns_from_multiple_towns', data, true,
                        function() { resolve(); },
                        function() { resolve(); }
                    );
                } else {
                    resolve();
                }
            } catch(e) {
                resolve();
            }
        });
    },

    // ========================================
    // FAKE UPDATE
    // ========================================
    fakeUpdate: function() {
        return new Promise((resolve) => {
            try {
                var town = ITowns.getCurrentTown();
                var booty = town.getResearches().attributes;
                var trade_office = town.getBuildings().attributes;
                var data = {
                    island_x: town.getIslandCoordinateX(),
                    island_y: town.getIslandCoordinateY(),
                    current_town_id: town.id,
                    booty_researched: booty.booty ? 1 : 0,
                    diplomacy_researched: '',
                    trade_office: trade_office.trade_office ? 1 : 0,
                    town_id: town.id,
                    nl_init: true
                };
                if (typeof gpAjax !== 'undefined' && gpAjax.ajaxGet) {
                    gpAjax.ajaxGet('farm_town_overviews', 'get_farm_towns_for_town', data, true,
                        function() { resolve(); },
                        function() { resolve(); }
                    );
                } else {
                    resolve();
                }
            } catch(e) {
                resolve();
            }
        });
    },

    // ========================================
    // FAKE GUI UPDATE
    // ========================================
    fakeGuiUpdate: function() {
        return new Promise((resolve) => {
            try {
                // Abre o overview de farm
                $(".toolbar_button.premium .icon").trigger('mouseenter');
                setTimeout(function() {
                    $(".farm_town_overview a").trigger('click');
                    setTimeout(function() {
                        $(".checkbox.select_all").trigger("click");
                        setTimeout(function() {
                            $("#fto_claim_button").trigger("click");
                            setTimeout(function() {
                                var el = $(".confirmation .btn_confirm.button_new");
                                if (el.length) {
                                    el.trigger("click");
                                }
                                setTimeout(function() {
                                    $(".icon_right.icon_type_speed.ui-dialog-titlebar-close").trigger("click");
                                    resolve();
                                }, 2000);
                            }, 1500);
                        }, 1500);
                    }, 1500);
                }, 1500);
            } catch(e) {
                resolve();
            }
        });
    },

    // ========================================
    // SLEEP
    // ========================================
    sleep: function(ms, stdDev) {
        return new Promise((resolve) => {
            if (typeof stdDev === 'undefined') {
                setTimeout(resolve, ms);
                return;
            }
            var u = 0, v = 0;
            while (u === 0) u = Math.random();
            while (v === 0) v = Math.random();
            var num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            num = num * stdDev + ms;
            setTimeout(resolve, num);
        });
    },

    // ========================================
    // MAIN - Loop principal
    // ========================================
    main: function() {
        var self = this;
        (async function() {
            try {
                var next_collection = self.getNextCollection();
                if (next_collection && (self.timer > next_collection + 60000 || self.timer < next_collection)) {
                    self.timer = next_collection + Math.floor(Math.random() * 20000) + 10000;
                }

                if (self.timer < 1) {
                    self.polis_list = self.generateList();
                    if (self.intervalId) {
                        clearInterval(self.intervalId);
                        self.intervalId = null;
                    }

                    await self.claim();

                    var rand = Math.floor(Math.random() * 20000) + 10000;
                    self.timer = self.settings.timing + rand;
                    if (self.timer < next_collection) {
                        self.timer = next_collection + rand;
                    }

                    self.startInterval();
                }

                self.updateTimer();
            } catch(e) {
                ConsoleLog.Log('[AutoFarm] Erro no main: ' + e.message, 1);
                if (!self.intervalId) {
                    self.startInterval();
                }
            }
        })();
    },

    // ========================================
    // START INTERVAL
    // ========================================
    startInterval: function() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.settings.active) {
            this.intervalId = setInterval(this.main.bind(this), 1000);
        }
    },

    // ========================================
    // START FARM
    // ========================================
    startFarm: function() {
        if (this.settings.active) return;
        this.settings.active = true;
        this.saveSettings();
        this.lastTime = Date.now();
        this.startInterval();
        ConsoleLog.Log('🌾 AutoFarm iniciado!', 1);
        this.updateButtonUI(true);
    },

    // ========================================
    // STOP FARM
    // ========================================
    stopFarm: function() {
        if (!this.settings.active) return;
        this.settings.active = false;
        this.saveSettings();
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        ConsoleLog.Log('⏹️ AutoFarm parado', 1);
        this.updateButtonUI(false);
    },

    // ========================================
    // TOGGLE
    // ========================================
    toggle: function() {
        if (this.settings.active) {
            this.stopFarm();
        } else {
            this.startFarm();
        }
    },

    // ========================================
    // UPDATE BUTTON UI
    // ========================================
    updateButtonUI: function(running) {
        if (this.farmButton) {
            if (running) {
                this.farmButton.text('🔄 Iniciado...');
                this.farmButton.addClass('running');
                this.farmButton.removeClass('stopped');
            } else {
                this.farmButton.text('▶️ Iniciar Farm');
                this.farmButton.removeClass('running');
                this.farmButton.addClass('stopped');
            }
        }
        var status = document.getElementById('farm-status');
        if (status) {
            if (running) {
                status.textContent = '🟢 Executando';
                status.style.color = '#44ff88';
            } else {
                status.textContent = '⏸️ Parado';
                status.style.color = '#ff6b6b';
            }
        }
    },

    // ========================================
    // CONTENT SETTINGS - Aba Farm
    // ========================================
    contentSettings: function() {
        var self = this;

        var fieldset = $('<fieldset/>', {
            id: 'Autofarm_settings',
            style: 'float:left; width:100%;'
        });

        fieldset.append($('<legend/>').html('🌾 AutoFarm (ModernBot)'));

        // Status
        var statusDiv = $('<div/>', {
            style: 'padding:10px 0;color:#c8a86e;font-size:13px;clear:both;'
        }).html('📌 Estado: <span id="farm-status" style="color:' + (this.settings.active ? '#44ff88' : '#ff6b6b') + ';">' + (this.settings.active ? '🟢 Executando' : '⏸️ Parado') + '</span>');
        fieldset.append(statusDiv);

        // Botão Iniciar/Parar
        var startBtn = FormBuilder.button({
            name: this.settings.active ? '🔄 Iniciado...' : '▶️ Iniciar Farm',
            style: 'top:10px;'
        });
        this.farmButton = startBtn;

        startBtn.on('click', function(e) {
            e.preventDefault();
            self.toggle();
        });

        fieldset.append(startBtn);

        // Intervalo
        fieldset.append($('<div/>', { style: 'padding:8px 0;' }).html('<span style="color:#d4a017;font-weight:bold;">⏱️ Intervalo:</span>'));

        var timeGroup = $('<div/>', { style: 'display:flex; gap:6px; padding:5px 0; flex-wrap:wrap;' });

        var btn5 = FormBuilder.button({ name: '5 min', style: 'padding:3px 12px;font-size:11px;' + (this.settings.timing === 300000 ? 'background:#4a7a3a;border-color:#6a9a5a;color:#fff;' : '') });
        btn5.on('click', function(e) {
            e.preventDefault();
            self.settings.timing = 300000;
            self.saveSettings();
            self.updateButtonsUI();
            ConsoleLog.Log('⏱️ Intervalo: 5 minutos', 1);
        });
        timeGroup.append(btn5);

        var btn10 = FormBuilder.button({ name: '10 min', style: 'padding:3px 12px;font-size:11px;' + (this.settings.timing === 600000 ? 'background:#4a7a3a;border-color:#6a9a5a;color:#fff;' : '') });
        btn10.on('click', function(e) {
            e.preventDefault();
            self.settings.timing = 600000;
            self.saveSettings();
            self.updateButtonsUI();
            ConsoleLog.Log('⏱️ Intervalo: 10 minutos', 1);
        });
        timeGroup.append(btn10);

        var btn20 = FormBuilder.button({ name: '20 min', style: 'padding:3px 12px;font-size:11px;' + (this.settings.timing === 1200000 ? 'background:#4a7a3a;border-color:#6a9a5a;color:#fff;' : '') });
        btn20.on('click', function(e) {
            e.preventDefault();
            self.settings.timing = 1200000;
            self.saveSettings();
            self.updateButtonsUI();
            ConsoleLog.Log('⏱️ Intervalo: 20 minutos', 1);
        });
        timeGroup.append(btn20);

        fieldset.append(timeGroup);

        // Armazenamento
        fieldset.append($('<div/>', { style: 'padding:8px 0;' }).html('<span style="color:#d4a017;font-weight:bold;">📊 Armazenamento:</span>'));

        var percentGroup = $('<div/>', { style: 'display:flex; gap:6px; padding:5px 0; flex-wrap:wrap;' });

        var btn80 = FormBuilder.button({ name: '80%', style: 'padding:3px 12px;font-size:11px;' + (this.settings.percent === 0.8 ? 'background:#4a7a3a;border-color:#6a9a5a;color:#fff;' : '') });
        btn80.on('click', function(e) {
            e.preventDefault();
            self.settings.percent = 0.8;
            self.saveSettings();
            self.updateButtonsUI();
            ConsoleLog.Log('📊 Armazenamento: 80%', 1);
        });
        percentGroup.append(btn80);

        var btn90 = FormBuilder.button({ name: '90%', style: 'padding:3px 12px;font-size:11px;' + (this.settings.percent === 0.9 ? 'background:#4a7a3a;border-color:#6a9a5a;color:#fff;' : '') });
        btn90.on('click', function(e) {
            e.preventDefault();
            self.settings.percent = 0.9;
            self.saveSettings();
            self.updateButtonsUI();
            ConsoleLog.Log('📊 Armazenamento: 90%', 1);
        });
        percentGroup.append(btn90);

        var btn100 = FormBuilder.button({ name: '100%', style: 'padding:3px 12px;font-size:11px;' + (this.settings.percent === 1 ? 'background:#4a7a3a;border-color:#6a9a5a;color:#fff;' : '') });
        btn100.on('click', function(e) {
            e.preventDefault();
            self.settings.percent = 1;
            self.saveSettings();
            self.updateButtonsUI();
            ConsoleLog.Log('📊 Armazenamento: 100%', 1);
        });
        percentGroup.append(btn100);

        fieldset.append(percentGroup);

        // Modo GUI
        fieldset.append($('<div/>', { style: 'padding:8px 0;' }).html('<span style="color:#d4a017;font-weight:bold;">🖥️ Modo GUI:</span>'));

        var guiGroup = $('<div/>', { style: 'display:flex; gap:6px; padding:5px 0; flex-wrap:wrap;' });

        var btnGuiOn = FormBuilder.button({ name: 'ON', style: 'padding:3px 12px;font-size:11px;' + (this.settings.gui ? 'background:#4a7a3a;border-color:#6a9a5a;color:#fff;' : '') });
        btnGuiOn.on('click', function(e) {
            e.preventDefault();
            self.settings.gui = true;
            self.saveSettings();
            self.updateButtonsUI();
            ConsoleLog.Log('🖥️ Modo GUI: ON', 1);
        });
        guiGroup.append(btnGuiOn);

        var btnGuiOff = FormBuilder.button({ name: 'OFF', style: 'padding:3px 12px;font-size:11px;' + (!this.settings.gui ? 'background:#4a7a3a;border-color:#6a9a5a;color:#fff;' : '') });
        btnGuiOff.on('click', function(e) {
            e.preventDefault();
            self.settings.gui = false;
            self.saveSettings();
            self.updateButtonsUI();
            ConsoleLog.Log('🖥️ Modo GUI: OFF', 1);
        });
        guiGroup.append(btnGuiOff);

        fieldset.append(guiGroup);

        // Informações adicionais
        fieldset.append($('<div/>', {
            style: 'padding:10px 0;color:#a89070;font-size:11px;border-top:1px solid #2a1f0e;margin-top:8px;'
        }).html('⚡ Premium Captain necessário para farm rápido<br>📌 1 cidade por ilha | Coleta automática'));

        // Atualiza os botões
        this.updateButtonsUI();

        // Atualiza o timer a cada segundo
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
        }
        this._timerInterval = setInterval(function() {
            if (self.settings.active) {
                self.updateTimer();
            }
        }, 1000);

        return fieldset;
    },

    // ========================================
    // UPDATE BUTTONS UI
    // ========================================
    updateButtonsUI: function() {
        var self = this;
        // Atualiza o estado do botão principal
        if (this.farmButton) {
            if (this.settings.active) {
                this.farmButton.text('🔄 Iniciado...');
                this.farmButton.addClass('running');
                this.farmButton.removeClass('stopped');
            } else {
                this.farmButton.text('▶️ Iniciar Farm');
                this.farmButton.removeClass('running');
                this.farmButton.addClass('stopped');
            }
        }

        // Atualiza os botões de intervalo
        $('#Autofarm_settings .button_new').each(function() {
            var text = $(this).text().trim();
            if (text === '5 min' || text === '10 min' || text === '20 min') {
                $(this).css('background', '');
                $(this).css('border-color', '');
                $(this).css('color', '');
            }
            if (text === '80%' || text === '90%' || text === '100%') {
                $(this).css('background', '');
                $(this).css('border-color', '');
                $(this).css('color', '');
            }
            if (text === 'ON' || text === 'OFF') {
                $(this).css('background', '');
                $(this).css('border-color', '');
                $(this).css('color', '');
            }
        });

        // Marca os ativos
        $('#Autofarm_settings .button_new').each(function() {
            var text = $(this).text().trim();
            if ((text === '5 min' && self.settings.timing === 300000) ||
                (text === '10 min' && self.settings.timing === 600000) ||
                (text === '20 min' && self.settings.timing === 1200000)) {
                $(this).css('background', 'linear-gradient(135deg,#2d5a1e,#3d7a2e)');
                $(this).css('border-color', '#44ff88');
                $(this).css('color', '#44ff88');
            }
            if ((text === '80%' && self.settings.percent === 0.8) ||
                (text === '90%' && self.settings.percent === 0.9) ||
                (text === '100%' && self.settings.percent === 1)) {
                $(this).css('background', 'linear-gradient(135deg,#2d5a1e,#3d7a2e)');
                $(this).css('border-color', '#44ff88');
                $(this).css('color', '#44ff88');
            }
            if ((text === 'ON' && self.settings.gui) ||
                (text === 'OFF' && !self.settings.gui)) {
                $(this).css('background', 'linear-gradient(135deg,#2d5a1e,#3d7a2e)');
                $(this).css('border-color', '#44ff88');
                $(this).css('color', '#44ff88');
            }
        });

        var status = document.getElementById('farm-status');
        if (status) {
            if (self.settings.active) {
                status.textContent = '🟢 Executando';
                status.style.color = '#44ff88';
            } else {
                status.textContent = '⏸️ Parado';
                status.style.color = '#ff6b6b';
            }
        }
    }
};
