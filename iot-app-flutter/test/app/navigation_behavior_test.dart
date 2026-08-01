import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:iot_app_flutter/app/router.dart';
import 'package:iot_app_flutter/core/navigation/app_back_interceptor_registry.dart';
import 'package:iot_app_flutter/core/navigation/app_exit_controller.dart';
import 'package:iot_app_flutter/widgets/app_root_back_scope.dart';
import 'package:iot_app_flutter/widgets/bottom_nav.dart';

void main() {
  testWidgets('tab switching uses independent branches without stacking tabs', (
    tester,
  ) async {
    final harness = _NavigationHarness();
    addTearDown(harness.dispose);

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp.router(routerConfig: harness.router),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('安全'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('我的'));
    await tester.pumpAndSettle();

    expect(find.text('profile-content'), findsOneWidget);
    expect(
      tester.widget<BottomNav>(find.byType(BottomNav)).activeTab,
      'profile',
    );
    expect(harness.safetyKey.currentState!.canPop(), isFalse);
    expect(harness.profileKey.currentState!.canPop(), isFalse);

    await tester.tap(find.text('我的'));
    await tester.pumpAndSettle();

    expect(harness.profileKey.currentState!.canPop(), isFalse);
  });

  testWidgets('system back returns a secondary page to its owning root tab', (
    tester,
  ) async {
    final harness = _NavigationHarness();
    addTearDown(harness.dispose);

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp.router(routerConfig: harness.router),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('我的'));
    await tester.pumpAndSettle();
    harness.router.push('/profile/account');
    await tester.pumpAndSettle();
    expect(find.text('account-content'), findsOneWidget);
    expect(find.byType(BottomNav), findsNothing);

    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();

    expect(find.text('profile-content'), findsOneWidget);
    expect(find.text('account-content'), findsNothing);
    expect(
      tester.widget<BottomNav>(find.byType(BottomNav)).activeTab,
      'profile',
    );
  });

  testWidgets('system back returns a device detail page to home', (
    tester,
  ) async {
    final harness = _NavigationHarness();
    addTearDown(harness.dispose);

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp.router(routerConfig: harness.router),
      ),
    );
    await tester.pumpAndSettle();

    harness.router.push('/device/device-1');
    await tester.pumpAndSettle();

    expect(find.text('device-detail-content'), findsOneWidget);
    expect(find.byType(BottomNav), findsNothing);

    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();

    expect(find.text('home-content'), findsOneWidget);
    expect(find.text('device-detail-content'), findsNothing);
    expect(tester.widget<BottomNav>(find.byType(BottomNav)).activeTab, 'home');
  });

  testWidgets('a root page exits only after two back presses', (tester) async {
    var exitCount = 0;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          exitAppCallbackProvider.overrideWithValue(() async {
            exitCount += 1;
          }),
        ],
        child: const MaterialApp(
          home: Scaffold(
            body: AppRootBackScope(child: Text('root-content')),
          ),
        ),
      ),
    );

    await tester.binding.handlePopRoute();
    await tester.pump();

    expect(find.text('再按一次退出应用'), findsOneWidget);
    expect(exitCount, 0);

    await tester.binding.handlePopRoute();
    await tester.pump();

    expect(exitCount, 1);
  });

  testWidgets('a shell root tab handles back before the platform exits', (
    tester,
  ) async {
    var exitCount = 0;
    final harness = _NavigationHarness();
    addTearDown(harness.dispose);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          exitAppCallbackProvider.overrideWithValue(() async {
            exitCount += 1;
          }),
        ],
        child: MaterialApp.router(routerConfig: harness.router),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('我的'));
    await tester.pumpAndSettle();
    await tester.binding.handlePopRoute();
    await tester.pump();

    expect(find.text('再按一次退出应用'), findsOneWidget);
    expect(exitCount, 0);

    await tester.binding.handlePopRoute();
    await tester.pump();

    expect(exitCount, 1);
  });

  testWidgets('a shell root runs the active tab interceptor before exiting', (
    tester,
  ) async {
    var exitCount = 0;
    var interceptorCount = 0;
    final registry = AppBackInterceptorRegistry()
      ..register(AppRootSection.profile, () {
        interceptorCount += 1;
        return true;
      });
    final harness = _NavigationHarness();
    addTearDown(harness.dispose);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appBackInterceptorRegistryProvider.overrideWithValue(registry),
          exitAppCallbackProvider.overrideWithValue(() async {
            exitCount += 1;
          }),
        ],
        child: MaterialApp.router(routerConfig: harness.router),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('我的'));
    await tester.pumpAndSettle();
    await tester.binding.handlePopRoute();
    await tester.pump();

    expect(interceptorCount, 1);
    expect(exitCount, 0);
    expect(find.text('再按一次退出应用'), findsNothing);
  });
}

class _NavigationHarness {
  _NavigationHarness() {
    router = GoRouter(
      routes: [
        StatefulShellRoute.indexedStack(
          builder: (_, state, navigationShell) => AppShell(
            location: state.uri.path,
            navigationShell: navigationShell,
          ),
          branches: [
            StatefulShellBranch(
              navigatorKey: homeKey,
              routes: [
                GoRoute(
                  path: '/',
                  builder: (_, __) => const Text('home-content'),
                  routes: [
                    GoRoute(
                      path: 'device/:id',
                      builder: (_, __) => const Text('device-detail-content'),
                    ),
                  ],
                ),
              ],
            ),
            StatefulShellBranch(
              navigatorKey: safetyKey,
              routes: [
                GoRoute(
                  path: '/safety',
                  builder: (_, __) => const Text('safety-content'),
                ),
              ],
            ),
            StatefulShellBranch(
              navigatorKey: mallKey,
              routes: [
                GoRoute(
                  path: '/mall',
                  builder: (_, __) => const Text('mall-content'),
                ),
              ],
            ),
            StatefulShellBranch(
              navigatorKey: profileKey,
              routes: [
                GoRoute(
                  path: '/profile',
                  builder: (_, __) => const Text('profile-content'),
                  routes: [
                    GoRoute(
                      path: 'account',
                      builder: (_, __) => const Text('account-content'),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }

  final homeKey = GlobalKey<NavigatorState>();
  final safetyKey = GlobalKey<NavigatorState>();
  final mallKey = GlobalKey<NavigatorState>();
  final profileKey = GlobalKey<NavigatorState>();
  late final GoRouter router;

  void dispose() {
    router.dispose();
  }
}
