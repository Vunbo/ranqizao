import 'package:flutter/material.dart';

import '../core/theme.dart';
import '../services/session_store.dart';
import 'app.dart';

class AppBootstrap extends StatefulWidget {
  const AppBootstrap({
    super.key,
    this.initializeSessionStore = SessionStore.initialize,
    this.child = const RanqiZaoApp(),
  });

  final Future<void> Function() initializeSessionStore;
  final Widget child;

  @override
  State<AppBootstrap> createState() => _AppBootstrapState();
}

class _AppBootstrapState extends State<AppBootstrap> {
  late Future<void> _bootstrapFuture;

  @override
  void initState() {
    super.initState();
    _bootstrapFuture = widget.initializeSessionStore();
  }

  void _retryBootstrap() {
    setState(() {
      _bootstrapFuture = widget.initializeSessionStore();
    });
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<void>(
      future: _bootstrapFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const _BootstrapShell(
            body: _BootstrapLoadingView(),
          );
        }

        if (snapshot.hasError) {
          return _BootstrapShell(
            body: _BootstrapErrorView(
              onRetry: _retryBootstrap,
            ),
          );
        }

        return widget.child;
      },
    );
  }
}

class _BootstrapShell extends StatelessWidget {
  const _BootstrapShell({required this.body});

  final Widget body;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ranqizao',
      theme: AppTheme.light,
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        backgroundColor: AppColors.pageBg,
        body: SafeArea(
          child: Center(child: body),
        ),
      ),
    );
  }
}

class _BootstrapLoadingView extends StatelessWidget {
  const _BootstrapLoadingView();

  @override
  Widget build(BuildContext context) {
    return const Column(
      key: Key('app-bootstrap-loading'),
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: 28,
          height: 28,
          child: CircularProgressIndicator(
            strokeWidth: 2.4,
            color: AppColors.primary,
          ),
        ),
        SizedBox(height: 16),
        Text(
          '正在准备应用...',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.slate600,
          ),
        ),
      ],
    );
  }
}

class _BootstrapErrorView extends StatelessWidget {
  const _BootstrapErrorView({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Column(
      key: const Key('app-bootstrap-error'),
      mainAxisSize: MainAxisSize.min,
      children: [
        const Text(
          '应用初始化失败',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 10),
        const Text(
          '请重试一次，如果仍然失败再继续排查。',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 12,
            height: 1.6,
            color: AppColors.textMuted,
          ),
        ),
        const SizedBox(height: 18),
        ElevatedButton(
          key: const Key('app-bootstrap-retry'),
          onPressed: onRetry,
          child: const Text('重新加载'),
        ),
      ],
    );
  }
}
