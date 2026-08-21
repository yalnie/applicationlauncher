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
    components: [
        {
            kind: Spinner, 
            name: 'loadingSpinner', 
            content: 'Loading...', 
            center: true, 
            showing: truei
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
        this.$.listAppsService.send({});
    },

    onListAppsResponse: function (sender, inResponse) {
        this.$.loadingSpinner.hide();

        if (inResponse && inResponse.apps) {
            this.showPopup("Found " + inResponse.apps.length + " raw apps. Processing...");
            
            var processedApps = [];
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
                    
                    processedApps.push(app);
                }
            });

            try {
                this.installedApps.add(processedApps);
                this.showPopup("Successfully loaded " + processedApps.length + " unique apps.");
            } catch (err) {
                console.error("UI Render Error:", err);
                this.showPopup("Render error: " + err.message);
            }
            
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
        // App launched successfully, no action needed.
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
