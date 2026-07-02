import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../core/runtime_config.dart';
import '../../core/theme.dart';

class MallPage extends StatefulWidget {
  const MallPage({super.key});

  @override
  State<MallPage> createState() => _MallPageState();
}

class _MallPageState extends State<MallPage> {
  late final WebViewController _controller;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..loadRequest(Uri.parse(RuntimeConfig.mallH5Url));
  }

  @override
  Widget build(BuildContext context) {
    final statusBarHeight = MediaQuery.of(context).padding.top;
    const navBarContentHeight = 44.0;
    final navBarHeight = statusBarHeight + navBarContentHeight;

    return Column(
      children: [
        Container(
          height: navBarHeight,
          padding: EdgeInsets.only(
            top: statusBarHeight,
            left: 16,
            right: 16,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(bottom: BorderSide(color: AppColors.cardBorder)),
          ),
          child: Row(
            children: [
              GestureDetector(
                onTap: () => context.go('/'),
                child: const Row(
                  children: [
                    Text(
                      '←',
                      style: TextStyle(
                        fontSize: 20,
                        height: 1,
                        color: AppColors.primary,
                      ),
                    ),
                    SizedBox(width: 4),
                    Text(
                      '首页',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ),
              const Expanded(
                child: Center(
                  child: Text(
                    '商城',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                      color: AppColors.slate800,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 60),
            ],
          ),
        ),
        Expanded(child: WebViewWidget(controller: _controller)),
      ],
    );
  }
}
