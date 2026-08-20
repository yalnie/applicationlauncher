var kind = require('enyo/kind'),
    Panels = require('moonstone/Panels'),
    BrowserPanel = require('./BrowserPanel.js');

module.exports = kind({
  name: 'myapp.MainView',
  classes: 'moon enyo-fit main-view',
  components: [
    {
      kind: Panels,
      name: 'panels',
      pattern: 'activity',
      hasCloseButton: false,
      wrap: true,
      popOnBack: true,
      components: [
        {
          kind: BrowserPanel,
        },
      ],
      onTransitionFinish: 'transitionFinish',
    }
  ],
  
  create: function () {
    this.inherited(arguments);
    document.title = 'Installed Applications';

    try {
      if (window.PalmSystem) {
        document.addEventListener('webOSRelaunch', function(data) {
          // App brought back to the foreground.
          // No launch params to process for a basic launcher.
        });
      }
    } catch (err) {
      console.warn('Process launch params failed:', err);
    }
  },

  transitionFinish: function (evt, sender) {
    if (this.$.panels.getActive()) {
        document.title = this.$.panels.getActive().title || 'Activity Launcher';
    }
  }
});
