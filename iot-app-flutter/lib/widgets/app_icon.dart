import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../core/theme.dart';

class AppIcon extends StatefulWidget {
  const AppIcon({
    super.key,
    this.name = 'info',
    this.size = 16,
    this.color = AppColors.textPrimary,
    this.animated = false,
    this.filled = false,
    this.strokeWidth = 2,
  });

  final String name;
  final double size;
  final Color color;
  final bool animated;
  final bool filled;
  final double strokeWidth;

  @override
  State<AppIcon> createState() => _AppIconState();
}

class _AppIconState extends State<AppIcon> with SingleTickerProviderStateMixin {
  late String _currentSrc;
  AnimationController? _spinController;
  Animation<double>? _spinAnimation;

  @override
  void initState() {
    super.initState();
    _buildSrc();
    if (widget.animated) {
      _spinController = AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 900),
      )..repeat();
      _spinAnimation = Tween<double>(begin: 0, end: 1).animate(_spinController!);
    }
  }

  @override
  void didUpdateWidget(covariant AppIcon oldWidget) {
    super.didUpdateWidget(oldWidget);
    _buildSrc();
  }

  void _buildSrc() {
    _currentSrc = buildIconAssetPath(
      name: widget.name,
      color: widget.color,
      filled: widget.filled,
      strokeWidth: widget.strokeWidth,
    );
  }

  @override
  void dispose() {
    _spinController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    Widget icon = SvgPicture.asset(
      _currentSrc,
      width: widget.size,
      height: widget.size,
      fit: BoxFit.contain,
      placeholderBuilder: (_) => SizedBox(width: widget.size, height: widget.size),
    );

    if (widget.animated && _spinAnimation != null) {
      icon = RotationTransition(turns: _spinAnimation!, child: icon);
    }

    return SizedBox(width: widget.size, height: widget.size, child: icon);
  }
}

@visibleForTesting
String buildIconAssetPath({
  required String name,
  required Color color,
  required bool filled,
  required double strokeWidth,
}) {
  final colorKey = color.toARGB32().toRadixString(16).padLeft(8, '0');
  final colorStr = colorKey.substring(2);
  final fillKey = filled ? 1 : 0;
  final strokeKey = strokeWidth == strokeWidth.truncateToDouble()
      ? strokeWidth.toStringAsFixed(0)
      : strokeWidth.toStringAsFixed(1).replaceAll('.', '_');

  return 'assets/icons/$name-$colorStr-f$fillKey-s$strokeKey.svg';
}
