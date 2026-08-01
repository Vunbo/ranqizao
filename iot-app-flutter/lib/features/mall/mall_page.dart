import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

import '../../core/navigation/app_back_interceptor_registry.dart';
import '../../core/runtime_config.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/app_permission_service.dart';
import 'mall_url.dart';
import 'mall_webview_policy.dart';

class MallPage extends ConsumerStatefulWidget {
  const MallPage({super.key});

  @override
  ConsumerState<MallPage> createState() => _MallPageState();
}

class _MallPageState extends ConsumerState<MallPage> {
  late final WebViewController _controller;
  late final AppBackInterceptorRegistry _backInterceptorRegistry;
  late final AppBackInterceptor _rootBackInterceptor;
  late final AppPermissionService _permissionService;
  late final ImagePicker _imagePicker;
  late final Uri _trustedMallUri;
  bool _isHandlingSystemBack = false;

  @override
  void initState() {
    super.initState();
    _backInterceptorRegistry = ref.read(appBackInterceptorRegistryProvider);
    _permissionService = ref.read(appPermissionServiceProvider);
    _imagePicker = ImagePicker();
    _rootBackInterceptor = _handleSystemBack;
    _backInterceptorRegistry.register(
      AppRootSection.mall,
      _rootBackInterceptor,
    );
    final userPhone = ref.read(authProvider).user?.phone;
    _trustedMallUri = Uri.parse(RuntimeConfig.mallH5Url);
    final mallUri = buildMallRequestUri(
      baseUrl: RuntimeConfig.mallH5Url,
      phone: userPhone,
      phoneLoginEnabled: RuntimeConfig.mallPhoneLoginEnabled,
      phoneQueryParameter: RuntimeConfig.mallPhoneQueryParameter,
    );

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white);

    unawaited(_initializeMall(mallUri));
  }

  @override
  void dispose() {
    _backInterceptorRegistry.unregister(
      AppRootSection.mall,
      _rootBackInterceptor,
    );
    super.dispose();
  }

  Future<void> _initializeMall(Uri mallUri) async {
    final platformController = _controller.platform;
    if (platformController is AndroidWebViewController) {
      await platformController.setOnShowFileSelector(_selectAndroidFile);
    }

    if (RuntimeConfig.mallPhoneLoginEnabled) {
      await _controller.clearLocalStorage();
    }
    await _controller.loadRequest(mallUri);
  }

  Future<List<String>> _selectAndroidFile(FileSelectorParams params) async {
    final currentUrl = await _controller.currentUrl();
    final currentUri = currentUrl == null ? null : Uri.tryParse(currentUrl);
    if (!isTrustedMallWebViewUri(
      currentUri: currentUri,
      trustedMallUri: _trustedMallUri,
    )) {
      return const [];
    }

    final source = resolveMallImageSelectionSource(
      isCaptureEnabled: params.isCaptureEnabled,
      isSingleSelection: params.mode == FileSelectorMode.open,
      acceptTypes: params.acceptTypes,
    );
    if (source == MallImageSelectionSource.unsupported) {
      return const [];
    }

    if (source == MallImageSelectionSource.camera) {
      final decision = await _permissionService.requestCamera();
      if (decision != AppPermissionDecision.granted) {
        _showCameraPermissionDenied(decision);
        return const [];
      }
    }

    try {
      final image = await _imagePicker.pickImage(
        source: source == MallImageSelectionSource.camera
            ? ImageSource.camera
            : ImageSource.gallery,
        preferredCameraDevice: CameraDevice.rear,
        imageQuality: 100,
      );
      if (image == null) {
        return const [];
      }
      return [Uri.file(image.path).toString()];
    } on PlatformException {
      _showMessage('无法调用摄像头或读取图片，请稍后重试');
      return const [];
    }
  }

  void _showCameraPermissionDenied(AppPermissionDecision decision) {
    if (!mounted) {
      return;
    }

    final permanentlyDenied =
        decision == AppPermissionDecision.permanentlyDenied;
    final message = switch (decision) {
      AppPermissionDecision.permanentlyDenied => '摄像头权限已关闭，请在系统设置中开启',
      AppPermissionDecision.restricted => '当前设备无法授予摄像头权限',
      _ => '未授予摄像头权限，无法使用商城扫码',
    };
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        content: Text(message),
        action: permanentlyDenied
            ? SnackBarAction(
                label: '去设置',
                onPressed: () => unawaited(_openPermissionSettings()),
              )
            : null,
      ),
    );
  }

  Future<void> _openPermissionSettings() async {
    final opened = await _permissionService.openSettings();
    if (!opened) {
      _showMessage('无法打开系统设置');
    }
  }

  void _showMessage(String message) {
    if (!mounted) {
      return;
    }
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(SnackBar(content: Text(message)));
  }

  Future<bool> _handleSystemBack() async {
    if (_isHandlingSystemBack) {
      return true;
    }

    _isHandlingSystemBack = true;
    try {
      if (await _controller.canGoBack()) {
        await _controller.goBack();
        return true;
      }
      return false;
    } finally {
      _isHandlingSystemBack = false;
    }
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
          child: const Row(
            children: [
              SizedBox(width: 60),
              Expanded(
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
              SizedBox(width: 60),
            ],
          ),
        ),
        Expanded(child: WebViewWidget(controller: _controller)),
      ],
    );
  }
}
