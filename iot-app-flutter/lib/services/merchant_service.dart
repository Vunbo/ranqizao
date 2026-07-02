import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/constants.dart';
import '../models/merchant.dart';
import 'api_client.dart';

class MerchantService {
  const MerchantService(this._api);

  final ApiClient _api;

  Future<MerchantSummary> getSummary() async {
    final res = await _api.get(
      ApiConstants.merchantSummary,
      query: _buildNoCacheQuery(),
    );
    return MerchantSummary.fromJson(readResponseMap(res.data));
  }

  Future<MerchantPage?> getPage() async {
    final res = await _api.get(
      ApiConstants.merchantPage,
      query: _buildNoCacheQuery(),
    );
    final data = readResponseMap(res.data);
    final pageMap = readResponseMap(data['page']);

    if (pageMap.isEmpty) {
      return null;
    }

    return MerchantPage.fromJson(pageMap);
  }

  Future<MerchantApplicationSummary?> submitApplication({
    required String levelCode,
    required String merchantName,
    required String contactName,
    required String contactPhone,
    required String region,
    required String address,
    String? note,
  }) async {
    final res = await _api.post(
      ApiConstants.merchantApplications,
      data: {
        'levelCode': levelCode,
        'merchantName': merchantName,
        'contactName': contactName,
        'contactPhone': contactPhone,
        'region': region,
        'address': address,
        'note': note,
      },
    );

    final data = readResponseMap(res.data);
    final applicationMap = readResponseMap(data['application']);
    if (applicationMap.isEmpty) {
      return null;
    }

    return MerchantApplicationSummary.fromJson(applicationMap);
  }

  Future<MerchantPanel> getPanel() async {
    final res = await _api.get(
      ApiConstants.merchantPanel,
      query: _buildNoCacheQuery(),
    );
    return MerchantPanel.fromJson(readResponseMap(res.data));
  }
}

final merchantServiceProvider = Provider<MerchantService>((ref) {
  return MerchantService(ref.watch(apiClientProvider));
});

Map<String, dynamic> _buildNoCacheQuery() {
  return {
    '_t': DateTime.now().millisecondsSinceEpoch.toString(),
  };
}
