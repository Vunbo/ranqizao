import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import 'widgets/account_management_view.dart';
import 'widgets/device_management_view.dart';
import 'widgets/home_management_view.dart';
import 'widgets/merchant_landing_view.dart';
import 'widgets/merchant_panel_view.dart';
import 'widgets/notification_settings_view.dart';
import 'widgets/profile_subview_scaffold.dart';
import 'widgets/sharing_management_view.dart';

class ProfileSectionPage extends StatelessWidget {
  const ProfileSectionPage({
    super.key,
    required this.section,
  });

  final String section;

  @override
  Widget build(BuildContext context) {
    void goBack() {
      if (context.canPop()) {
        context.pop();
      } else {
        context.go('/profile');
      }
    }

    void showMessage(String message, {required bool isError}) {
      final messenger = ScaffoldMessenger.of(context);
      messenger.hideCurrentSnackBar();
      messenger.showSnackBar(
        SnackBar(
          content: Text(message),
          behavior: SnackBarBehavior.floating,
          backgroundColor: isError ? AppColors.danger : AppColors.success,
        ),
      );
    }

    final content = switch (section) {
      'merchant' => MerchantLandingView(
          onBack: goBack,
          onMessage: showMessage,
        ),
      'merchant-panel' => MerchantPanelView(
          onBack: goBack,
          onMessage: showMessage,
        ),
      'account' => AccountManagementView(
          onBack: goBack,
          onMessage: showMessage,
        ),
      'devices' => DeviceManagementView(
          onBack: goBack,
          onMessage: showMessage,
        ),
      'homes' => HomeManagementView(
          onBack: goBack,
          onMessage: showMessage,
        ),
      'sharing' => SharingManagementView(
          onBack: goBack,
          onMessage: showMessage,
        ),
      'notifications' => NotificationSettingsView(onBack: goBack),
      _ => ProfileSubviewScaffold(
          title: '页面不存在',
          onBack: goBack,
          child: const Center(child: Text('请返回上一页')),
        ),
    };

    return Scaffold(
      backgroundColor: AppColors.pageBg,
      body: content,
    );
  }
}
