class BindingLocationPayload {
  const BindingLocationPayload({
    this.latitude,
    this.longitude,
    this.address = '',
    this.formattedAddress = '',
    this.name = '',
    this.poiName = '',
    this.country = '',
    this.province = '',
    this.city = '',
    this.district = '',
    this.street = '',
    this.streetNum = '',
    this.coordType = '',
    this.source = '',
    this.capturedAt = '',
  });

  final double? latitude;
  final double? longitude;
  final String address;
  final String formattedAddress;
  final String name;
  final String poiName;
  final String country;
  final String province;
  final String city;
  final String district;
  final String street;
  final String streetNum;
  final String coordType;
  final String source;
  final String capturedAt;

  Map<String, dynamic> toJson() {
    return {
      'latitude': latitude,
      'longitude': longitude,
      'address': address,
      'formattedAddress': formattedAddress,
      'name': name,
      'poiName': poiName,
      'country': country,
      'province': province,
      'city': city,
      'district': district,
      'street': street,
      'streetNum': streetNum,
      'coordType': coordType,
      'source': source,
      'capturedAt': capturedAt,
    };
  }
}

enum DeviceBindingPermissionType {
  camera,
  location,
}

class DeviceBindingPermissionException implements Exception {
  const DeviceBindingPermissionException({
    required this.type,
    required this.message,
  });

  final DeviceBindingPermissionType type;
  final String message;

  @override
  String toString() => message;
}
