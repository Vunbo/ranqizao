import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:iot_app_flutter/core/navigation/app_back_interceptor_registry.dart';
import 'package:iot_app_flutter/core/theme.dart';
import 'package:iot_app_flutter/core/navigation/app_exit_controller.dart';
import 'package:iot_app_flutter/features/alerts/alerts_page.dart';
import 'package:iot_app_flutter/features/auth/auth_bootstrap_page.dart';
import 'package:iot_app_flutter/features/auth/login_page.dart';
import 'package:iot_app_flutter/features/device_detail/device_detail_page.dart';
import 'package:iot_app_flutter/features/home/home_page.dart';
import 'package:iot_app_flutter/features/mall/mall_page.dart';
import 'package:iot_app_flutter/features/profile/profile_page.dart';
import 'package:iot_app_flutter/features/profile/profile_section_page.dart';
import 'package:iot_app_flutter/features/safety/safety_page.dart';
import 'package:iot_app_flutter/providers/auth_provider.dart';
import 'package:iot_app_flutter/widgets/app_root_back_scope.dart';
import 'package:iot_app_flutter/widgets/bottom_nav.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authStatus = ref.watch(
    authProvider.select((state) => state.status),
  );

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/splash',
    redirect: (context, state) {
      final onSplash = state.matchedLocation == '/splash';
      final onLogin = state.matchedLocation == '/login';

      if (authStatus == AuthStatus.uninitialized) {
        return onSplash ? null : '/splash';
      }

      if (authStatus != AuthStatus.authenticated) {
        return onLogin ? null : '/login';
      }

      if (onSplash || onLogin) {
        return '/';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (_, __) => const AuthBootstrapPage(),
      ),
      GoRoute(
        path: '/login',
        builder: (_, __) => const LoginPage(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (_, state, navigationShell) {
          return AppShell(
            location: state.uri.path,
            navigationShell: navigationShell,
          );
        },
        branches: [
          StatefulShellBranch(
            navigatorKey: homeNavigatorKey,
            routes: [
              GoRoute(
                path: '/',
                builder: (_, __) => const HomePage(),
                routes: [
                  GoRoute(
                    path: 'alerts',
                    builder: (_, __) => const AlertsPage(),
                  ),
                  GoRoute(
                    path: 'device/:id',
                    builder: (_, state) => DeviceDetailPage(
                      deviceId: state.pathParameters['id']!,
                    ),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            navigatorKey: safetyNavigatorKey,
            routes: [
              GoRoute(
                path: '/safety',
                builder: (_, __) => const SafetyPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            navigatorKey: mallNavigatorKey,
            routes: [
              GoRoute(
                path: '/mall',
                builder: (_, __) => const MallPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            navigatorKey: profileNavigatorKey,
            routes: [
              GoRoute(
                path: '/profile',
                builder: (_, __) => const ProfilePage(),
                routes: [
                  GoRoute(
                    path: ':section',
                    builder: (_, state) => ProfileSectionPage(
                      section: state.pathParameters['section']!,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  );
});

final _rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');
final homeNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'home');
final safetyNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'safety');
final mallNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'mall');
final profileNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'profile');

class AppShell extends ConsumerStatefulWidget {
  const AppShell({
    super.key,
    required this.location,
    required this.navigationShell,
  });

  final String location;
  final StatefulNavigationShell navigationShell;

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  @override
  void didUpdateWidget(covariant AppShell oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.location != widget.location) {
      ref.read(appExitControllerProvider).reset();
    }
  }

  bool get _showBottomNav {
    return widget.location == '/' ||
        widget.location == '/safety' ||
        widget.location == '/mall' ||
        widget.location == '/profile';
  }

  bool get _useShellTopInset {
    return !widget.location.startsWith('/mall');
  }

  AppRootSection get _currentSection =>
      switch (widget.navigationShell.currentIndex) {
        1 => AppRootSection.safety,
        2 => AppRootSection.mall,
        3 => AppRootSection.profile,
        _ => AppRootSection.home,
      };

  String get _currentTab => _currentSection.name;

  void _changeTab(String tab) {
    final nextIndex = switch (tab) {
      'safety' => 1,
      'mall' => 2,
      'profile' => 3,
      _ => 0,
    };
    if (nextIndex == widget.navigationShell.currentIndex) {
      return;
    }
    ref.read(appExitControllerProvider).reset();
    widget.navigationShell.goBranch(
      nextIndex,
      initialLocation: false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final topInset = MediaQuery.of(context).padding.top + 14;

    return AppRootBackScope(
      onBeforeExit: () =>
          ref.read(appBackInterceptorRegistryProvider).handle(_currentSection),
      child: Scaffold(
        backgroundColor: AppColors.pageBg,
        body: SafeArea(
          top: false,
          child: Column(
            children: [
              if (_useShellTopInset) Container(height: topInset),
              Expanded(child: widget.navigationShell),
            ],
          ),
        ),
        bottomNavigationBar: _showBottomNav
            ? BottomNav(
                activeTab: _currentTab,
                onChange: _changeTab,
              )
            : null,
      ),
    );
  }
}
