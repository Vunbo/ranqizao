from pathlib import Path
p = Path(r'D:\Desktop\ranqizao\iot-app-flutter\lib\features\profile\profile_page.dart')
s = p.read_text(encoding='utf-8')
if "import 'widgets/home_management_view.dart';\n" not in s:
    s = s.replace("import 'widgets/account_management_view.dart';\n", "import 'widgets/account_management_view.dart';\nimport 'widgets/home_management_view.dart';\n", 1)
s = s.replace("      case 'homes':\n        return _PlaceholderSubview(title: '家庭管理', onBack: _closeSubView);\n", "      case 'homes':\n        return HomeManagementView(\n          onBack: _closeSubView,\n          onMessage: _showSnackBar,\n        );\n", 1)
p.write_text(s, encoding='utf-8', newline='\n')
