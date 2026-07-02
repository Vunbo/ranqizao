import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:iot_app_flutter/core/theme.dart';
import 'package:iot_app_flutter/features/alerts/alerts_page.dart';
import 'package:iot_app_flutter/features/auth/auth_bootstrap_page.dart';
import 'package:iot_app_flutter/features/auth/login_page.dart';
import 'package:iot_app_flutter/features/device_detail/device_detail_page.dart';
import 'package:iot_app_flutter/features/home/home_page.dart';
import 'package:iot_app_flutter/features/mall/mall_page.dart';
import 'package:iot_app_flutter/features/profile/profile_page.dart';
import 'package:iot_app_flutter/features/safety/safety_page.dart';
import 'package:iot_app_flutter/providers/auth_provider.dart';
import 'package:iot_app_flutter/widgets/bottom_nav.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final onSplash = state.matchedLocation == '/splash';
      final onLogin = state.matchedLocation == '/login';

      if (!authState.isReady) {
        return onSplash ? null : '/splash';
      }

      if (!authState.isLoggedIn) {
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
      ShellRoute(
        builder: (_, state, child) {
          return AppShell(
            location: state.matchedLocation,
            child: child,
          );
        },
        routes: [
          GoRoute(
            path: '/',
            builder: (_, __) => const HomePage(),
          ),
          GoRoute(
            path: '/safety',
            builder: (_, __) => const SafetyPage(),
          ),
          GoRoute(
            path: '/mall',
            builder: (_, __) => const MallPage(),
          ),
          GoRoute(
            path: '/profile',
            builder: (_, __) => const ProfilePage(),
          ),
          GoRoute(
            path: '/alerts',
            builder: (_, __) => const AlertsPage(),
          ),
          GoRoute(
            path: '/device/:id',
            builder: (_, state) {
              return DeviceDetailPage(
                deviceId: state.pathParameters['id']!,
              );
            },
          ),
        ],
      ),
    ],
  );
});

class AppShell extends StatelessWidget {
  const AppShell({
    super.key,
    required this.location,
    required this.child,
  });

  final String location;
  final Widget child;

  bool get _showBottomNav {
    if (location.startsWith('/device/')) {
      return false;
    }
    if (location == '/alerts') {
      return false;
    }
    if (location.startsWith('/mall')) {
      return false;
    }
    return true;
  }

  bool get _useShellTopInset {
    return !location.startsWith('/mall');
  }

  String get _currentTab {
    if (location.startsWith('/safety')) {
      return 'safety';
    }
    if (location.startsWith('/mall')) {
      return 'mall';
    }
    if (location.startsWith('/profile')) {
      return 'profile';
    }
    return 'home';
  }

  @override
  Widget build(BuildContext context) {
    final topInset = MediaQuery.of(context).padding.top + 14;

    return Scaffold(
      backgroundColor: AppColors.pageBg,
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            if (_useShellTopInset) Container(height: topInset),
            Expanded(child: child),
          ],
        ),
      ),
      bottomNavigationBar: _showBottomNav
          ? BottomNav(
              activeTab: _currentTab,
              onChange: (tab) {
                switch (tab) {
                  case 'home':
                    context.go('/');
                    break;
                  case 'safety':
                    context.go('/safety');
                    break;
                  case 'mall':
                    context.go('/mall');
                    break;
                  case 'profile':
                    context.go('/profile');
                    break;
                }
              },
            )
          : null,
    );
  }
}


