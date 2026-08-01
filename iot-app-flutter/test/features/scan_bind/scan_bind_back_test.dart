import 'package:flutter_test/flutter_test.dart';
import 'package:iot_app_flutter/features/scan_bind/scan_bind_provider.dart';

void main() {
  test('scan binding steps resolve to the correct previous step', () {
    expect(previousScanBindStep(ScanBindStep.scan), isNull);
    expect(
      previousScanBindStep(ScanBindStep.location),
      ScanBindStep.scan,
    );
    expect(
      previousScanBindStep(ScanBindStep.wifi),
      ScanBindStep.location,
    );
    expect(
      previousScanBindStep(ScanBindStep.configuring),
      ScanBindStep.wifi,
    );
    expect(
      previousScanBindStep(ScanBindStep.naming),
      ScanBindStep.wifi,
    );
    expect(previousScanBindStep(ScanBindStep.success), isNull);
  });
}
