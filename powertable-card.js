/*
 * Power Table Card for Home Assistant
 * Generic table card with live data sources and editable columns
 * 
 * Includes Date Format 1.2.3
 * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
 * MIT license
 * https://blog.stevenlevithan.com/archives/javascript-date-format
 */

import {LitElement, html, css} from 'https://unpkg.com/lit-element@2.4.0/lit-element.js?module';
import { marked } from 'https://cdn.skypack.dev/marked@4.0.0';

// Date formatting library
var dateFormat = function () {
	var	token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
		timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
		timezoneClip = /[^-+\dA-Z]/g,
		pad = function (val, len) {
			val = String(val);
			len = len || 2;
			while (val.length < len) val = "0" + val;
			return val;
		};

	return function (date, mask, utc) {
		var dF = dateFormat;

		if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
			mask = date;
			date = undefined;
		}

		date = date ? new Date(date) : new Date;
		if (isNaN(date)) throw SyntaxError("invalid date");

		mask = String(dF.masks[mask] || mask || dF.masks["default"]);

		if (mask.slice(0, 4) == "UTC:") {
			mask = mask.slice(4);
			utc = true;
		}

		var	_ = utc ? "getUTC" : "get",
			d = date[_ + "Date"](),
			D = date[_ + "Day"](),
			m = date[_ + "Month"](),
			y = date[_ + "FullYear"](),
			H = date[_ + "Hours"](),
			M = date[_ + "Minutes"](),
			s = date[_ + "Seconds"](),
			L = date[_ + "Milliseconds"](),
			o = utc ? 0 : date.getTimezoneOffset(),
			flags = {
				d:    d,
				dd:   pad(d),
				ddd:  dF.i18n.dayNames[D],
				dddd: dF.i18n.dayNames[D + 7],
				m:    m + 1,
				mm:   pad(m + 1),
				mmm:  dF.i18n.monthNames[m],
				mmmm: dF.i18n.monthNames[m + 12],
				yy:   String(y).slice(2),
				yyyy: y,
				h:    H % 12 || 12,
				hh:   pad(H % 12 || 12),
				H:    H,
				HH:   pad(H),
				M:    M,
				MM:   pad(M),
				s:    s,
				ss:   pad(s),
				l:    pad(L, 3),
				L:    pad(L > 99 ? Math.round(L / 10) : L),
				t:    H < 12 ? "a"  : "p",
				tt:   H < 12 ? "am" : "pm",
				T:    H < 12 ? "A"  : "P",
				TT:   H < 12 ? "AM" : "PM",
				Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
				o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
				S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
			};

		return mask.replace(token, function ($0) {
			return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
		});
	};
}();

dateFormat.masks = {
	"default":      "ddd mmm dd yyyy HH:MM:ss",
	shortDate:      "m/d/yy",
	mediumDate:     "mmm d, yyyy",
	longDate:       "mmmm d, yyyy",
	fullDate:       "dddd, mmmm d, yyyy",
	shortTime:      "h:MM TT",
	mediumTime:     "h:MM:ss TT",
	longTime:       "h:MM:ss TT Z",
	isoDate:        "yyyy-mm-dd",
	isoTime:        "HH:MM:ss",
	isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
	isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
};

dateFormat.i18n = {
	dayNames: [
		"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
		"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
	],
	monthNames: [
		"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
		"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
	]
};

Date.prototype.format = function (mask, utc) {
	return dateFormat(this, mask, utc);
};


class PowerTableCardEditor extends LitElement {
    static get properties() {
        return {
            hass: Object,
            config: Object,
        };
    }
    
    get _entity() {
        return this.config?.entity || '';
    }

    get _show_header() {
        return this.config?.show_header !== undefined ? this.config.show_header : true;
    }

    get _editable() {
        if (this.config?.editable === undefined) return true;
        return this.config.editable;
    }

    get _if_missing() {
        return this.config?.if_missing || 'show';
    }

    get _standalone_mode() {
        return this.config?.standalone_mode !== undefined ? this.config.standalone_mode : false;
    }

    get _fit_width() {
        return this.config?.fit_width || false;
    }
    
    setConfig(config) {
        this.config = config;
    }
    
    configChanged(config) {
        const e = new Event('config-changed', {
            bubbles: true,
            composed: true,
        });
        
        e.detail = {config: config};
        this.dispatchEvent(e);
    }
    
    getEntitiesByType(type) {
        return this.hass
            ? Object.keys(this.hass.states).filter(entity => entity.substr(0, entity.indexOf('.')) === type)
            : [];
    }
    
    valueChanged(e) {
        if (!this.config || !this.hass) {
            return;
        }
        
        if (e.target.configValue) {
            if (e.target.value === '') {
                if (e.target.configValue !== 'entity') {
                    delete this.config[e.target.configValue];
                }
            } else {
                this.config = {
                    ...this.config,
                    [e.target.configValue]: e.target.checked !== undefined
                        ? e.target.checked
                        : e.target.value,
                };
            }
        }
        
        this.configChanged(this.config);
    }

    render() {
        if (!this.hass) {
            return html``;
        }
        
        const entities = this.getEntitiesByType('sensor');

        return html`<div class="card-config">
            <div class="option">
                <ha-switch
                    .checked=${this._standalone_mode}
                    .configValue=${'standalone_mode'}
                    @change=${this.valueChanged}
                >
                </ha-switch>
                <span>Standalone mode (no live data source)</span>
            </div>

            ${!this._standalone_mode ? html`
                <div class="option">
                    <ha-select
                        naturalMenuWidth
                        fixedMenuPosition
                        label="Storage Entity (required)"
                        @selected=${this.valueChanged}
                        @closed=${(event) => event.stopPropagation()}
                        .configValue=${'entity'}
                        .value=${this._entity}
                    >
                        ${entities.map(entity => {
                            return html`<mwc-list-item .value="${entity}">${entity}</mwc-list-item>`;
                        })}
                    </ha-select>
                </div>
                
                <div class="option">
                    <ha-textfield
                        label="Primary Key Field (for matching)"
                        .value=${this.config?.data_source?.primary_key || ''}
                        .configValue=${'data_source.primary_key'}
                        @input=${this.valueChanged}
                    ></ha-textfield>
                </div>

                <div class="option">
                    <ha-select
                        naturalMenuWidth
                        fixedMenuPosition
                        label="If missing from source"
                        @selected=${this.valueChanged}
                        @closed=${(event) => event.stopPropagation()}
                        .configValue=${'if_missing'}
                        .value=${this._if_missing}
                    >
                        <mwc-list-item value="remove">Remove (delete from JSON)</mwc-list-item>
                        <mwc-list-item value="hide">Hide (keep in JSON)</mwc-list-item>
                        <mwc-list-item value="disable">Disable (gray out, keep in JSON)</mwc-list-item>
                        <mwc-list-item value="show">Show (normal)</mwc-list-item>
                    </ha-select>
                </div>
            ` : html`
                <div class="option">
                    <ha-select
                        naturalMenuWidth
                        fixedMenuPosition
                        label="Storage Entity (required)"
                        @selected=${this.valueChanged}
                        @closed=${(event) => event.stopPropagation()}
                        .configValue=${'entity'}
                        .value=${this._entity}
                    >
                        ${entities.map(entity => {
                            return html`<mwc-list-item .value="${entity}">${entity}</mwc-list-item>`;
                        })}
                    </ha-select>
                </div>
            `}
            
            <div class="option">
                <ha-switch
                    .checked=${this._show_header}
                    .configValue=${'show_header'}
                    @change=${this.valueChanged}
                >
                </ha-switch>
                <span>Show header</span>
            </div>

            <div class="option">
                <ha-switch
                    .checked=${this._fit_width}
                    .configValue=${'fit_width'}
                    @change=${this.valueChanged}
                >
                </ha-switch>
                <span>Fit width to viewport (no horizontal scroll)</span>
            </div>

            <div class="option">
                <p style="margin: 5px 0; font-size: 12px; color: var(--secondary-text-color);">
                    Note: Editable can be true, false, or a list of usernames in YAML. 
                    Use Visual Editor's switch for true/false, or edit in YAML for user lists.
                </p>
            </div>
        </div>`;
    }
    
