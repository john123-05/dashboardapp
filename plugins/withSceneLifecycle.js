// iOS 27 startet Apps, die mit dem iOS-27-SDK (Xcode 27) gebaut sind, nur noch mit
// UIScene-Lebenszyklus (sonst Absturz in _UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption).
// Expo SDK 54 nutzt noch den alten AppDelegate-Start. Dieses Plugin meldet eine einzige Scene an
// und haengt das von Expo erzeugte Fenster an sie; Links werden an den AppDelegate weitergereicht.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const MARKER = '// withSceneLifecycle';

const SCENE_DELEGATE = `
${MARKER}
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let window = appDelegate.window else { return }
    window.windowScene = windowScene
    window.frame = windowScene.coordinateSpace.bounds
    window.rootViewController?.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    window.makeKeyAndVisible()
    self.window = window
    for context in connectionOptions.urlContexts { forward(context) }
    for activity in connectionOptions.userActivities { forward(activity) }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts { forward(context) }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    forward(userActivity)
  }

  private func forward(_ context: UIOpenURLContext) {
    var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    if let source = context.options.sourceApplication { options[.sourceApplication] = source }
    if let annotation = context.options.annotation { options[.annotation] = annotation }
    _ = UIApplication.shared.delegate?.application?(UIApplication.shared, open: context.url, options: options)
  }

  private func forward(_ activity: NSUserActivity) {
    _ = UIApplication.shared.delegate?.application?(UIApplication.shared, continue: activity, restorationHandler: { _ in })
  }
}
`;

module.exports = function withSceneLifecycle(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') throw new Error('withSceneLifecycle: AppDelegate ist nicht Swift');
    if (!cfg.modResults.contents.includes(MARKER)) cfg.modResults.contents += SCENE_DELEGATE;
    else if (!cfg.modResults.contents.includes('window.frame = windowScene.coordinateSpace.bounds')) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        'window.windowScene = windowScene',
        'window.windowScene = windowScene\n    window.frame = windowScene.coordinateSpace.bounds\n    window.rootViewController?.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]'
      );
    }
    return cfg;
  });
};
