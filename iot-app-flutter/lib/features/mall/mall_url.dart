Uri buildMallRequestUri({
  required String baseUrl,
  required String? phone,
  required bool phoneLoginEnabled,
  required String phoneQueryParameter,
}) {
  final baseUri = Uri.parse(baseUrl);
  final parameterName = phoneQueryParameter.trim();
  if (!phoneLoginEnabled || parameterName.isEmpty) {
    return baseUri;
  }

  final normalizedPhone =
      (phone ?? '').trim().replaceAll(RegExp(r'[\s-]+'), '');
  if (!RegExp(r'^1\d{10}$').hasMatch(normalizedPhone)) {
    return baseUri;
  }

  return baseUri.replace(
    queryParameters: {
      ...baseUri.queryParameters,
      parameterName: normalizedPhone,
    },
  );
}