    static get styles() {
        return css`
            .card-config ha-select, .card-config ha-textfield {
                width: 100%;
            }
            
            .option {
                display: flex;
                flex-direction: column;
                padding: 5px;
            }
            
            .option ha-switch {
                margin-right: 10px;
            }
        `;
    }
}


class PowerTableCard extends LitElement {
    constructor() {
        super();
        this.editor = null;
        this.dateInput = null;
        this.dropdownMenu = null;
        this.refreshInterval = null;
        this.isMobile = false;
        this.showActions = false; // New: Toggle for actions column visibility
        this.longPressTimer = null;
        this.longPressDuration = 500; // ms for long press
        this.handleDocumentClick = null;
        this.handleKeyDown = null;
    }

    static get properties() {
        return {
            hass: Object,
            config: Object,
            showActions: { type: Boolean }, // Expose for Lit reactivity
        };
    }
    
    static getConfigElement() {
        return document.createElement('powertable-card-editor');
    }

    setConfig(config) {
        if (!config.entity) {
            throw new Error('Storage entity is not set!');
        }

        // Standalone mode doesn't require data_source
        if (!config.standalone_mode) {
            if (!config.data_source) {
                throw new Error('data_source is not defined! (Enable standalone_mode if you want to use the card without a live data source)');
            }

            if (!config.data_source.primary_key) {
                throw new Error('data_source.primary_key is required for matching!');
            }
        }

        if (!config.columns || !Array.isArray(config.columns)) {
            throw new Error('columns must be defined as an array!');
        }

        // In standalone mode, no content columns allowed
        if (config.standalone_mode) {
            const hasContentColumns = config.columns.some(col => col.type === 'content');
            if (hasContentColumns) {
                throw new Error('Content columns are not allowed in standalone mode!');
            }
        }
        
        this.config = {
            show_header: true,
            editable: true,
            if_missing: 'show',
            refresh_interval: 30,
            date_format: 'isoDate',
            standalone_mode: false,
            fit_width: false,
            ...config
        };

        // Reset actions visibility on config change
        this.showActions = false;

        // Detect mobile on config set
        this.updateMobileStatus();
    }

    updateMobileStatus() {
        this.isMobile = window.innerWidth < 768; // Common mobile breakpoint
    }

    getCardSize() {
        const tableData = this.getTableData();
        if (tableData && tableData.rows) {
            return tableData.rows.length + 2;
        }
        return 3;
    }
    
    connectedCallback() {
        super.connectedCallback();
        
        if (this.config.refresh_interval && !this.config.standalone_mode) {
            this.refreshInterval = setInterval(() => {
                console.log('Refreshing live data...');
                this.requestUpdate();
            }, this.config.refresh_interval * 1000);
        }

        // Listen for resize to update mobile status
        window.addEventListener('resize', () => {
            this.updateMobileStatus();
            this.requestUpdate();
        });
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        window.removeEventListener('resize', () => {});
        
        // Clear long press timer on disconnect
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
        }

