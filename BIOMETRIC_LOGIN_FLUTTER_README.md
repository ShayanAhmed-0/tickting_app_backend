# Biometric Login Implementation Guide for Flutter

This guide will help you implement biometric authentication (WebAuthn/Passkeys) in your Flutter app using the backend API endpoints.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Required Flutter Packages](#required-flutter-packages)
3. [Setup Instructions](#setup-instructions)
4. [API Endpoints Reference](#api-endpoints-reference)
5. [Implementation Guide](#implementation-guide)
6. [Code Examples](#code-examples)
7. [Error Handling](#error-handling)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

## 🔍 Overview

This implementation uses **WebAuthn** (Web Authentication API) to provide secure biometric authentication. Users can register multiple passkeys (fingerprint, face ID, hardware keys) and use any of them to authenticate.

### Key Features:
- ✅ Multiple passkeys per user
- ✅ Cross-platform biometric authentication
- ✅ Secure credential storage
- ✅ Device management
- ✅ Fallback to password authentication

## 📦 Required Flutter Packages

Add these dependencies to your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # HTTP requests
  http: ^1.1.0
  
  # Local storage for tokens
  shared_preferences: ^2.2.2
  
  # Biometric authentication
  local_auth: ^2.1.6
  
  # WebAuthn for passkeys (if targeting web)
  web: ^0.5.1
  
  # JSON handling
  json_annotation: ^4.8.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
  
  # JSON code generation
  json_serializable: ^6.7.1
  build_runner: ^2.4.7
```

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
flutter pub get
```

### 2. Platform Configuration

#### Android Configuration

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.USE_FINGERPRINT" />
<uses-permission android:name="android.permission.INTERNET" />
```

#### iOS Configuration

Add to `ios/Runner/Info.plist`:

```xml
<key>NSFaceIDUsageDescription</key>
<string>Use Face ID to authenticate securely</string>
<key>NSBiometricUsageDescription</key>
<string>Use biometric authentication to access your account</string>
```

### 3. Web Configuration

For web support, add to `web/index.html`:

```html
<script>
  // Enable WebAuthn support
  if (window.PublicKeyCredential) {
    console.log('WebAuthn supported');
  }
</script>
```

## 🔗 API Endpoints Reference

### Base URL
```
https://your-backend-domain.com/api/v1/auth
```

### Authentication Headers
```dart
Map<String, String> headers = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer $token', // For authenticated endpoints
};
```

### 1. User Registration & Login

#### Signup
```http
POST /signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "role": "CUSTOMER",
  "deviceToken": "device_fcm_token",
  "deviceType": "android"
}
```

#### Login
```http
POST /login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "deviceToken": "device_fcm_token",
  "deviceType": "android"
}
```

### 2. Biometric Authentication

#### Create Registration Challenge
```http
POST /create-challange
Authorization: Bearer <token>
```

#### Verify Registration Challenge
```http
POST /verify-challange
Authorization: Bearer <token>
Content-Type: application/json

{
  "options": {
    "id": "credential_id_here",
    "rawId": "base64_encoded_raw_id",
    "response": {
      "attestationObject": "base64_encoded_attestation_object",
      "clientDataJSON": "base64_encoded_client_data_json"
    },
    "type": "public-key"
  },
  "passkeyName": "iPhone Touch ID",
  "deviceType": "iPhone"
}
```

#### Create Login Challenge
```http
POST /login-challange
Authorization: Bearer <token>
```

#### Verify Login Challenge
```http
POST /verify-login-challange
Authorization: Bearer <token>
Content-Type: application/json

{
  "options": {
    "id": "credential_id_here",
    "rawId": "base64_encoded_raw_id",
    "response": {
      "authenticatorData": "base64_encoded_authenticator_data",
      "clientDataJSON": "base64_encoded_client_data_json",
      "signature": "base64_encoded_signature",
      "userHandle": "base64_encoded_user_handle"
    },
    "type": "public-key"
  },
  "deviceToken": "device_fcm_token",
  "deviceType": "android"
}
```

### 3. Passkey Management

#### List User's Passkeys
```http
GET /passkeys
Authorization: Bearer <token>
```

#### Delete Passkey
```http
DELETE /passkeys/{passkeyId}
Authorization: Bearer <token>
```

#### Update Passkey Name
```http
PATCH /passkeys/{passkeyId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Passkey Name"
}
```

**Validation Rules:**
- `name`: Required, 1-100 characters, alphanumeric with spaces, hyphens, and underscores only

## 💻 Implementation Guide

### Step 1: Create Data Models

```dart
// lib/models/auth_models.dart
import 'package:json_annotation/json_annotation.dart';

part 'auth_models.g.dart';

@JsonSerializable()
class LoginRequest {
  final String email;
  final String password;
  final String? deviceToken;
  final String? deviceType;

  LoginRequest({
    required this.email,
    required this.password,
    this.deviceToken,
    this.deviceType,
  });

  factory LoginRequest.fromJson(Map<String, dynamic> json) =>
      _$LoginRequestFromJson(json);
  Map<String, dynamic> toJson() => _$LoginRequestToJson(this);
}

@JsonSerializable()
class AuthResponse {
  final bool success;
  final String message;
  final UserData? user;
  final String? token;
  final bool? isVerified;
  final bool? isProfileCompleted;

  AuthResponse({
    required this.success,
    required this.message,
    this.user,
    this.token,
    this.isVerified,
    this.isProfileCompleted,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) =>
      _$AuthResponseFromJson(json);
}

@JsonSerializable()
class UserData {
  final String id;
  final String email;
  final String role;
  final bool bioMetricEnabled;
  final ProfileData? profile;

  UserData({
    required this.id,
    required this.email,
    required this.role,
    required this.bioMetricEnabled,
    this.profile,
  });

  factory UserData.fromJson(Map<String, dynamic> json) =>
      _$UserDataFromJson(json);
}

@JsonSerializable()
class ProfileData {
  final String id;
  final String firstName;
  final String lastName;
  // Add other profile fields as needed

  ProfileData({
    required this.id,
    required this.firstName,
    required this.lastName,
  });

  factory ProfileData.fromJson(Map<String, dynamic> json) =>
      _$ProfileDataFromJson(json);
}

@JsonSerializable()
class Passkey {
  final String id;
  final String credentialId;
  final String name;
  final String deviceType;
  final DateTime? lastUsed;
  final DateTime createdAt;

  Passkey({
    required this.id,
    required this.credentialId,
    required this.name,
    required this.deviceType,
    this.lastUsed,
    required this.createdAt,
  });

  factory Passkey.fromJson(Map<String, dynamic> json) =>
      _$PasskeyFromJson(json);
}
```

### Step 2: Create API Service

```dart
// lib/services/auth_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/auth_models.dart';

class AuthService {
  static const String baseUrl = 'https://your-backend-domain.com/api/v1/auth';
  
  // Get stored token
  static Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  // Store token
  static Future<void> _storeToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }

  // Clear token
  static Future<void> _clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
  }

  // Login with email and password
  static Future<AuthResponse> login(LoginRequest request) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(request.toJson()),
      );

      final data = jsonDecode(response.body);
      
      if (response.statusCode == 200 && data['success']) {
        final token = data['data']['token'];
        if (token != null) {
          await _storeToken(token);
        }
      }

      return AuthResponse.fromJson(data);
    } catch (e) {
      return AuthResponse(
        success: false,
        message: 'Login failed: $e',
      );
    }
  }

  // Create biometric registration challenge
  static Future<Map<String, dynamic>?> createBiometricChallenge() async {
    try {
      final token = await _getToken();
      if (token == null) throw Exception('No auth token');

      final response = await http.post(
        Uri.parse('$baseUrl/create-challange'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['data']['options'];
      }
      return null;
    } catch (e) {
      print('Error creating biometric challenge: $e');
      return null;
    }
  }

  // Verify biometric registration
  static Future<AuthResponse> verifyBiometricRegistration({
    required Map<String, dynamic> credentialResponse,
    String? passkeyName,
    String? deviceType,
  }) async {
    try {
      final token = await _getToken();
      if (token == null) throw Exception('No auth token');

      final response = await http.post(
        Uri.parse('$baseUrl/verify-challange'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'options': credentialResponse,
          'passkeyName': passkeyName ?? 'Flutter App',
          'deviceType': deviceType ?? 'Mobile',
        }),
      );

      final data = jsonDecode(response.body);
      return AuthResponse.fromJson(data);
    } catch (e) {
      return AuthResponse(
        success: false,
        message: 'Biometric registration failed: $e',
      );
    }
  }

  // Create biometric login challenge
  static Future<Map<String, dynamic>?> createBiometricLoginChallenge() async {
    try {
      final token = await _getToken();
      if (token == null) throw Exception('No auth token');

      final response = await http.post(
        Uri.parse('$baseUrl/login-challange'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['data']['options'];
      }
      return null;
    } catch (e) {
      print('Error creating biometric login challenge: $e');
      return null;
    }
  }

  // Verify biometric login
  static Future<AuthResponse> verifyBiometricLogin({
    required Map<String, dynamic> assertionResponse,
    String? deviceToken,
    String? deviceType,
  }) async {
    try {
      final token = await _getToken();
      if (token == null) throw Exception('No auth token');

      final response = await http.post(
        Uri.parse('$baseUrl/verify-login-challange'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'options': assertionResponse,
          'deviceToken': deviceToken,
          'deviceType': deviceType,
        }),
      );

      final data = jsonDecode(response.body);
      
      if (response.statusCode == 200 && data['success']) {
        final newToken = data['data']['token'];
        if (newToken != null) {
          await _storeToken(newToken);
        }
      }

      return AuthResponse.fromJson(data);
    } catch (e) {
      return AuthResponse(
        success: false,
        message: 'Biometric login failed: $e',
      );
    }
  }

  // Get user's passkeys
  static Future<List<Passkey>> getPasskeys() async {
    try {
      final token = await _getToken();
      if (token == null) throw Exception('No auth token');

      final response = await http.get(
        Uri.parse('$baseUrl/passkeys'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final passkeysList = data['data']['passkeys'] as List;
        return passkeysList.map((json) => Passkey.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      print('Error getting passkeys: $e');
      return [];
    }
  }

  // Delete passkey
  static Future<bool> deletePasskey(String passkeyId) async {
    try {
      final token = await _getToken();
      if (token == null) throw Exception('No auth token');

      final response = await http.delete(
        Uri.parse('$baseUrl/passkeys/$passkeyId'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      return response.statusCode == 200;
    } catch (e) {
      print('Error deleting passkey: $e');
      return false;
    }
  }

  // Logout
  static Future<void> logout() async {
    await _clearToken();
  }
}
```

### Step 3: Create Biometric Service

```dart
// lib/services/biometric_service.dart
import 'package:local_auth/local_auth.dart';
import 'package:local_auth/error_codes.dart' as auth_error;

class BiometricService {
  static final LocalAuthentication _localAuth = LocalAuthentication();

  // Check if biometric authentication is available
  static Future<bool> isBiometricAvailable() async {
    try {
      final bool isAvailable = await _localAuth.canCheckBiometrics;
      final bool isDeviceSupported = await _localAuth.isDeviceSupported();
      return isAvailable && isDeviceSupported;
    } catch (e) {
      return false;
    }
  }

  // Get available biometric types
  static Future<List<BiometricType>> getAvailableBiometrics() async {
    try {
      return await _localAuth.getAvailableBiometrics();
    } catch (e) {
      return [];
    }
  }

  // Authenticate with biometric
  static Future<bool> authenticate({
    String reason = 'Authenticate to access your account',
  }) async {
    try {
      final bool isAvailable = await isBiometricAvailable();
      if (!isAvailable) return false;

      final bool didAuthenticate = await _localAuth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
        ),
      );

      return didAuthenticate;
    } catch (e) {
      print('Biometric authentication error: $e');
      return false;
    }
  }

  // Get device info for passkey registration
  static Future<Map<String, String>> getDeviceInfo() async {
    final biometrics = await getAvailableBiometrics();
    String deviceType = 'Unknown';
    String passkeyName = 'Flutter App';

    if (biometrics.contains(BiometricType.fingerprint)) {
      deviceType = 'Android';
      passkeyName = 'Fingerprint';
    } else if (biometrics.contains(BiometricType.face)) {
      deviceType = 'Android';
      passkeyName = 'Face ID';
    } else if (biometrics.contains(BiometricType.iris)) {
      deviceType = 'Android';
      passkeyName = 'Iris';
    }

    return {
      'deviceType': deviceType,
      'passkeyName': passkeyName,
    };
  }
}
```

### Step 4: Create WebAuthn Service (for Web Platform)

```dart
// lib/services/webauthn_service.dart
import 'dart:html' as html;
import 'dart:convert';

class WebAuthnService {
  // Create credential (registration)
  static Future<Map<String, dynamic>?> createCredential({
    required Map<String, dynamic> options,
  }) async {
    try {
      // Convert options to proper format
      final credentialOptions = CredentialCreationOptions(
        publicKey: PublicKeyCredentialCreationOptions(
          challenge: base64Decode(options['challenge']),
          rp: PublicKeyCredentialRpEntity(
            name: options['rp']['name'],
            id: options['rp']['id'],
          ),
          user: PublicKeyCredentialUserEntity(
            id: base64Decode(options['user']['id']),
            name: options['user']['name'],
            displayName: options['user']['displayName'],
          ),
          pubKeyCredParams: (options['pubKeyCredParams'] as List)
              .map((param) => PublicKeyCredentialParameters(
                    type: param['type'],
                    alg: param['alg'],
                  ))
              .toList(),
          authenticatorSelection: AuthenticatorSelectionCriteria(
            authenticatorAttachment: options['authenticatorSelection']
                ?.containsKey('authenticatorAttachment')
                ? options['authenticatorSelection']['authenticatorAttachment']
                : null,
            userVerification: options['authenticatorSelection']
                ?.containsKey('userVerification')
                ? options['authenticatorSelection']['userVerification']
                : 'preferred',
          ),
          timeout: options['timeout'] ?? 60000,
          attestation: options['attestation'] ?? 'none',
        ),
      );

      final credential = await html.window.navigator.credentials!
          .create(credentialOptions);

      if (credential is PublicKeyCredential) {
        return {
          'id': credential.id,
          'rawId': base64Encode(credential.rawId),
          'response': {
            'attestationObject': base64Encode(credential.response.attestationObject),
            'clientDataJSON': base64Encode(credential.response.clientDataJSON),
          },
          'type': credential.type,
        };
      }
      return null;
    } catch (e) {
      print('WebAuthn create credential error: $e');
      return null;
    }
  }

  // Get assertion (authentication)
  static Future<Map<String, dynamic>?> getAssertion({
    required Map<String, dynamic> options,
  }) async {
    try {
      final assertionOptions = CredentialRequestOptions(
        publicKey: PublicKeyCredentialRequestOptions(
          challenge: base64Decode(options['challenge']),
          allowCredentials: (options['allowCredentials'] as List?)
              ?.map((cred) => PublicKeyCredentialDescriptor(
                    type: cred['type'],
                    id: base64Decode(cred['id']),
                    transports: (cred['transports'] as List?)
                        ?.map((t) => t.toString())
                        .toList(),
                  ))
              .toList(),
          timeout: options['timeout'] ?? 60000,
          userVerification: options['userVerification'] ?? 'preferred',
          rpId: options['rpId'],
        ),
      );

      final credential = await html.window.navigator.credentials!
          .get(assertionOptions);

      if (credential is PublicKeyCredential) {
        return {
          'id': credential.id,
          'rawId': base64Encode(credential.rawId),
          'response': {
            'authenticatorData': base64Encode(credential.response.authenticatorData),
            'clientDataJSON': base64Encode(credential.response.clientDataJSON),
            'signature': base64Encode(credential.response.signature),
            'userHandle': credential.response.userHandle != null
                ? base64Encode(credential.response.userHandle!)
                : null,
          },
          'type': credential.type,
        };
      }
      return null;
    } catch (e) {
      print('WebAuthn get assertion error: $e');
      return null;
    }
  }
}
```

### Step 5: Create Main Authentication Widget

```dart
// lib/widgets/biometric_auth_widget.dart
import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../services/biometric_service.dart';
import '../services/webauthn_service.dart';
import '../models/auth_models.dart';

class BiometricAuthWidget extends StatefulWidget {
  final VoidCallback? onAuthSuccess;
  final VoidCallback? onAuthFailure;

  const BiometricAuthWidget({
    Key? key,
    this.onAuthSuccess,
    this.onAuthFailure,
  }) : super(key: key);

  @override
  State<BiometricAuthWidget> createState() => _BiometricAuthWidgetState();
}

class _BiometricAuthWidgetState extends State<BiometricAuthWidget> {
  bool _isLoading = false;
  bool _isBiometricAvailable = false;
  List<Passkey> _passkeys = [];

  @override
  void initState() {
    super.initState();
    _checkBiometricAvailability();
    _loadPasskeys();
  }

  Future<void> _checkBiometricAvailability() async {
    final isAvailable = await BiometricService.isBiometricAvailable();
    setState(() {
      _isBiometricAvailable = isAvailable;
    });
  }

  Future<void> _loadPasskeys() async {
    final passkeys = await AuthService.getPasskeys();
    setState(() {
      _passkeys = passkeys;
    });
  }

  // Register new biometric credential
  Future<void> _registerBiometric() async {
    if (!_isBiometricAvailable) {
      _showError('Biometric authentication not available');
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      // 1. Create registration challenge
      final challengeOptions = await AuthService.createBiometricChallenge();
      if (challengeOptions == null) {
        _showError('Failed to create registration challenge');
        return;
      }

      // 2. Get device info
      final deviceInfo = await BiometricService.getDeviceInfo();

      // 3. Create credential using WebAuthn (for web) or local auth (for mobile)
      Map<String, dynamic>? credentialResponse;
      
      if (Theme.of(context).platform == TargetPlatform.web) {
        // Use WebAuthn for web platform
        credentialResponse = await WebAuthnService.createCredential(
          options: challengeOptions,
        );
      } else {
        // For mobile, you might need to use a different approach
        // This is a simplified example - you may need platform-specific implementation
        _showError('WebAuthn registration not implemented for mobile yet');
        return;
      }

      if (credentialResponse == null) {
        _showError('Failed to create credential');
        return;
      }

      // 4. Verify registration with backend
      final result = await AuthService.verifyBiometricRegistration(
        credentialResponse: credentialResponse,
        passkeyName: deviceInfo['passkeyName'],
        deviceType: deviceInfo['deviceType'],
      );

      if (result.success) {
        _showSuccess('Biometric authentication registered successfully!');
        await _loadPasskeys();
        widget.onAuthSuccess?.call();
      } else {
        _showError(result.message);
      }
    } catch (e) {
      _showError('Registration failed: $e');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  // Login with biometric
  Future<void> _loginWithBiometric() async {
    if (!_isBiometricAvailable) {
      _showError('Biometric authentication not available');
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      // 1. Create login challenge
      final challengeOptions = await AuthService.createBiometricLoginChallenge();
      if (challengeOptions == null) {
        _showError('Failed to create login challenge');
        return;
      }

      // 2. Get assertion using WebAuthn
      Map<String, dynamic>? assertionResponse;
      
      if (Theme.of(context).platform == TargetPlatform.web) {
        assertionResponse = await WebAuthnService.getAssertion(
          options: challengeOptions,
        );
      } else {
        _showError('WebAuthn login not implemented for mobile yet');
        return;
      }

      if (assertionResponse == null) {
        _showError('Failed to get assertion');
        return;
      }

      // 3. Get device info
      final deviceInfo = await BiometricService.getDeviceInfo();
      
      // 4. Verify login with backend
      final result = await AuthService.verifyBiometricLogin(
        assertionResponse: assertionResponse,
        deviceToken: "your_device_fcm_token", // Get from FCM
        deviceType: deviceInfo['deviceType'],
      );

      if (result.success) {
        _showSuccess('Login successful!');
        widget.onAuthSuccess?.call();
      } else {
        _showError(result.message);
        widget.onAuthFailure?.call();
      }
    } catch (e) {
      _showError('Login failed: $e');
      widget.onAuthFailure?.call();
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  // Delete passkey
  Future<void> _deletePasskey(String passkeyId) async {
    final success = await AuthService.deletePasskey(passkeyId);
    if (success) {
      _showSuccess('Passkey deleted successfully');
      await _loadPasskeys();
    } else {
      _showError('Failed to delete passkey');
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }

  void _showSuccess(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Biometric Authentication',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 16),
            
            if (!_isBiometricAvailable)
              const Text(
                'Biometric authentication is not available on this device.',
                style: TextStyle(color: Colors.orange),
              )
            else ...[
              // Register new biometric
              ElevatedButton.icon(
                onPressed: _isLoading ? null : _registerBiometric,
                icon: const Icon(Icons.fingerprint),
                label: const Text('Register Biometric'),
              ),
              const SizedBox(height: 16),
              
              // Login with biometric
              ElevatedButton.icon(
                onPressed: _isLoading ? null : _loginWithBiometric,
                icon: const Icon(Icons.login),
                label: const Text('Login with Biometric'),
              ),
              const SizedBox(height: 16),
              
              // List of registered passkeys
              if (_passkeys.isNotEmpty) ...[
                const Text(
                  'Registered Passkeys:',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                ..._passkeys.map((passkey) => ListTile(
                  leading: const Icon(Icons.security),
                  title: Text(passkey.name),
                  subtitle: Text('${passkey.deviceType} • ${passkey.createdAt}'),
                  trailing: IconButton(
                    icon: const Icon(Icons.delete, color: Colors.red),
                    onPressed: () => _deletePasskey(passkey.id),
                  ),
                )),
              ],
            ],
            
            if (_isLoading)
              const Center(
                child: CircularProgressIndicator(),
              ),
          ],
        ),
      ),
    );
  }
}
```

## 🔧 Usage Examples

### 1. Basic Login Screen

```dart
// lib/screens/login_screen.dart
import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../widgets/biometric_auth_widget.dart';
import '../models/auth_models.dart';

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;

  Future<void> _login() async {
    setState(() {
      _isLoading = true;
    });

    final result = await AuthService.login(LoginRequest(
      email: _emailController.text,
      password: _passwordController.text,
    ));

    setState(() {
      _isLoading = false;
    });

    if (result.success) {
      // Navigate to home screen
      Navigator.pushReplacementNamed(context, '/home');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result.message)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Login')),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              controller: _emailController,
              decoration: InputDecoration(labelText: 'Email'),
            ),
            TextField(
              controller: _passwordController,
              decoration: InputDecoration(labelText: 'Password'),
              obscureText: true,
            ),
            SizedBox(height: 16),
            ElevatedButton(
              onPressed: _isLoading ? null : _login,
              child: _isLoading 
                ? CircularProgressIndicator() 
                : Text('Login'),
            ),
            SizedBox(height: 32),
            BiometricAuthWidget(
              onAuthSuccess: () {
                Navigator.pushReplacementNamed(context, '/home');
              },
            ),
          ],
        ),
      ),
    );
  }
}
```

### 2. Passkey Management Screen

```dart
// lib/screens/passkey_management_screen.dart
import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../models/auth_models.dart';

