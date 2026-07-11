// ══════════════════════════════════════════════════════
//  MODULE: StatusPanel
//  Painel de status em tempo real de todos os módulos
//  Design elegante com tabela e linhas azuis
// ══════════════════════════════════════════════════════

var StatusPanel = class extends MultUtil {
    constructor(c, s) {
        super(c, s);
        this._interval = null;
        this._refreshTimeoutId = null;
        this._countdownInterval = null;
        this._nextRefreshAt = null;
        this._refreshMinutes = this.storage.load('refresh_minutes', 0);

        if (this._refreshMinutes > 0) {
            this._scheduleRefresh();
        }
    }

    settings = () => {
        requestAnimationFrame(() => this._startVisuals());
        return `
        <div style="padding:8px 12px;background:linear-gradient(135deg, #1a1a2e, #16213e);border-radius:8px;margin-bottom:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;border:1px solid rgba(255,255,255,0.05);">
            <span style="font-weight:bold;font-size:12px;color:#a29bfe;">🔄 Auto Refresh</span>
            <input id="refresh_minutes_input" type="number" min="0" max="999" value="${this._refreshMinutes}"
                style="width:60px;padding:4px 8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#dfe6e9;font-size:12px;" placeholder="min" />
            ${this.getButtonHtml('btn_set_refresh', 'Aplicar', this._applyRefresh)}
            <span id="refresh_status" style="font-size:11px;color:#74b9ff;"></span>
            <span id="refresh_countdown" style="font-size:12px;color:#fdcb6e;font-weight:bold;margin-left:auto;"></span>
        </div>
        <div id="status_rows" style="padding:2px;"></div>`;
    };

    _applyRefresh = () => {
        const val = parseInt(uw.$('#refresh_minutes_input').val(), 10);

        this._clearRefresh();

        if (!val || val <= 0) {
            this._refreshMinutes = 0;
            this.storage.save('refresh_minutes', 0);
            uw.$('#refresh_status').text('Desativado').css('color', '#ff6b6b');
            uw.$('#refresh_countdown').text('');
            return;
        }

        this._refreshMinutes = val;
        this.storage.save('refresh_minutes', val);
        this._scheduleRefresh();
        uw.$('#refresh_status').text(`Recarrega a cada ${val} min`).css('color', '#00b894');

        this.console.log(`[StatusPanel] Auto Refresh: ${val} minuto(s) (± jitter).`);
    };

    _clearRefresh() {
        if (this._refreshTimeoutId) {
            clearTimeout(this._refreshTimeoutId);
            this._refreshTimeoutId = null;
        }
        this._nextRefreshAt = null;
    }

    _scheduleRefresh() {
        this._clearRefresh();
        if (this._refreshMinutes <= 0) return;

        const base = this._refreshMinutes * 60 * 1000;
        const jitter = (Math.random() * 60000) - 30000;
        const ms = Math.max(base + jitter, 10000);

        this._nextRefreshAt = Date.now() + ms;
        this._refreshTimeoutId = setTimeout(() => location.reload(), ms);
    }

    _startVisuals() {
        if (this._interval) clearInterval(this._interval);
        this._render();
        this._interval = setInterval(() => this._render(), 3000);

        if (this._countdownInterval) clearInterval(this._countdownInterval);
        this._countdownInterval = setInterval(() => this._updateCountdown(), 1000);

        if (this._refreshMinutes > 0 && this._nextRefreshAt) {
            uw.$('#refresh_status').text(`Recarrega a cada ${this._refreshMinutes} min`).css('color', '#00b894');
        } else if (this._refreshMinutes > 0) {
            this._scheduleRefresh();
            uw.$('#refresh_status').text(`Recarrega a cada ${this._refreshMinutes} min`).css('color', '#00b894');
        }
        this._updateCountdown();
    }

    _updateCountdown() {
        if (!this._nextRefreshAt) {
            uw.$('#refresh_countdown').text('');
            return;
        }
        const remaining = Math.max(0, this._nextRefreshAt - Date.now());
        const totalSec = Math.floor(remaining / 1000);
        const mm = Math.floor(totalSec / 60).toString().padStart(2, '0');
        const ss = (totalSec % 60).toString().padStart(2, '0');
        uw.$('#refresh_countdown').text(`⏱ ${mm}:${ss}`);
    }

    _render() {
        try {
            const bot  = uw.multBot;
            const rows = [];

            const farmActive  = !!bot.autoFarm?.active;
            const ruralActive = !!bot.autoRuralLevel?.enable;
            const buildCount  = Object.keys(bot.autoBuild?.towns_buildings ?? {}).length;
            const trainCount  = Object.keys(bot.autoTrain?.city_troops ?? {}).length;
            const partyActive = !!bot.autoParty?.enable;
            const cel         = this._countCelebrations();
            const celStr      = [cel.party && `${cel.party} 🎉`, cel.theater && `${cel.theater} 🎭`, cel.triumph && `${cel.triumph} 🏛️`].filter(Boolean).join(' · ') || '—';
            const gratisActive = !!bot.autoGratis?.autogratis;
            const cssActive   = !!bot.colonizeShipSender?._running;
            const asrActive   = !!bot.autoSendResources?._active;
            const militiaActive = !!bot.autoMilitia?._active;
            const attackActive   = !!bot.autoAttack?._active;
            const dodgeActive    = !!bot.autoDodge?._active;
            const aresActive     = !!bot.autoAresSacrifice?._active;
            const researchActive = !!bot.autoResearch?._active;

            rows.push(this._row('🌾', 'Fazenda', farmActive, farmActive ? 'Ativo' : 'Parado', 'autoFarm', 'toggle'));
            rows.push(this._row('🏘️', 'Aldeias Rurais', ruralActive, ruralActive ? `Nível ${bot.autoRuralLevel.rural_level}` : 'Parado', 'autoRuralLevel', 'toggle'));
            rows.push(this._row('🏗️', 'Construção', buildCount > 0, buildCount > 0 ? `${buildCount} cidades` : 'Nenhuma', null, null));
            rows.push(this._row('⚔️', 'Recrutamento', trainCount > 0, trainCount > 0 ? `${trainCount} cidades` : 'Nenhuma', null, null));
            rows.push(this._row('🎉', 'Festividades', partyActive, celStr, 'autoParty', 'toggle'));
            rows.push(this._row('🎁', 'Construção Grátis', gratisActive, gratisActive ? 'Ativo' : 'Parado', 'autoGratis', 'toggle'));
            rows.push(this._row('📦', 'Envio de Recursos', asrActive, asrActive ? 'Ativo' : 'Parado', 'autoSendResources', 'toggle'));
            rows.push(this._row('🛡️', 'Milícia Auto', militiaActive, militiaActive ? 'Ativo' : 'Parado', 'autoMilitia', militiaActive ? 'stop' : 'start'));
            rows.push(this._row('🚢', 'Navio Colonizador', cssActive, cssActive ? `→ ${this.getTownName(bot.colonizeShipSender.config.targetTownId)}` : 'Parado', 'colonizeShipSender', cssActive ? 'stop' : 'start'));
            rows.push(this._row('🎯', 'Auto Ataque', attackActive, attackActive ? 'Ativo' : 'Parado', 'autoAttack', 'toggle'));
            rows.push(this._row('🛡️', 'Auto Fuga (Dodge)', dodgeActive, dodgeActive ? 'Ativo' : 'Parado', 'autoDodge', 'toggle'));
            rows.push(this._row('🔥', 'Sacrifício de Ares', aresActive, aresActive ? 'Ativo' : 'Parado', 'autoAresSacrifice', 'toggle'));
            rows.push(this._row('📚', 'Auto Pesquisa', researchActive, researchActive ? 'Ativo' : 'Parado', 'autoResearch', 'toggle'));

            // Montar tabela com linhas azuis
            let html = `
            <table style="width:100%;border-collapse:collapse;font-size:12px;border-radius:8px;overflow:hidden;">
                <thead>
                    <tr style="background:linear-gradient(135deg, #0f3460, #16213e);border-bottom:2px solid #0f3460;">
                        <th style="text-align:left;padding:10px 14px;color:#a29bfe;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Módulo</th>
                        <th style="text-align:left;padding:10px 14px;color:#a29bfe;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Status</th>
                        <th style="text-align:right;padding:10px 14px;color:#a29bfe;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Ação</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.join('')}
                </tbody>
            </table>`;

            uw.$('#status_rows').html(html);
        } catch(e) {
            uw.$('#status_rows').html(`<div style="padding:12px;color:#ff6b6b;text-align:center;">❌ ${this.t('error')}: ${e.message}</div>`);
        }
    }

    _row(icon, label, active, value, module, method) {
        const onclick = module && method
            ? `window.multBot.${module}.${method}()`
            : null;

        const statusColor = active ? '#00b894' : '#636e72';
        const statusDot = active ? '🟢' : '⚪';
        const statusText = active ? 'Ativo' : 'Parado';

        // Cores das linhas alternadas
        const bgColor = active ? 'rgba(0,184,148,0.04)' : 'rgba(255,255,255,0.01)';
        const borderColor = active ? 'rgba(0,184,148,0.2)' : 'rgba(255,255,255,0.04)';

        const btn = onclick
            ? `<div class="button_new ${active ? '' : 'disabled'}" onclick="${onclick}" style="cursor:pointer;margin:0;padding:2px 10px;min-height:24px;display:inline-block;">
                <div class="left"></div><div class="right"></div>
                <div class="caption js-caption" style="font-size:10px;padding:0 8px;color:#dfe6e9;">${active ? '🟢' : '⚪'}<div class="effect js-effect"></div></div>
               </div>`
            : `<span style="font-size:11px;color:#636e72;">—</span>`;

        return `
        <tr style="border-bottom:1px solid ${borderColor};background:${bgColor};transition:all 0.3s ease;">
            <td style="padding:8px 14px;color:#dfe6e9;display:flex;align-items:center;gap:10px;">
                <span style="font-size:18px;opacity:0.7;">${icon}</span>
                <span style="font-weight:500;font-size:12px;">${label}</span>
            </td>
            <td style="padding:8px 14px;">
                <span style="color:${statusColor};font-weight:${active ? '600' : '300'};font-size:12px;">
                    ${statusDot} ${statusText}
                </span>
                <span style="color:#636e72;font-size:10px;margin-left:8px;">${value}</span>
            </td>
            <td style="padding:8px 14px;text-align:right;">
                ${btn}
            </td>
        </tr>`;
    }

    _countCelebrations() {
        const result = { party: 0, theater: 0, triumph: 0 };
        try {
            const models = uw.MM.getModels().Celebration;
            if (!models) return result;
            for (const key in models) {
                const type = models[key].attributes.celebration_type;
                if (type in result) result[type]++;
            }
        } catch(e) {}
        return result;
    }
};
