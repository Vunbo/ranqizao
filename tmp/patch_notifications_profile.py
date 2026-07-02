from pathlib import Path
p = Path(r'D:\Desktop\ranqizao\iot-app-flutter\lib\features\profile\profile_page.dart')
s = p.read_text(encoding='utf-8')
if "import 'widgets/notification_settings_view.dart';\n" not in s:
    s = s.replace("import 'widgets/merchant_panel_view.dart';\n", "import 'widgets/merchant_panel_view.dart';\nimport 'widgets/notification_settings_view.dart';\n", 1)
s = s.replace("      case 'notifications':\n        return _PlaceholderSubview(title: '消息通知', onBack: _closeSubView);\n", "      case 'notifications':\n        return NotificationSettingsView(onBack: _closeSubView);\n", 1)
p.write_text(s, encoding='utf-8', newline='\n')