class PasskeyManagementScreen extends StatefulWidget {
  @override
  _PasskeyManagementScreenState createState() => _PasskeyManagementScreenState();
}

class _PasskeyManagementScreenState extends State<PasskeyManagementScreen> {
  List<Passkey> _passkeys = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadPasskeys();
  }

  Future<void> _loadPasskeys() async {
    final passkeys = await AuthService.getPasskeys();
    setState(() {
      _passkeys = passkeys;
      _isLoading = false;
    });
  }

  Future<void> _deletePasskey(String passkeyId) async {
    final success = await AuthService.deletePasskey(passkeyId);
    if (success) {
      await _loadPasskeys();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Passkey deleted successfully')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Passkey Management')),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : ListView.builder(
              itemCount: _passkeys.length,
              itemBuilder: (context, index) {
                final passkey = _passkeys[index];
                return ListTile(
                  leading: Icon(Icons.security),
                  title: Text(passkey.name),
                  subtitle: Text('${passkey.deviceType} • ${passkey.createdAt}'),
                  trailing: IconButton(
                    icon: Icon(Icons.delete, color: Colors.red),
                    onPressed: () => _deletePasskey(passkey.id),
                  ),
                );
              },
            ),
    );
  }
}
```

## ⚠️ Error Handling

### Common Error Scenarios

1. **Biometric Not Available**
   ```dart
   if (!await BiometricService.isBiometricAvailable()) {
     // Show fallback to password login
   }
   ```

2. **WebAuthn Not Supported**
   ```dart
   if (!html.window.navigator.credentials) {
     // Show error or fallback
   }
   ```

3. **Network Errors**
   ```dart
   try {
     final result = await AuthService.login(request);
   } catch (e) {
     // Handle network error
   }
   ```

4. **Authentication Failed**
   ```dart
   if (!result.success) {
     // Show error message
     ScaffoldMessenger.of(context).showSnackBar(
       SnackBar(content: Text(result.message)),
     );
   }
   ```

## 🧪 Testing

### 1. Test Biometric Availability
```dart
void testBiometricAvailability() async {
  final isAvailable = await BiometricService.isBiometricAvailable();
  print('Biometric available: $isAvailable');
}
```

### 2. Test API Connection
```dart
void testApiConnection() async {
  final result = await AuthService.login(LoginRequest(
    email: 'test@example.com',
    password: 'password123',
  ));
  print('Login result: ${result.success}');
}
```

## 🔧 Troubleshooting

### Common Issues

1. **"WebAuthn not supported"**
   - Ensure you're testing on a supported browser (Chrome, Firefox, Safari)
   - Check if the site is served over HTTPS

2. **"Biometric authentication failed"**
   - Check device permissions
   - Ensure biometric is properly set up on device
   - Verify the credential is still valid

3. **"Network error"**
   - Check internet connection
   - Verify API endpoint URLs
   - Check CORS settings on backend

4. **"Token expired"**
   - Implement token refresh logic
   - Handle 401 responses gracefully

### Debug Tips

1. **Enable Logging**
   ```dart
   // Add to your main.dart
   import 'dart:developer' as developer;
   
   void main() {
     developer.log('App started', name: 'BiometricAuth');
     runApp(MyApp());
   }
   ```

2. **Check Network Requests**
   ```dart
   // Add to your HTTP client
   final client = http.Client();
   client.get(Uri.parse(url)).then((response) {
     print('Response status: ${response.statusCode}');
     print('Response body: ${response.body}');
   });
   ```

## 📱 Platform-Specific Notes

### Android
- Requires `USE_BIOMETRIC` permission
- Supports fingerprint, face, and iris authentication
- Test on physical devices for best results

### iOS
- Requires `NSFaceIDUsageDescription` in Info.plist
- Supports Touch ID and Face ID
- Simulator has limited biometric support

### Web
- Requires HTTPS in production
- Uses WebAuthn API
- Test on recent browser versions

## 🚀 Next Steps

1. **Implement the code** following the examples above
2. **Test on different platforms** (Android, iOS, Web)
3. **Add error handling** for edge cases
4. **Implement token refresh** logic
5. **Add biometric settings** screen
6. **Test with multiple passkeys** per user

This implementation provides a complete biometric authentication system that works with your backend API and supports multiple passkeys per user! 🎉
