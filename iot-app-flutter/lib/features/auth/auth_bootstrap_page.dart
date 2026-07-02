import 'package:flutter/material.dart';

import '../../core/theme.dart';

class AuthBootstrapPage extends StatelessWidget {
  const AuthBootstrapPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: AppColors.pageBg,
      body: Center(
        child: Column(
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
              '正在恢复会话...',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.slate600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
