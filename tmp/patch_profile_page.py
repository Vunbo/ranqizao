from pathlib import Path
p = Path(r'D:\Desktop\ranqizao\iot-app-flutter\lib\features\profile\profile_page.dart')
s = p.read_text(encoding='utf-8')
s = s.replace("import 'widgets/merchant_landing_view.dart';\n", "import 'widgets/account_management_view.dart';\nimport 'widgets/merchant_landing_view.dart';\n", 1)
s = s.replace("      case 'account':\n        return _PlaceholderSubview(title: '账号管理', onBack: _closeSubView);\n", "      case 'account':\n        return AccountManagementView(\n          onBack: _closeSubView,\n          onMessage: _showSnackBar,\n        );\n", 1)
p.write_text(s, encoding='utf-8', newline='\n')
