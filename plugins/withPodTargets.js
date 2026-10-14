// Xcode 26 verlangt für alle Pods mindestens iOS 15. Einige Pakete (SDWebImage, RNSVG, AsyncStorage)
// geben in ihren Ressourcen-Zielen noch ältere Werte an. Dieses Plugin hebt sie im Podfile an.
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withPodTargets(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const file = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(file, 'utf8');
      if (!podfile.includes('lp-min-ios')) {
        podfile = podfile.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|
    # lp-min-ios
    installer.pods_project.targets.each do |t|
      t.build_configurations.each do |c|
        c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1' if c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 15.1
      end
    end`,
        );
        fs.writeFileSync(file, podfile);
      }
      return cfg;
    },
  ]);
};
