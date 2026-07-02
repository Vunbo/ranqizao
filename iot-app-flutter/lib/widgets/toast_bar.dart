import 'dart:async';
import 'package:flutter/material.dart';
import '../core/theme.dart';

/// Matches uni-app ToastBar.vue — auto-dismissing top toast
class ToastBar extends StatefulWidget {
  final String message;
  final String type; // 'success' | 'error' | 'info'
  final VoidCallback? onClose;

  const ToastBar({
    super.key,
    required this.message,
    this.type = 'info',
    this.onClose,
  });

  @override
  State<ToastBar> createState() => _ToastBarState();
}

class _ToastBarState extends State<ToastBar> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<Offset> _slideAnim;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, -1),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));
    _controller.forward();
    _timer = Timer(const Duration(seconds: 3), _dismiss);
  }

  void _dismiss() {
    _controller.reverse().then((_) {
      widget.onClose?.call();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _timer?.cancel();
    super.dispose();
  }

  Color get _bgColor {
    switch (widget.type) {
      case 'success':
        return AppColors.success;
      case 'error':
        return AppColors.danger;
      default:
        return AppColors.slate800;
    }
  }

  @override
  Widget build(BuildContext context) {
    return SlideTransition(
      position: _slideAnim,
      child: Container(
        margin: const EdgeInsets.fromLTRB(20, 52, 20, 0),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: _bgColor,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Icon(
              widget.type == 'success'
                  ? Icons.check_circle
                  : widget.type == 'error'
                      ? Icons.error
                      : Icons.info,
              color: Colors.white,
              size: 18,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                widget.message,
                style: const TextStyle(color: Colors.white, fontSize: 14),
              ),
            ),
            GestureDetector(
              onTap: _dismiss,
              child: const Icon(Icons.close, color: Colors.white70, size: 16),
            ),
          ],
        ),
      ),
    );
  }
}
