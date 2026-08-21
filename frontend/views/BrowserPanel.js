var kind = require('enyo/kind'),
    Model = require('enyo/Model'),
    Collection = require('enyo/Collection'),
    Panel = require('moonstone/Panel'),
    DataGridList = require('moonstone/DataGridList'),
    Item = require('moonstone/Item'),
    MoonImage = require('moonstone/Image'),
    Marquee = require('moonstone/Marquee'),
    Popup = require('moonstone/Popup'),
    Spinner = require('moonstone/Spinner'),
    ExpandablePicker = require('moonstone/ExpandablePicker'),
    LunaService = require('enyo-webos/LunaService');

var AppModel = kind({
    kind: Model,
    name: "AppModel",
    primaryKey: "id"
});

var AppListItem = kind({
    name: 'AppListItem',
    kind: Item,
    classes: 'moon-gridlist-imageitem horizontal-gridList-item horizontal-gridList-image-item',
    components: [
        {
            kind: MoonImage,
            name: 'img',
            style: 'width: 4.25rem; height: 4.25rem; float: left; padding-right: 1rem; padding-top: 0.25rem',
            sizing: 'contain',
        },
        {name: 'caption', classes: 'caption', kind: Marquee.Text},
        {name: 'subCaption', classes: 'sub-caption', kind: Marquee.Text},
    ],
    bindings: [
        {from: 'model.title', to: '$.caption.content'},
        {from: 'model.id', to: '$.subCaption.content'},
        {from: 'model.icon', to: '$.img.src'},
    ]
});