        // Clean up dropdown listeners if active
        if (this.handleDocumentClick) {
            document.removeEventListener('click', this.handleDocumentClick);
        }
        if (this.handleKeyDown) {
            document.removeEventListener('keydown', this.handleKeyDown);
        }
    }

    firstUpdated() {
        this.createEditor();
        this.createDateInput();
        this.createDropdownMenu();
        this.updateMobileStatus();
    }

    getCurrentUser() {
        // Get the currently logged in user from Home Assistant
        if (this.hass && this.hass.user && this.hass.user.name) {
            return this.hass.user.name.toLowerCase();
        }
        return null;
    }

    canEdit(editableConfig) {
        // editableConfig can be:
        // - true: everyone can edit
        // - false: no one can edit
        // - array of usernames: only those users can edit

        if (editableConfig === true) {
            return true;
        }
        
        if (editableConfig === false) {
            return false;
        }
        
        if (Array.isArray(editableConfig)) {
            const currentUser = this.getCurrentUser();
            if (!currentUser) return false;
            
            // Case-insensitive comparison
            return editableConfig.some(user => 
                String(user).toLowerCase() === currentUser
            );
        }
        
        // Default to false if invalid config
        return false;
    }

    isColumnEditable(column) {
        // Content columns are ALWAYS non-editable (highest priority)
        if (column.type === 'content') {
            return false;
        }

        // Check column-level editable (overrides table-level)
        if (column.editable !== undefined) {
            return this.canEdit(column.editable);
        }

        // Fall back to table-level editable
        return this.canEdit(this.config.editable);
    }

    isTableEditable() {
        // Check if the table-level editable allows the current user
        return this.canEdit(this.config.editable);
    }

    sanitizeCellValue(value, type = 'text') {
        if (typeof value !== 'string') return value;
        let sanitized = value
          .replace(/[{}\$%]/g, '')  // Strip template chars
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')  // Basic XSS block
          .trim();
        // For non-text types, enforce type (e.g., parseFloat for numbers)
        if (type === 'number') {
            sanitized = parseFloat(sanitized) || 0;
        } else if (type === 'checkbox') {
            sanitized = !!sanitized;
        } else if (type === 'date') {
            // Ensure it's a valid date string
            const date = new Date(sanitized);
            sanitized = isNaN(date) ? '' : date.format(this.config.date_format || 'isoDate');
        }
        return sanitized;
    }

    getSanitizedTableData() {
        const tableData = this.getTableData();
        if (!tableData) return null;
        // Deep clone and sanitize
        const sanitized = JSON.parse(JSON.stringify(tableData));
        sanitized.rows = sanitized.rows.map(row => ({
            ...row,
            data: row.data.map((cell, colIdx) => {
                const colType = tableData.columns[colIdx]?.type || 'text';
                return this.sanitizeCellValue(cell, colType);
            })
        }));
        return sanitized;
    }

    renderTemplate(templateStr) {
        if (!templateStr) {
            return '';
        }
        try {
            // Step 1: Expand Jinja-like expressions ({{ ... }})
            const expanded = this.expandJinjaExpressions(templateStr);
            
            // Step 2: Parse as Markdown
            return marked.parse(expanded);
        } catch (error) {
            console.warn('Template rendering failed:', error);
            return marked.parse(templateStr);
        }
    }

    expandJinjaExpressions(str) {
        // Match {{ ... }} patterns
        return str.replace(/\{\{(.+?)\}\}/g, (match, expr) => {
            try {
                return this.evaluateExpression(expr.trim());
            } catch (e) {
                console.warn(`Failed to evaluate expression: ${expr}`, e);
                return `[${expr}]`; // Graceful fallback
            }
        });
    }

    evaluateExpression(expr) {
        // Handle now().strftime() pattern for dates
        const dateMatch = expr.match(/now\(\)\.strftime\(['"](.+?)['"]\)/);
        if (dateMatch) {
            const pythonFormat = dateMatch[1];
            return this.formatDatePythonStyle(new Date(), pythonFormat);
        }
        
        // Handle user variable
        if (expr === 'user') {
            return this.hass?.user?.name || 'unknown';
        }
        
        // Handle states('entity_id') pattern
        const statesMatch = expr.match(/states\(['"](.+?)['"]\)/);
        if (statesMatch) {
            const entityId = statesMatch[1];
            const state = this.hass?.states?.[entityId];
            return state?.state || 'unavailable';
        }
        
        // Future extensions: groups, filters, etc.
        // Example stub for groups:
        // if (expr.startsWith('groups.')) {
        //     const groupName = expr.split('.')[1];
        //     return this.getGroupMembers(groupName).join(', ');
        // }
        
        throw new Error(`Unsupported expression: ${expr}`);
    }

    formatDatePythonStyle(date, pythonFormat) {
        // Map Python strftime tokens to dateFormat library tokens
        // Python -> dateFormat mapping:
        // %d -> dd (day with zero-padding)
        // %m -> mm (month with zero-padding)
        // %Y -> yyyy (4-digit year)
        // %H -> HH (24-hour with zero-padding)
        // %M -> MM (minutes with zero-padding)
        // %S -> ss (seconds with zero-padding)
        // %B -> mmmm (full month name)
        // %b -> mmm (abbreviated month name)
        // %A -> dddd (full weekday name)
        // %a -> ddd (abbreviated weekday name)
        // %I -> hh (12-hour with zero-padding)
        // %p -> TT (AM/PM)
        
        let dateFormatMask = pythonFormat
            .replace(/%d/g, 'dd')
            .replace(/%m/g, 'mm')
            .replace(/%Y/g, 'yyyy')
            .replace(/%H/g, 'HH')
            .replace(/%M/g, 'MM')
            .replace(/%S/g, 'ss')
            .replace(/%B/g, 'mmmm')
            .replace(/%b/g, 'mmm')
            .replace(/%A/g, 'dddd')
            .replace(/%a/g, 'ddd')
            .replace(/%I/g, 'hh')
            .replace(/%p/g, 'TT');
        
        // Use the existing dateFormat library
        return dateFormat(date, dateFormatMask);
    }

    getSourceData() {
        if (this.config.standalone_mode) {
            return [];
        }

        const ds = this.config.data_source;
        
        if (ds.type === 'sensor_attribute') {
            const sensor = this.hass.states[ds.entity_id];
            if (!sensor) return [];
            
            let data = sensor.attributes[ds.attribute_path];
            if (!data || !Array.isArray(data)) return [];
            
            data = JSON.parse(JSON.stringify(data));
            
            return data;
        }
        
        return [];
    }

    getSavedData() {
        const storageEntity = this.hass.states[this.config.entity];
        if (!storageEntity || !storageEntity.attributes.row_data) {
            return {};
        }
        
        const savedData = JSON.parse(JSON.stringify(storageEntity.attributes.row_data)); // Deep clone
        
        // Remove dummy timestamp (not part of real data)
        if (savedData._last_updated !== undefined) {
            delete savedData._last_updated;
        }
        
        // Auto-migrate: Ensure all rows match current column structure
        const editableColumns = this.config.standalone_mode 
            ? this.config.columns.filter(col => !col.hidden)
            : this.config.columns.filter(col => col.type !== 'content' && !col.hidden);
        
        const expectedColumnCount = editableColumns.length;
        
        let dataMigrated = false;
        
        Object.keys(savedData).forEach(rowId => {
            const rowData = savedData[rowId];
            
            if (!Array.isArray(rowData)) {
                console.warn(`Invalid row data for ${rowId}, resetting to defaults`);
                savedData[rowId] = editableColumns.map(col => this.getDefaultValue(col));
                dataMigrated = true;
                return;
            }
            
            // Pad short rows with defaults for new columns
            if (rowData.length < expectedColumnCount) {
                console.log(`Migrating row ${rowId}: padding from ${rowData.length} to ${expectedColumnCount} columns`);
                while (rowData.length < expectedColumnCount) {
                    const missingColIndex = rowData.length;
                    const col = editableColumns[missingColIndex];
                    rowData.push(this.getDefaultValue(col));
                }
                dataMigrated = true;
            }
            
            // Trim rows that are too long (removed columns)
            if (rowData.length > expectedColumnCount) {
                console.log(`Migrating row ${rowId}: trimming from ${rowData.length} to ${expectedColumnCount} columns`);
                savedData[rowId] = rowData.slice(0, expectedColumnCount);
                dataMigrated = true;
            }
        });
        
        // Auto-save migrated data
        if (dataMigrated) {
            console.log('Data structure changed - auto-saving migrated data...');
            setTimeout(() => {
                this.saveTableData(savedData);
            }, 1000); // Delay to avoid conflicts
        }
        
        return savedData;
    }

    generateRowId() {
        return 'row_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getTableData() {
        if (this.config.standalone_mode) {
            return this.getStandaloneTableData();
        }

        const sourceData = this.getSourceData();
        const savedData = this.getSavedData();
        const fullColumns = this.config.columns;
        const displayColumns = fullColumns.filter(col => !col.hidden);
        const savedIndexMap = {};
        let savedIdx = 0;
        fullColumns.forEach((col, fullIdx) => {
            if (col.type !== 'content') {
                savedIndexMap[fullIdx] = savedIdx++;
            }
        });
        const primaryKey = this.config.data_source.primary_key;
        const ifMissing = this.config.if_missing;
        
        const rows = [];
        const liveIds = new Set(sourceData.map(item => String(item[primaryKey])));

        sourceData.forEach(item => {
            const itemId = String(item[primaryKey]);
            if (!itemId) return;
            
            const rowData = [];
            const itemSavedData = savedData[itemId] || [];

            displayColumns.forEach((displayCol) => {
                const fullIdx = fullColumns.findIndex(c => c === displayCol);
                if (displayCol.type === 'content') {
                    rowData.push(item[displayCol.source] || '');
                } else {
                    const savedIdx = savedIndexMap[fullIdx];
                    let value = itemSavedData[savedIdx];
                    let displayValue;
                    if (displayCol.type === 'text') {
                        displayValue = value == null ? '' : value;
                    } else {
                        displayValue = (value == null || (typeof value === 'string' && value === '')) ? this.getDefaultValue(displayCol) : value;
                    }
                    rowData.push(displayValue);
                }
            });

            rows.push({
                itemId: itemId,
                data: rowData,
                isMissing: false
            });
        });

        if (ifMissing === 'show' || ifMissing === 'disable') {
            Object.keys(savedData).forEach(savedId => {
                if (liveIds.has(savedId)) return;

                const itemSavedData = savedData[savedId];
                const rowData = [];

                displayColumns.forEach((displayCol) => {
                    const fullIdx = fullColumns.findIndex(c => c === displayCol);
                    if (displayCol.type === 'content') {
                        rowData.push('N/A (Missing)');
                    } else {
                        const savedIdx = savedIndexMap[fullIdx];
                        let value = itemSavedData[savedIdx];
                        let displayValue;
                        if (displayCol.type === 'text') {
                            displayValue = value == null ? '' : value;
                        } else {
                            displayValue = (value == null || (typeof value === 'string' && value === '')) ? this.getDefaultValue(displayCol) : value;
                        }
                        rowData.push(displayValue);
                    }
                });

                rows.push({
                    itemId: savedId,
                    data: rowData,
                    isMissing: true
                });
            });
        }

        return {
            columns: displayColumns,
            rows: rows
        };
    }

    getStandaloneTableData() {
        const savedData = this.getSavedData();
        const fullColumns = this.config.columns;
        const displayColumns = fullColumns.filter(col => !col.hidden);
        
        const rows = [];

        Object.keys(savedData).forEach(rowId => {
            const itemSavedData = savedData[rowId];
            const rowData = [];

            displayColumns.forEach((displayCol, idx) => {
                let value = itemSavedData[idx];
                let displayValue;
                if (displayCol.type === 'text') {
                    displayValue = value == null ? '' : value;
                } else {
                    displayValue = (value == null || (typeof value === 'string' && value === '')) ? this.getDefaultValue(displayCol) : value;
                }
                rowData.push(displayValue);
            });

            rows.push({
                itemId: rowId,
                data: rowData,
                isMissing: false
            });
        });

        return {
            columns: displayColumns,
            rows: rows
        };
    }

    getDefaultValue(column) {
        switch (column.type) {
            case 'checkbox': return false;
            case 'number': return column.min || 0;
            case 'cycle': return column.options && column.options.length > 0 ? column.options[0] : '';
            case 'dropdown': return column.options && column.options.length > 0 ? column.options[0] : '';
            case 'date': return new Date().format(this.config.date_format || 'isoDate');
            case 'text':
            default: return '';
        }
    }

    hideAllEditors() {
        [this.editor, this.dateInput, this.dropdownMenu].forEach(el => {
            if (el) el.style.display = 'none';
        });
        this.hideDropdown();
    }

    createEditor() {
        const container = this.shadowRoot.querySelector('.table-container');
        if (!container) return;
        
        this.editor = document.createElement('input');
        this.editor.type = 'text';
        this.editor.className = 'cell-editor';
        this.editor.style.display = 'none';
        
        this.editor.addEventListener('blur', () => {
            this.setActiveTextFromElement(this.editor);
            this.editor.style.display = 'none';
            requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
        });

        this.editor.addEventListener('keydown', (e) => {
            const ENTER = 13, ESC = 27;
            
            if (e.which === ENTER) {
                this.setActiveTextFromElement(this.editor);
                this.editor.style.display = 'none';
                if (this.editor.dataset.rowIndex) {
                    const cell = this.shadowRoot.querySelector(`[data-row="${this.editor.dataset.rowIndex}"][data-col="${this.editor.dataset.colIndex}"]`);
                    if (cell) cell.focus();
                }
                e.preventDefault();
                e.stopPropagation();
                requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
            } else if (e.which === ESC) {
                this.editor.style.display = 'none';
                if (this.editor.dataset.rowIndex) {
                    const cell = this.shadowRoot.querySelector(`[data-row="${this.editor.dataset.rowIndex}"][data-col="${this.editor.dataset.colIndex}"]`);
                    if (cell) cell.focus();
                }
                e.preventDefault();
                e.stopPropagation();
                requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
            }
        });

        container.appendChild(this.editor);
    }

    createDropdownMenu() {
        const container = this.shadowRoot.querySelector('.table-container');
        if (!container) return;
        
        this.dropdownMenu = document.createElement('div');
        this.dropdownMenu.className = 'custom-dropdown-menu';
        this.dropdownMenu.style.display = 'none';
        container.appendChild(this.dropdownMenu);
    }

    createDateInput() {
        const container = this.shadowRoot.querySelector('.table-container');
        if (!container) return;
        
        this.dateInput = document.createElement('input');
        this.dateInput.type = 'date';
        this.dateInput.className = 'cell-date';
        this.dateInput.style.display = 'none';
        
        this.dateInput.addEventListener('blur', () => {
            this.setActiveDateFromElement(this.dateInput);
            this.dateInput.style.display = 'none';
            requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
        });

        this.dateInput.addEventListener('change', () => {
            this.setActiveDateFromElement(this.dateInput);
            this.dateInput.style.display = 'none';
            if (this.dateInput.dataset.rowIndex) {
                const cell = this.shadowRoot.querySelector(`[data-row="${this.dateInput.dataset.rowIndex}"][data-col="${this.dateInput.dataset.colIndex}"]`);
                if (cell) cell.focus();
            }
            requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
        });

        this.dateInput.addEventListener('keydown', (e) => {
            const ESC = 27;
            if (e.which === ESC) {
                this.dateInput.style.display = 'none';
                if (this.dateInput.dataset.rowIndex) {
                    const cell = this.shadowRoot.querySelector(`[data-row="${this.dateInput.dataset.rowIndex}"][data-col="${this.dateInput.dataset.colIndex}"]`);
                    if (cell) cell.focus();
                }
                e.preventDefault();
                e.stopPropagation();
                requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
            }
        });

        container.appendChild(this.dateInput);
    }

    hideDropdown() {
        if (this.dropdownMenu) {
            this.dropdownMenu.style.display = 'none';
            this.dropdownMenu.innerHTML = '';
            this.dropdownMenu.dataset.open = 'false';
        }
        if (this.handleDocumentClick) {
            document.removeEventListener('click', this.handleDocumentClick);
        }
        if (this.handleKeyDown) {
            document.removeEventListener('keydown', this.handleKeyDown);
        }
    }

    setActiveTextFromElement(el) {
        if (!el || !el.dataset.rowIndex) return;
        
        const rowIndex = parseInt(el.dataset.rowIndex);
        const colIndex = parseInt(el.dataset.colIndex);
        const itemId = el.dataset.itemId;
        const text = el.value;
        
        this.updateCellValue(rowIndex, colIndex, itemId, text);

        // Reset any partial swipe
        this.hideAllEditors();
        
        // Force Swiper resize/update
        requestAnimationFrame(() => {
            window.dispatchEvent(new Event('resize')); // Triggers HA's layout refresh
            // If needed, target the swiper directly (inspect DOM for class)
            const swiperContainer = this.shadowRoot.host.closest('ha-swipe-card')?.shadowRoot?.querySelector('.swiper-container, .swiper');
            if (swiperContainer && swiperContainer.swiper) {
                swiperContainer.swiper.updateSize();
                swiperContainer.swiper.updateSlides();
            }
        });
    }

    setActiveDateFromElement(el) {
        if (!el || !el.dataset.rowIndex) return;
        
        const rowIndex = parseInt(el.dataset.rowIndex);
        const colIndex = parseInt(el.dataset.colIndex);
        const itemId = el.dataset.itemId;
        const dateValue = el.value;
        
        if (dateValue) {
            const date = new Date(dateValue);
            const formatted = date.format(this.config.date_format || 'isoDate');
            this.updateCellValue(rowIndex, colIndex, itemId, formatted);
        }

        // Reset any partial swipe
        this.hideAllEditors();
        
        // Force Swiper resize/update
        requestAnimationFrame(() => {
            window.dispatchEvent(new Event('resize')); // Triggers HA's layout refresh
            // If needed, target the swiper directly (inspect DOM for class)
            const swiperContainer = this.shadowRoot.host.closest('ha-swipe-card')?.shadowRoot?.querySelector('.swiper-container, .swiper');
            if (swiperContainer && swiperContainer.swiper) {
                swiperContainer.swiper.updateSize();
                swiperContainer.swiper.updateSlides();
            }
        });
    }

    showDropdown(cell, options) {
        if (!this.dropdownMenu || !cell || options.length === 0) return;

        const rowIndex = parseInt(cell.dataset.row);
        const colIndex = parseInt(cell.dataset.col);
        const itemId = cell.dataset.itemid;
        
        const tableData = this.getTableData();
        if (!tableData) return;

        const column = tableData.columns[colIndex];
        if (!this.isColumnEditable(column)) return;
        
        this.hideAllEditors();

        const currentValue = tableData.rows[rowIndex].data[colIndex];

        const ul = document.createElement('ul');
        ul.className = 'dropdown-list';

        options.forEach((opt) => {
            const li = document.createElement('li');
            li.textContent = opt;
            if (opt === currentValue) {
                li.classList.add('selected');
            }
            li.addEventListener('click', (e) => {
                e.stopPropagation();
                this.updateCellValue(rowIndex, colIndex, itemId, opt);
                this.hideAllEditors();
            });
            ul.appendChild(li);
        });

        this.dropdownMenu.innerHTML = '';
        this.dropdownMenu.appendChild(ul);

        // Temporarily show to measure height
        this.dropdownMenu.style.display = 'block';
        this.dropdownMenu.style.visibility = 'hidden';
        const menuHeight = this.dropdownMenu.offsetHeight;
        this.dropdownMenu.style.visibility = 'visible';

        const rect = cell.getBoundingClientRect();
        const container = this.shadowRoot.querySelector('.table-container');
        const containerRect = container.getBoundingClientRect();
        const card = this.shadowRoot.querySelector('ha-card');
        const cardRect = card ? card.getBoundingClientRect() : containerRect; // Fallback to container if no card

        // Always open below, but cap height to available space below
        const spaceBelow = cardRect.bottom - rect.bottom;
        const gap = 2; // px gap between cell and menu
        const minHeight = 60; // Min height to show at least 1-2 options comfortably
        const listMaxHeight = `${Math.max(minHeight, spaceBelow - gap)}px`;

        const top = rect.bottom - containerRect.top + gap;

        // Apply max height to list for scrolling if needed
        ul.style.maxHeight = listMaxHeight;

        this.dropdownMenu.style.position = 'absolute';
        this.dropdownMenu.style.left = `${rect.left - containerRect.left}px`;
        this.dropdownMenu.style.top = `${top}px`;
        this.dropdownMenu.style.width = `${Math.max(rect.width, 120)}px`; // Min width for usability
        this.dropdownMenu.style.maxHeight = `${listMaxHeight}`; // Match list for consistent sizing
        this.dropdownMenu.style.display = 'block';
        this.dropdownMenu.dataset.open = 'true';

        // Prevent close on menu click
        this.dropdownMenu.addEventListener('click', (e) => e.stopPropagation());

        // Outside click handler
        this.handleDocumentClick = (e) => {
            if (this.dropdownMenu && this.dropdownMenu.dataset.open === 'true' && !this.dropdownMenu.contains(e.target)) {
                this.hideAllEditors();
            }
        };
        document.addEventListener('click', this.handleDocumentClick);

        // ESC handler
        this.handleKeyDown = (e) => {
            if (e.key === 'Escape' && this.dropdownMenu.dataset.open === 'true') {
                this.hideAllEditors();
            }
        };
        document.addEventListener('keydown', this.handleKeyDown);
    }

    updateCellValue(rowIndex, colIndex, itemId, newValue) {
        const tableData = this.getTableData();
        if (!tableData) return;

        const column = tableData.columns[colIndex];
        
        // Check if this specific column is editable
        if (!this.isColumnEditable(column)) return;

        // Sanitize the new value
        newValue = this.sanitizeCellValue(newValue, column.type);

        if (this.config.standalone_mode) {
            this.updateStandaloneCellValue(rowIndex, colIndex, itemId, newValue);
            return;
        }

        const fullColumns = this.config.columns;
        const displayColumns = fullColumns.filter(col => !col.hidden);
        const savedIndexMap = {};
        let savedIdx = 0;
        fullColumns.forEach((col, fullIdx) => {
            if (col.type !== 'content') {
                savedIndexMap[fullIdx] = savedIdx++;
            }
        });
        const displayCol = displayColumns[colIndex];
        const fullIdx = fullColumns.findIndex(c => c === displayCol);
        if (fullIdx === -1) return;
        const savedIndex = savedIndexMap[fullIdx];
        
        if (displayCol.type === 'content') return;

        const savedData = this.getSavedData();

        if (!savedData[itemId]) {
            savedData[itemId] = fullColumns
                .filter(col => col.type !== 'content')
                .map(col => this.getDefaultValue(col));
        }

        savedData[itemId][savedIndex] = newValue;

        if (this.config.if_missing === 'remove') {
            const sourceData = this.getSourceData();
            const primaryKey = this.config.data_source.primary_key;
            const sourceIds = new Set(sourceData.map(item => String(item[primaryKey])));
            
            Object.keys(savedData).forEach(id => {
                if (!sourceIds.has(id)) {
                    delete savedData[id];
                }
            });
        }

        const sourceData = this.getSourceData();
        const primaryKey = this.config.data_source.primary_key;
        sourceData.forEach(item => {
            const liveItemId = String(item[primaryKey]);
            if (!liveItemId || savedData[liveItemId]) return;
            
            savedData[liveItemId] = this.config.columns
                .filter(col => col.type !== 'content')
                .map(col => this.getDefaultValue(col));
        });

        this.saveTableData(savedData);
    }

    updateStandaloneCellValue(rowIndex, colIndex, itemId, newValue) {
        const savedData = this.getSavedData();
        const displayColumns = this.config.columns.filter(col => !col.hidden);
        
        if (!savedData[itemId]) {
            savedData[itemId] = this.config.columns.map(col => this.getDefaultValue(col));
        }

        savedData[itemId][colIndex] = newValue;

        this.saveTableData(savedData);
    }

    saveTableData(rowData) {
        console.log('Attempting to save:', rowData);
        
        if (this.config.standalone_mode) {
            const editableColumns = this.config.columns;
            Object.keys(rowData).forEach(id => {
                const itemData = rowData[id];
                itemData.forEach((val, slot) => {
                    if (val == null) {
                        const col = editableColumns[slot];
                        itemData[slot] = this.getDefaultValue(col);
                        return;
                    }
                    if (typeof val === 'string' && val === '') {
                        const col = editableColumns[slot];
                        if (col.type !== 'text') {
                            itemData[slot] = this.getDefaultValue(col);
                        }
                    }
                });
            });
        } else {
            const editableColumns = this.config.columns.filter(col => col.type !== 'content');
            Object.keys(rowData).forEach(id => {
                const itemData = rowData[id];
                itemData.forEach((val, slot) => {
                    if (val == null) {
                        const col = editableColumns[slot];
                        itemData[slot] = this.getDefaultValue(col);
                        return;
                    }
                    if (typeof val === 'string' && val === '') {
                        const col = editableColumns[slot];
                        if (col.type !== 'text') {
                            itemData[slot] = this.getDefaultValue(col);
                        }
                    }
                });
            });
        }
        
        // Force HA state update by adding a dummy timestamp (ignored in rendering)
        rowData._last_updated = Date.now();
        
        const jsonData = JSON.stringify({ row_data: rowData });
        
        this.hass.callService('shell_command', 'save_table_data', {
            table_data: jsonData,
            file_path: this.config.path_to_storage_json
        }).then(() => {
            console.log('Save successful!');
            this.hass.callService('homeassistant', 'update_entity', {
                entity_id: this.config.entity,
            });
        }).catch(error => {
            console.error('Save failed:', error);
        });
    }

    addRowBelow(rowIndex) {
        if (!this.isTableEditable() || !this.config.standalone_mode) return;

        const savedData = this.getSavedData();
        const currentKeys = Object.keys(savedData);
        const newRowId = this.generateRowId();
        const newRowData = this.config.columns.map(col => this.getDefaultValue(col));
        let newKeys;

        if (rowIndex === -1) {
            // Add at end (for first row or global add)
            newKeys = [...currentKeys, newRowId];
        } else {
            // Add below specific row
            newKeys = [...currentKeys];
            newKeys.splice(rowIndex + 1, 0, newRowId);
        }

        const newSavedData = {};
        newKeys.forEach(key => {
            if (key === newRowId) {
                newSavedData[key] = newRowData;
            } else {
                newSavedData[key] = savedData[key];
            }
        });

        this.saveTableData(newSavedData);
    }

    swapRowsUp(rowIndex) {
        if (!this.isTableEditable() || !this.config.standalone_mode || rowIndex === 0) return;

        const savedData = this.getSavedData();
        const currentKeys = Object.keys(savedData);

        const newKeys = [...currentKeys];
        [newKeys[rowIndex - 1], newKeys[rowIndex]] = [newKeys[rowIndex], newKeys[rowIndex - 1]];

        const newSavedData = {};
        newKeys.forEach(key => {
            newSavedData[key] = savedData[key];
        });

        this.saveTableData(newSavedData);
    }

    swapRowsDown(rowIndex) {
        if (!this.isTableEditable() || !this.config.standalone_mode) return;

        const savedData = this.getSavedData();
        const currentKeys = Object.keys(savedData);
        if (rowIndex >= currentKeys.length - 1) return;

        const newKeys = [...currentKeys];
        [newKeys[rowIndex], newKeys[rowIndex + 1]] = [newKeys[rowIndex + 1], newKeys[rowIndex]];

        const newSavedData = {};
        newKeys.forEach(key => {
            newSavedData[key] = savedData[key];
        });

        this.saveTableData(newSavedData);
    }

    deleteRow(itemId) {
        // Check if user has permission to delete rows (table-level editable)
        if (!this.isTableEditable() || !this.config.standalone_mode) return;

        const savedData = this.getSavedData();
        delete savedData[itemId];
        
        this.saveTableData(savedData);
    }

    // New: Long press handler for toggling actions column
    handleLongPressStart(e) {
        if (!this.isTableEditable() || !this.config.standalone_mode) return;
        e.preventDefault(); // Prevent text selection or other defaults

        this.longPressTimer = setTimeout(() => {
            this.showActions = !this.showActions;
            this.requestUpdate();
            console.log('Actions toggled:', this.showActions ? 'shown' : 'hidden');
        }, this.longPressDuration);
    }

    handleLongPressEnd(e) {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    showEditor(cell) {
        if (!this.editor || !cell) return;

        const rowIndex = parseInt(cell.dataset.row);
        const colIndex = parseInt(cell.dataset.col);
        const itemId = cell.dataset.itemid;
        
        const tableData = this.getTableData();
        if (!tableData) return;

        const column = tableData.columns[colIndex];
        if (!this.isColumnEditable(column)) return;
        
        this.hideAllEditors();

        this.editor.value = tableData.rows[rowIndex].data[colIndex];
        // Store cell details on the editor element itself (fixes race condition)
        this.editor.dataset.rowIndex = rowIndex.toString();
        this.editor.dataset.colIndex = colIndex.toString();
        this.editor.dataset.itemId = itemId;
        
        this.editor.style.display = 'block';
        
        this.positionFloatingElement(this.editor, cell);
        this.editor.focus();
        this.editor.select();
    }

    showDatePicker(cell) {
        if (!this.dateInput || !cell) return;

        const rowIndex = parseInt(cell.dataset.row);
        const colIndex = parseInt(cell.dataset.col);
        const itemId = cell.dataset.itemid;
        
        const tableData = this.getTableData();
        if (!tableData) return;

        const column = tableData.columns[colIndex];
        if (!this.isColumnEditable(column)) return;
        
        this.hideAllEditors();

        const currentValue = tableData.rows[rowIndex].data[colIndex];
        
        let inputValue = '';
        if (currentValue) {
            const date = new Date(currentValue);
            if (!isNaN(date.getTime())) {
                // NEW: Use local date components to avoid UTC shift/off-by-one day
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                inputValue = `${year}-${month}-${day}`;
            }
        }
        // Fallback to today (also local)
        if (!inputValue) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            inputValue = `${year}-${month}-${day}`;
        }
        this.dateInput.value = inputValue;

        // Store cell details on the date input element itself (fixes race condition)
        this.dateInput.dataset.rowIndex = rowIndex.toString();
        this.dateInput.dataset.colIndex = colIndex.toString();
        this.dateInput.dataset.itemId = itemId;

        this.dateInput.style.display = 'block';
        
        this.positionFloatingElement(this.dateInput, cell);
        this.dateInput.focus();

        // Optional: Trigger click to open calendar picker in some browsers
        setTimeout(() => {
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            this.dateInput.dispatchEvent(clickEvent);
        }, 50);
    }

    positionFloatingElement(element, cell) {
        const rect = cell.getBoundingClientRect();
        const container = this.shadowRoot.querySelector('.table-container');
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        
        // Use absolute positioning relative to the scrolling container
        element.style.position = 'absolute';
        element.style.left = `${rect.left - containerRect.left}px`;
        element.style.top = `${rect.top - containerRect.top}px`;
        element.style.width = `${rect.width}px`;
        element.style.height = `${rect.height}px`;
        element.style.zIndex = '9999'; // Ensure it layers above the table
        
        const computedStyle = window.getComputedStyle(cell);
        element.style.padding = computedStyle.padding;
        element.style.fontSize = computedStyle.fontSize;
        element.style.fontFamily = computedStyle.fontFamily;
        element.style.fontWeight = computedStyle.fontWeight;
        element.style.textAlign = computedStyle.textAlign;
        element.style.border = 'none'; // Match cell border for seamless look
        element.style.background = computedStyle.backgroundColor;
    }

    handleCheckboxClick(rowIndex, colIndex, itemId, e) {
        e.stopPropagation();
        
        const tableData = this.getTableData();
        if (!tableData) return;

        const column = tableData.columns[colIndex];
        if (!this.isColumnEditable(column)) return;

        const currentValue = tableData.rows[rowIndex].data[colIndex];
        const newValue = !currentValue;
        
        this.updateCellValue(rowIndex, colIndex, itemId, newValue);
    }

    handleNumberChange(rowIndex, colIndex, itemId, delta, column) {
        if (!this.isColumnEditable(column)) return;

        const tableData = this.getTableData();
        if (!tableData) return;

        const currentValue = parseFloat(tableData.rows[rowIndex].data[colIndex]) || 0;
        const step = column.step || 1;
        let newValue = currentValue + (delta * step);
        
        if (column.min !== undefined) {
            newValue = Math.max(column.min, newValue);
        }
        if (column.max !== undefined) {
            newValue = Math.min(column.max, newValue);
        }
        
        this.updateCellValue(rowIndex, colIndex, itemId, newValue);
    }

    handleCycleClick(rowIndex, colIndex, itemId, column) {
        if (!this.isColumnEditable(column)) return;

        const tableData = this.getTableData();
        if (!tableData) return;

        const currentValue = tableData.rows[rowIndex].data[colIndex];
        const options = column.options || [];
        const currentIndex = options.indexOf(currentValue);
        const nextIndex = (currentIndex + 1) % options.length;
        const newValue = options[nextIndex];
        
        this.updateCellValue(rowIndex, colIndex, itemId, newValue);
    }

    handleCellClick(rowIndex, colIndex, itemId, column, e) {
        // NEW: Force close any open editors and reset state FIRST (fixes race/copy bug)
        this.hideAllEditors();

        if (!this.isColumnEditable(column)) return;
        if (column.type === 'content') return;

        // Block swipe gesture entirely for editable clicks
        e.stopPropagation(); // Stop event bubbling first
        e.preventDefault();
        e.stopImmediatePropagation(); // Stops Swiper and all other handlers

        if (column.type === 'checkbox') {
            this.handleCheckboxClick(rowIndex, colIndex, itemId, e); // Still handle checkbox
            return;
        } else if (column.type === 'dropdown') {
            this.showDropdown(e.currentTarget, column.options);
        } else if (column.type === 'date') {
            this.showDatePicker(e.currentTarget);
        } else if (column.type === 'number') {
            return; // No overlay, but prevent swipe if needed
        } else if (column.type === 'cycle') {
            this.handleCycleClick(rowIndex, colIndex, itemId, column);
        } else {
            this.showEditor(e.currentTarget);
        }
    }

    handleCellKeyDown(rowIndex, colIndex, itemId, e) {
        const ARROW_LEFT = 37, ARROW_UP = 38, ARROW_RIGHT = 39, ARROW_DOWN = 40, ENTER = 13;
        
        const tableData = this.getTableData();
        if (!tableData) return;

        let prevent = true;
        let newRow = rowIndex;
        let newCol = colIndex;

        if (e.which === ARROW_RIGHT && colIndex < tableData.columns.length - 1) {
            newCol = colIndex + 1;
        } else if (e.which === ARROW_LEFT && colIndex > 0) {
            newCol = colIndex - 1;
        } else if (e.which === ARROW_UP && rowIndex > 0) {
            newRow = rowIndex - 1;
        } else if (e.which === ARROW_DOWN && rowIndex < tableData.rows.length - 1) {
            newRow = rowIndex + 1;
        } else if (e.which === ENTER) {
            const column = tableData.columns[colIndex];
            if (column.type !== 'content' && this.isColumnEditable(column)) {
                e.preventDefault(); // Block any key-triggered swipe
                e.stopImmediatePropagation();
                if (column.type === 'text') {
                    this.showEditor(e.currentTarget);
                } else if (column.type === 'dropdown') {
                    this.showDropdown(e.currentTarget, column.options);
                } else if (column.type === 'date') {
                    this.showDatePicker(e.currentTarget);
                }
            }
        } else {
            prevent = false;
        }

        if (prevent && (newRow !== rowIndex || newCol !== colIndex)) {
            e.preventDefault();
            const newCell = this.shadowRoot.querySelector(`[data-row="${newRow}"][data-col="${newCol}"]`);
            if (newCell) {
                newCell.focus();
            }
        }
    }

    generateStyles() {
        var style = document.createElement('style');
        style.id = 'customPowerTableStyle';
    
        try { 
            this.shadowRoot.getElementById(style.id)?.remove(); 
        } catch (error) { 
            // Ignore if not found
        }
    
        let customStyle = this.config.style || '';
    
        if (this.config.accent) {
            // Use border-left for accent: solid color edge, no width added
            const accentStyle = `.left-accent { border-left: 6px solid ${this.config.accent} !important; padding-left: 0 !important; margin-left: 0 !important; }`;
            customStyle = customStyle + accentStyle;
        }
    
        if (customStyle) {
            style.innerHTML = customStyle;
            this.shadowRoot.appendChild(style);
        }
    }

    render() {
        if (!this.hass) {
            return html`<ha-card>Loading...</ha-card>`;
        }
    
        const tableData = this.getTableData();
        if (!tableData) {
            return html`<ha-card>
                <div style="padding: 20px;">
                    No table data available.
                </div>
            </ha-card>`;
        }
    
        if (!tableData.rows || !Array.isArray(tableData.rows)) {
            return html`<ha-card>
                <div style="padding: 20px;">
                    Invalid table data format.
                </div>
            </ha-card>`;
        }
    
        const cardName = this.config.friendly_name || 'Power Table';
        const canAddRows = this.isTableEditable();
        const shouldFitWidth = this.config.fit_width;
        const hasActionsBase = this.config.standalone_mode && canAddRows;
        const numRows = tableData.rows.length;
        const visibleActions = hasActionsBase && this.showActions && numRows > 0;
        const actionsMinWidth = shouldFitWidth ? '80px' : '80px';
    
        let colWidths = {};
        let colMinWidths = {};
        if (shouldFitWidth) {
            const fixedWidths = [];
            const flexibleColumns = [];
            tableData.columns.forEach((col, idx) => {
                if (col.min_width) {
                    fixedWidths.push(col.min_width);
                    colWidths[idx] = col.min_width;
                    colMinWidths[idx] = col.min_width;
                } else {
                    flexibleColumns.push(idx);
                }
            });
    
            if (visibleActions) {
                fixedWidths.push(actionsMinWidth);
            }
    
            const numFlexible = flexibleColumns.length;
            if (numFlexible > 0) {
                const fixedSum = fixedWidths.length > 0 ? fixedWidths.reduce((sum, w) => sum + parseFloat(w), 0) + 'px' : '0px';
                const flexibleWidth = `calc( (100% - ${fixedSum}) / ${numFlexible} )`;
                flexibleColumns.forEach(idx => {
                    colWidths[idx] = flexibleWidth;
                    colMinWidths[idx] = '0px';
                });
            } else {
                if (fixedWidths.length > 0) {
                    console.warn('fit_width: Total fixed widths may exceed 100%; table may overflow.');
                }
            }
    
            if (visibleActions) {
                colWidths['actions'] = actionsMinWidth;
                colMinWidths['actions'] = actionsMinWidth;
            }
        }
    
        this.generateStyles();  // Existing: For accent/style

        const topMarkdown = this.renderTemplate(this.config.markdown_top_content);
        const bottomMarkdown = this.renderTemplate(this.config.markdown_bottom_content);
    
        return html`<ha-card class="${this.config.accent ? 'left-accent' : ''}">
            ${this.config.show_header
                ? html`<h1 class="card-header">
                    <div class="name">${cardName}</div>
                </h1>`
                : html``}
            
            <!-- NEW: Top Markdown (above table, no gap) -->
            ${this.config.markdown_top_content ? html`<div class="top-markdown" .innerHTML=${topMarkdown}></div>` : ''}
            
            <div 
                class="table-container ${shouldFitWidth ? 'fit-width' : ''}" 
                @pointerdown=${(e) => this.handleLongPressStart(e)}
                @pointerup=${(e) => this.handleLongPressEnd(e)}
                @pointerleave=${(e) => this.handleLongPressEnd(e)}
                @pointercancel=${(e) => this.handleLongPressEnd(e)}
                @touchstart=${(e) => e.stopPropagation()}
                @touchmove=${(e) => e.stopPropagation()}
            >
                <table class="power-table ${shouldFitWidth ? 'fit-width-table' : ''}" style=${shouldFitWidth ? `table-layout: fixed; width: 100%;` : ''}>
                    <thead>
                        <tr>
                            ${tableData.columns.map((col, colIndex) => html`
                                <th 
                                    class="${col.type === 'content' || !this.isColumnEditable(col) ? 'readonly-header' : ''} ${shouldFitWidth ? 'fit-width-col' : ''}" 
                                    style=${shouldFitWidth ? `width: ${colWidths[colIndex] || 'auto'}; min-width: ${colMinWidths[colIndex] || 'auto'};` : ''}
                                >${col.name}</th>
                            `)}
                            ${visibleActions
                                ? html`<th class="actions-header ${shouldFitWidth ? 'fit-width-col' : ''}" style=${shouldFitWidth ? `width: ${colWidths['actions']}; min-width: ${colMinWidths['actions']};` : 'width: 80px;'}>Actions</th>`
                                : html``}
                        </tr>
                    </thead>
                    <tbody>
                        ${tableData.rows.map((row, rowIndex) => html`
                            <tr class="${row.isMissing ? 'missing-row' : ''}">
                                ${row.data.map((cellValue, colIndex) => {
                                    const column = tableData.columns[colIndex];
                                    const isEditable = this.isColumnEditable(column);
                                    const isReadonly = !isEditable || column.type === 'content' || (row.isMissing && this.config.if_missing === 'disable');
                                    
                                    return html`
                                        <td
                                            class="${isReadonly ? 'readonly-cell' : ''} ${column.type === 'number' ? 'number-cell' : ''} ${row.isMissing && this.config.if_missing === 'disable' ? 'disabled-missing' : ''} ${shouldFitWidth ? 'fit-width-cell' : ''}"
                                            data-row="${rowIndex}"
                                            data-col="${colIndex}"
                                            data-itemid="${row.itemId}"
                                            tabindex="${isReadonly ? -1 : 0}"
                                            @click=${(e) => !isReadonly && this.handleCellClick(rowIndex, colIndex, row.itemId, column, e)}
                                            @keydown=${(e) => !isReadonly && this.handleCellKeyDown(rowIndex, colIndex, row.itemId, e)}
                                            style=${shouldFitWidth ? `width: ${colWidths[colIndex] || 'auto'}; min-width: ${colMinWidths[colIndex] || 'auto'};` : ''}
                                        >
                                            ${this.renderCell(column, cellValue, rowIndex, colIndex, row.itemId, isReadonly)}
                                        </td>
                                    `;
                                })}
                                ${visibleActions
                                    ? html`<td class="actions-cell ${shouldFitWidth ? 'fit-width-cell' : ''}" style=${shouldFitWidth ? `width: ${colWidths['actions']}; min-width: ${colMinWidths['actions']};` : 'width: 80px;'}>
                                        <div class="actions-buttons">
                                            <button 
                                                class="action-btn add-below" 
                                                @click=${() => this.addRowBelow(rowIndex)}
                                                title="Add row below"
                                            >➕</button>
                                            <button 
                                                class="action-btn delete" 
                                                @click=${() => this.deleteRow(row.itemId)}
                                                title="Delete row"
                                            >🗑️</button>
                                            <button 
                                                class="action-btn up" 
                                                @click=${() => this.swapRowsUp(rowIndex)}
                                                title="Move up"
                                            >⬆</button>
                                            <button 
                                                class="action-btn down" 
                                                @click=${() => this.swapRowsDown(rowIndex)}
                                                title="Move down"
                                            >⬇</button>
                                        </div>
                                    </td>`
                                    : html``}
                            </tr>
                        `)}
                    </tbody>
                </table>
                ${numRows === 0 && this.config.standalone_mode && this.isTableEditable() ? html`
                    <div class="add-row-section">
                        <button class="add-first-row-btn" @click=${() => this.addRowBelow(-1)}>
                            <ha-icon icon="mdi:plus"></ha-icon> Add First Row
                        </button>
                    </div>
                ` : ''}
            </div>
            
            <!-- NEW: Bottom Markdown (below table, no gap) -->
            ${this.config.markdown_bottom_content ? html`<div class="bottom-markdown" .innerHTML=${bottomMarkdown}></div>` : ''}
        </ha-card>`;
    }

    renderCell(column, cellValue, rowIndex, colIndex, itemId, isReadonly) {
        switch (column.type) {
            case 'checkbox':
                return html`<input 
                    type="checkbox" 
                    .checked=${cellValue}
                    .disabled=${isReadonly}
                    @click=${(e) => !isReadonly && this.handleCheckboxClick(rowIndex, colIndex, itemId, e)}
                    @change=${(e) => e.preventDefault()}
                />`;
            
            case 'number':
                return html`
                    <div class="number-control">
                        <button 
                            class="number-btn"
                            ?disabled=${isReadonly}
                            @click=${(e) => {
                                e.stopPropagation();
                                !isReadonly && this.handleNumberChange(rowIndex, colIndex, itemId, -1, column);
                            }}
                        >-</button>
                        <span class="number-value">${cellValue}</span>
                        <button 
                            class="number-btn"
                            ?disabled=${isReadonly}
                            @click=${(e) => {
                                e.stopPropagation();
                                !isReadonly && this.handleNumberChange(rowIndex, colIndex, itemId, 1, column);
                            }}
                        >+</button>
                    </div>
                `;
            
            case 'cycle':
                return html`
                    <span class="cycle-value">${cellValue}</span>
                `;
            
            case 'dropdown':
                return html`
                    <div class="dropdown-cell">
                        <span class="dropdown-value">${cellValue || ''}</span>
                        ${!isReadonly ? html`<span class="dropdown-arrow">▼</span>` : ''}
                    </div>
                `;
            
            case 'date':
                return cellValue;
            
            default:
                return cellValue;
        }
    }
    
    static get styles() {
        return css`
            ha-card {
                position: relative;
                padding-bottom: 10px;
                transform: none; /* Prevent parent transform inheritance */
                left: 0;
                right: 0;
            }

            .card-header {
                padding-bottom: unset;
            }

            .table-container {
                padding: 15px;
                overflow-x: auto;
                touch-action: pan-y manipulation; /* Allow vertical scroll, block horizontal swipe interference */
                position: relative;
                transform: none;
            }

            .table-container.fit-width {
                overflow-x: hidden;
                padding: 0;
                touch-action: manipulation; /* fit-width doesn't need horizontal scroll */
            }

            .power-table {
                width: 100%;
                border-collapse: collapse;
                cursor: pointer;
                user-select: none; /* Prevent text selection during long press */
                transform: none; /* Prevent parent transform inheritance */
                position: relative;
            }

            .power-table.fit-width-table th,
            .power-table.fit-width-table td {
                padding: 2px 4px;
                font-size: 0.8em;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                min-width: 0;
                box-sizing: border-box;
            }

            .power-table th {
                border: 1px solid var(--divider-color, #e0e0e0);
                padding: 8px 12px;
                background: var(--table-header-background-color, #f5f5f5);
                font-weight: bold;
                text-align: left;
                min-width: 80px;
                box-sizing: border-box;
            }

            .power-table th.readonly-header {
                background: var(--secondary-background-color, #e8e8e8);
                font-style: italic;
            }

            .power-table th.actions-header {
                text-align: center;
            }

            .power-table td {
                border: 1px solid var(--divider-color, #e0e0e0);
                padding: 8px 12px;
                min-width: 80px;
                position: relative;
                background: var(--card-background-color, white);
                transition: background-color 0.2s;
                box-sizing: border-box;
            }

            .power-table td.readonly-cell {
                background: var(--secondary-background-color, #f5f5f5);
                cursor: default;
                font-style: italic;
                color: var(--secondary-text-color, #666);
            }

            .power-table td.disabled-missing {
                background: #fff3cd !important;
                color: #856404;
                font-style: italic;
            }

            .power-table tr.missing-row td {
                opacity: 0.7;
            }

            .power-table td:not(.readonly-cell):focus {
                outline: 2px solid var(--primary-color, #03a9f4);
                outline-offset: -2px;
                background: var(--table-row-alternative-background-color, #fafafa);
            }

            .power-table td.number-cell {
                padding: 4px;
            }

            .power-table td.actions-cell {
                text-align: center;
                padding: 4px;
            }

            .actions-buttons {
                display: flex;
                flex-direction: row;
                gap: 2px;
                justify-content: center;
            }

            .action-btn {
                background: none;
                border: none;
                padding: 2px 4px;
                cursor: pointer;
                font-size: 12px;
                border-radius: 2px;
            }

            .action-btn:hover {
                background: var(--divider-color, #e0e0e0);
            }

            .action-btn.add-below {
                color: #4caf50;
            }

            .action-btn.delete {
                color: #f44336;
            }

            .action-btn.up,
            .action-btn.down {
                color: #2196f3;
            }

            .power-table input[type="checkbox"] {
                cursor: pointer;
                width: 16px;
                height: 16px;
            }

            .power-table input[type="checkbox"]:disabled {
                cursor: default;
                opacity: 0.6;
            }

            .number-control {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 2px;
            }

            .number-btn {
                background: var(--mdc-theme-primary, #03a9f4);
                color: var(--mdc-theme-on-primary, white);
                border: none;
                border-radius: 4px;
                width: 20px;
                height: 20px;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .number-btn:hover:not(:disabled) {
                background: var(--mdc-theme-primary, #03a9f4);
            }

            .number-btn:disabled {
                background: var(--disabled-text-color, #bbb);
                cursor: default;
            }

            .number-value {
                flex: 1;
                text-align: center;
                font-weight: bold;
            }

            .cycle-value {
                display: block;
                padding: 2px 6px;
                background: var(--mdc-theme-primary, #03a9f4);
                color: var(--mdc-theme-on-primary, white);
                border-radius: 4px;
                text-align: center;
                cursor: pointer;
            }

            .readonly-cell .cycle-value {
                background: var(--disabled-text-color, #bbb);
                cursor: default;
            }

            .dropdown-cell {
                display: flex;
                align-items: center;
                justify-content: space-between;
                height: 100%;
                cursor: pointer;
            }

            .dropdown-value {
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .dropdown-arrow {
                font-size: 12px;
                color: var(--secondary-text-color, #666);
                margin-left: 4px;
                flex-shrink: 0;
            }

            .readonly-cell .dropdown-arrow {
                display: none;
            }

            .cell-editor,
            .cell-date {
                position: absolute;
                z-index: 1000;
                border: 2px solid var(--primary-color, #03a9f4);
                box-sizing: border-box;
                font-size: 14px;
                font-family: inherit;
                background: var(--card-background-color, white);
                max-height: 200px;
                overflow-y: auto;
                transform: none; /* Add this line */
            }

            .cell-editor:focus,
            .cell-date:focus {
                outline: none;
            }

            .cell-date {
                cursor: pointer;
            }

            .custom-dropdown-menu {
                position: absolute;
                z-index: 10000;
                background: var(--card-background-color, white);
                border: 1px solid var(--divider-color, #e0e0e0);
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                min-width: 120px;
            }

            .dropdown-list {
                list-style: none;
                margin: 0;
                padding: 0;
                overflow-y: auto;
            }

            .dropdown-list li {
                padding: 8px 12px;
                cursor: pointer;
                border-bottom: 1px solid var(--divider-color, #e0e0e0);
                white-space: nowrap;
                transition: background-color 0.1s;
            }

            .dropdown-list li:hover {
                background: var(--table-row-alternative-background-color, #f5f5f5);
            }

            .dropdown-list li.selected {
                background: var(--primary-color, #e3f2fd);
                font-weight: 500;
            }

            .dropdown-list li:last-child {
                border-bottom: none;
            }

            .top-markdown {
            margin: 0 !important;
            padding: 8px 16px 4px !important;  /* Top: 8px from card edge, bottom: 4px to table */
            font-size: 14px;
            line-height: 1.4;
            border-bottom: 1px solid var(--divider-color, #e0e0e0);  /* Optional subtle separator */
            }
            
            .bottom-markdown {
                margin: 0 !important;
                padding: 4px 16px 8px !important;  /* Top: 4px from table, bottom: 8px to card edge */
                font-size: 14px;
                line-height: 1.4;
                text-align: center;  /* Optional: Center footers */
                color: var(--secondary-text-color, #666);
                font-style: italic;
            }

            .add-row-section {
                padding: 20px;
                text-align: center;
            }

            .add-first-row-btn {
                background: var(--mdc-theme-primary, #03a9f4);
                color: var(--mdc-theme-on-primary, white);
                border: none;
                padding: 12px 24px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }

            .add-first-row-btn:hover {
                background: var(--mdc-theme-primary-dark, #0288d1);
            }

            @media (max-width: 767px) {
                .power-table th,
                .power-table td {
                    min-width: 40px;
                }
            }
        `;
    }
}

customElements.define('powertable-card-editor', PowerTableCardEditor);
customElements.define('powertable-card', PowerTableCard);

window.customCards = window.customCards || [];
window.customCards.push({
    preview: true,
    type: 'powertable-card',
    name: 'Power Table Card',
    description: 'Generic editable table with live data sources, multiple column types, and persistent storage.',
});

console.info(
    '%c POWER-TABLE-CARD ',
    'color: white; background: cornflowerblue; font-weight: 700',
);