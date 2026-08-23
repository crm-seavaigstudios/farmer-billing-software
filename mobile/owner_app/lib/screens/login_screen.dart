import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../main.dart'; // To navigate to OwnerMainScreen

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  String _currentLanguage = 'en'; // default english
  bool _isLoading = false;
  String _errorMsg = '';

  void _cycleLanguage() {
    setState(() {
      if (_currentLanguage == 'en') _currentLanguage = 'mr';
      else if (_currentLanguage == 'mr') _currentLanguage = 'hi';
      else _currentLanguage = 'en';
    });
  }

  Future<void> _handleLogin() async {
    setState(() {
      _isLoading = true;
      _errorMsg = '';
    });

    try {
      final email = _emailController.text.trim();
      final password = _passwordController.text;

      // Query Tenant table for this email and password
      final response = await Supabase.instance.client
          .from('Tenant')
          .select('*')
          .eq('ownerEmail', email)
          .eq('password', password)
          .maybeSingle();

      if (response != null) {
        // Save tenantId to shared_prefs
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('tenantId', response['id']);
        await prefs.setString('tenantName', response['companyName'] ?? response['businessName'] ?? 'Seavaig');
        await prefs.setString('tenantPrimaryColor', response['primaryColor'] ?? '#2563EB');

        if (!mounted) return;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => OwnerMainScreen(
            currentLanguage: _currentLanguage,
            onCycleLanguage: _cycleLanguage,
            tenantId: response['id'],
          )),
        );
      } else {
        setState(() {
          _errorMsg = _currentLanguage == 'mr' 
            ? 'अवैध ईमेल आयडी किंवा पासवर्ड' 
            : 'Invalid Email ID or Password';
        });
      }
    } catch (e) {
      setState(() {
        _errorMsg = e.toString();
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_currentLanguage == 'mr' ? 'सीवायग लॉगिन' : 'Seavaig Login'),
        actions: [
          TextButton(
            onPressed: _cycleLanguage,
            child: Text(
              _currentLanguage.toUpperCase(),
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          )
        ],
        backgroundColor: const Color(0xFF2563EB),
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.agriculture, size: 80, color: Color(0xFF2563EB)),
            const SizedBox(height: 24),
            Text(
              _currentLanguage == 'mr' ? 'मालक डॅशबोर्ड मध्ये आपले स्वागत आहे' : 'Welcome to Owner Dashboard',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 32),
            if (_errorMsg.isNotEmpty) ...[
              Text(_errorMsg, style: const TextStyle(color: Colors.red), textAlign: TextAlign.center),
              const SizedBox(height: 16),
            ],
            TextField(
              controller: _emailController,
              decoration: const InputDecoration(
                labelText: 'Email Address',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.email),
              ),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _passwordController,
              decoration: const InputDecoration(
                labelText: 'Password',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.lock),
              ),
              obscureText: true,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _isLoading ? null : _handleLogin,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: _isLoading 
                ? const CircularProgressIndicator(color: Colors.white)
                : Text(_currentLanguage == 'mr' ? 'लॉगिन करा' : 'SECURE LOGIN'),
            ),
          ],
        ),
      ),
    );
  }
}
