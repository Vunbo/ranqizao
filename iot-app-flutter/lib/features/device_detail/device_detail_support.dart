import 'package:flutter/material.dart';

const List<int> fireLevels = [20, 40, 60, 80, 100];

class CookingMode {
  const CookingMode({
    required this.title,
    required this.desc,
    required this.icon,
    required this.color,
    required this.background,
    required this.level,
  });

  final String title;
  final String desc;
  final String icon;
  final Color color;
  final Color background;
  final int level;
}

const List<CookingMode> cookingModes = [
  CookingMode(
    title: '爆炒模式',
    desc: '大火快炒，适合锁住食材鲜香',
    icon: 'flame',
    color: Color(0xFFF97316),
    background: Color(0xFFFFF7ED),
    level: 100,
  ),
  CookingMode(
    title: '文火慢炖',
    desc: '恒温细煮，适合长时间炖煮',
    icon: 'thermometer',
    color: Color(0xFF3B82F6),
    background: Color(0xFFEFF6FF),
    level: 20,
  ),
  CookingMode(
    title: '蒸煮模式',
    desc: '中高火稳定输出，适合蒸煮类菜肴',
    icon: 'droplet',
    color: Color(0xFF06B6D4),
    background: Color(0xFFECFEFF),
    level: 60,
  ),
  CookingMode(
    title: '一键煎炒',
    desc: '精准控温，减少焦糊风险',
    icon: 'activity',
    color: Color(0xFFF59E0B),
    background: Color(0xFFFFFBEB),
    level: 80,
  ),
];

Color resolveFlameColor(bool isOn, int fireLevel) {
  if (!isOn) {
    return const Color(0xFF334155);
  }

  if (fireLevel <= 30) {
    return const Color(0xFF60A5FA);
  }

  if (fireLevel <= 60) {
    return const Color(0xFFFB923C);
  }

  return const Color(0xFFF43F5E);
}

Color resolveGlowColor(int fireLevel) {
  if (fireLevel <= 30) {
    return const Color(0xFF3B82F6);
  }

  if (fireLevel <= 60) {
    return const Color(0xFFF97316);
  }

  return const Color(0xFFF43F5E);
}

double buildFlameScale(bool isOn, int fireLevel) {
  final level = fireLevel.clamp(0, 100).toDouble();
  return isOn ? 0.8 + (level / 100) * 0.7 : 0.8;
}