module.exports = kind({
    name: 'BrowserPanel', 
    kind: Panel,
    title: 'Installed Applications',
    titleBelow: 'Local apps on this TV',
    headerType: 'medium',
    
    headerComponents: [
        {
            kind: ExpandablePicker,
            name: 'filterPicker',
            content: 'Filter: Loading...',
            onChange: 'onFilterChange',
            autoCollapse: true,
            components: []
        }
    ],

    components: [
        {
            kind: Spinner, 
            name: 'loadingSpinner', 
            content: 'Loading...', 
            center: true, 
            showing: true
        },
        {
            kind: Popup, 
            name: 'infoPopup', 
            content: '', 
            modal: false, 
            autoDismiss: true, 
            allowBackKey: true,
            classes: 'moon-toast'
        },
        {
            kind: LunaService, 
            name: 'listAppsService', 
            service: 'luna://io.github.yalnie.applicationlauncher.service', 
            method: 'listApps',
            onResponse: 'onListAppsResponse', 
            onError: 'onListAppsError'
        },
        {
            kind: LunaService,
            name: 'launchAppService',
            service: 'luna://io.github.yalnie.applicationlauncher.service',
            method: 'launchApp',
            onResponse: 'onLaunchResponse',
            onError: 'onLaunchError'
        },
        {
            name: 'appList', 
            fit: true, 
            spacing: 20, 
            minWidth: 500, 
            minHeight: 120, 
            kind: DataGridList, 
            components: [
                {kind: AppListItem}
            ], 
            ontap: 'onAppTapped'
        }
    ],
    
    bindings: [
        {from: 'installedApps', to: '$.appList.collection'}
    ],

    create: function () {
        this.inherited(arguments);
        this.set('installedApps', new Collection({model: AppModel}));
        
        this.rawApps = [];
        this.currentFilter = 'all';
        
        this.$.listAppsService.send({});
    },

    buildFilterMenu: function(counts) {
        this.$.filterPicker.destroyClientControls();
        
        var items = [
            {content: 'All Apps (' + this.rawApps.length + ')', value: 'all', active: (this.currentFilter === 'all')}
        ];
        
        if (counts.installed > 0) items.push({content: 'Installed Apps (' + counts.installed + ')', value: 'installed', active: (this.currentFilter === 'installed')});
        if (counts.system > 0) items.push({content: 'System Apps (' + counts.system + ')', value: 'system', active: (this.currentFilter === 'system')});
        if (counts.hidden > 0) items.push({content: 'Hidden System Apps (' + counts.hidden + ')', value: 'hidden', active: (this.currentFilter === 'hidden')});
        if (counts.dev > 0) items.push({content: 'Developer Apps (' + counts.dev + ')', value: 'dev', active: (this.currentFilter === 'dev')});
        
        var valid = items.some(function(item) { return item.value === this.currentFilter; }.bind(this));
        if (!valid) {
            this.currentFilter = 'all';
            items[0].active = true;
        }

        this.$.filterPicker.createComponents(items, {owner: this});
        this.$.filterPicker.render();
        
        var activeItem = null;
        for (var i = 0; i < items.length; i++) {
            if (items[i].active) { activeItem = items[i]; break; }
        }
        if (activeItem) {
            this.$.filterPicker.setContent("Filter: " + activeItem.content);
        }
    },

    onFilterChange: function(sender, ev) {
        if (ev && ev.selected) {
            var selectedValue = ev.selected.value;
            var selectedContent = ev.selected.content;
            
            if (selectedValue && this.currentFilter !== selectedValue) {
                this.currentFilter = selectedValue;
                this.$.filterPicker.setContent("Filter: " + selectedContent);
                this.applyFilter();
            }
        }
    },

    applyFilter: function() {
        if (!this.rawApps) return;
        
        var filtered = this.rawApps.filter(function(app) {
            if (this.currentFilter === 'all') return true;
            return app.category === this.currentFilter;
        }.bind(this));
        
        this.installedApps.remove(this.installedApps.models); 
        this.installedApps.add(filtered);
    },

    onListAppsResponse: function (sender, inResponse) {
        this.$.loadingSpinner.hide();

        if (inResponse && inResponse.apps) {
            this.rawApps = [];
            var counts = { system: 0, hidden: 0, installed: 0, dev: 0 };
            var seenIds = {};            
            
            inResponse.apps.forEach(function(app) {
                if (app && app.id && !seenIds[app.id]) {
                    seenIds[app.id] = true; 
                    
                    if (app.icon && app.icon.indexOf('http') !== 0 && app.icon.indexOf('data:') !== 0 && app.folderPath) {
                        app.icon = app.folderPath + '/' + app.icon;
                    }
                    
                    if (!app.title) {
                        app.title = app.id;
                    }
                    
                    var cat = 'installed';
                    var path = app.folderPath || "";
                    
                    if (path.indexOf('developer/apps') !== -1) {
                        cat = 'dev';
                    } else if (path.indexOf('cryptofs/apps') !== -1) {
                        cat = 'installed';
                    } else if (app.systemApp === true || path.indexOf('/usr/palm/') !== -1 || path.indexOf('/media/system/') !== -1) {
                        if (app.visible === false || (app.class && app.class.hidden === true)) {
                            cat = 'hidden';
                        } else {
                            cat = 'system';
                        }
                    }
                    
                    app.category = cat;
                    counts[cat]++;
                    this.rawApps.push(app);
                }
            }.bind(this));

            this.buildFilterMenu(counts);
            this.applyFilter();
            
        } else {
            this.showPopup("Service responded, but no apps found in directories.");
        }
    },

    onListAppsError: function(sender, inError) {
        this.$.loadingSpinner.hide();
        console.error("Failed to list apps:", inError);
        var errorMessage = inError.errorText || "Permission denied or service unavailable.";
        this.showPopup("Failed to load apps: " + errorMessage);
    },

    onAppTapped: function (sender, ev) {
        if (ev.model) {
            var appID = ev.model.get('id');
            this.showPopup("Starting: " + ev.model.get('title') + "...");
            this.$.launchAppService.send({ id: appID });
        }
    },

    onLaunchResponse: function (sender, inResponse) {
    },

    onLaunchError: function (sender, inError) {
        console.error("Failed to launch app:", inError);
        var errorMessage = inError.errorText || "Unknown error.";
        this.showPopup("Cannot launch app: " + errorMessage);
    },

    showPopup: function(message) {
        this.$.infoPopup.setContent(message);
        this.$.infoPopup.show();
    }
});
