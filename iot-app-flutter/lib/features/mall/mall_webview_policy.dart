enum MallImageSelectionSource {
  camera,
  gallery,
  unsupported,
}

bool isTrustedMallWebViewUri({
  required Uri? currentUri,
  required Uri trustedMallUri,
}) {
  if (currentUri == null ||
      currentUri.scheme.toLowerCase() != 'https' ||
      trustedMallUri.scheme.toLowerCase() != 'https') {
    return false;
  }

  return currentUri.host.toLowerCase() == trustedMallUri.host.toLowerCase() &&
      currentUri.port == trustedMallUri.port;
}

MallImageSelectionSource resolveMallImageSelectionSource({
  required bool isCaptureEnabled,
  required bool isSingleSelection,
  required List<String> acceptTypes,
}) {
  if (!isSingleSelection || !_acceptsImages(acceptTypes)) {
    return MallImageSelectionSource.unsupported;
  }

  return isCaptureEnabled
      ? MallImageSelectionSource.camera
      : MallImageSelectionSource.gallery;
}

bool _acceptsImages(List<String> acceptTypes) {
  if (acceptTypes.isEmpty) {
    return false;
  }

  return acceptTypes.any((type) {
    final normalized = type.trim().toLowerCase();
    return normalized == 'image/*' || normalized.startsWith('image/');
  });
}
