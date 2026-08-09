import 'package:flutter/material.dart';

void main() {
  runApp(const SeavaigFarmerApp());
}

class SeavaigFarmerApp extends StatefulWidget {
  const SeavaigFarmerApp({super.key});

  @override
  State<SeavaigFarmerApp> createState() => _SeavaigFarmerAppState();
}

class _SeavaigFarmerAppState extends State<SeavaigFarmerApp> {
  bool _isLoggedIn = false;
  String _phone = '';
  Map<String, dynamic>? _selectedAgency;

  final List<Map<String, dynamic>> _registeredAgencies = [
    {
      'id': 'agency_nashik',
      'name': 'Seavaig Agro Agency (Nashik)',
      'registeredAs': 'Ajay Jadhav',
      'location': 'Nandgaon, Nashik',
      'totalHarvest': '₹1,24,500',
      'dueAmount': '₹23,600',
      'status': 'PARTIAL_DUE',
    },
    {
      'id': 'agency_sinnar',
      'name': 'Godavari Traders (Sinnar)',
      'registeredAs': 'Jadhav Ajju',
      'location': 'Sinnar, Nashik',
      'totalHarvest': '₹45,000',
      'dueAmount': '₹0 (Clear)',
      'status': 'PAID_CLEAR',
    },
  ];

  void _handleLogin(String phone) {
    setState(() {
      _phone = phone;
      _isLoggedIn = true;
      _selectedAgency = null; // Forces Agency Selection screen upon login
    });
  }

  void _handleLogout() {
    setState(() {
      _isLoggedIn = false;
      _phone = '';
      _selectedAgency = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SEAVAIG Farmer Passbook',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF16A34A)),
        fontFamily: 'Roboto',
        useMaterial3: true,
      ),
      home: !_isLoggedIn
          ? FarmerLoginScreen(onLogin: _handleLogin)
          : _selectedAgency == null
              ? AgencySelectionScreen(
                  phone: _phone,
                  agencies: _registeredAgencies,
                  onSelectAgency: (agency) {
                    setState(() => _selectedAgency = agency);
                  },
                  onLogout: _handleLogout,
                )
              : FarmerPassbookScreen(
                  phone: _phone,
                  agency: _selectedAgency!,
                  agencies: _registeredAgencies,
                  onSwitchAgency: () {
                    setState(() => _selectedAgency = null);
                  },
                  onLogout: _handleLogout,
                ),
    );
  }
}

// 1. Farmer Login Screen (Phone + PIN)
class FarmerLoginScreen extends StatefulWidget {
  final Function(String phone) onLogin;

  const FarmerLoginScreen({super.key, required this.onLogin});

  @override
  State<FarmerLoginScreen> createState() => _FarmerLoginScreenState();
}

class _FarmerLoginScreenState extends State<FarmerLoginScreen> {
  final _phoneController = TextEditingController(text: '9823456789');
  final _pinController = TextEditingController(text: '6789');

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: Colors.green.shade200),
                ),
                child: const Icon(Icons.eco, size: 40, color: Color(0xFF16A34A)),
              ),
              const SizedBox(height: 16),
              const Text(
                'SEAVAIG Farmer Passbook',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
              ),
              const Text(
                'शेतकरी डिजिटल पासबुक व पेमेंट ट्रॅकर',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey),
              ),
              const SizedBox(height: 32),
              Card(
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      TextField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(
                          labelText: 'Mobile Phone Number / मोबाईल नंबर',
                          prefixIcon: Icon(Icons.phone),
                          border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: _pinController,
                        obscureText: true,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: '4-Digit PIN (Default: Last 4 Digits)',
                          prefixIcon: Icon(Icons.lock),
                          border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
                        ),
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton.icon(
                          onPressed: () => widget.onLogin(_phoneController.text),
                          icon: const Icon(Icons.login),
                          label: const Text('Login / लॉगिन करा', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF16A34A),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// 2. Agency Selection Screen (Multi-Tenant Selector)
class AgencySelectionScreen extends StatelessWidget {
  final String phone;
  final List<Map<String, dynamic>> agencies;
  final Function(Map<String, dynamic> agency) onSelectAgency;
  final VoidCallback onLogout;

  const AgencySelectionScreen({
    super.key,
    required this.phone,
    required this.agencies,
    required this.onSelectAgency,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Select Business Agency / व्यापारी निवडा', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.logout), onPressed: onLogout, tooltip: 'Logout'),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info, color: Colors.blue),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Mobile $phone registered with ${agencies.length} agencies on SEAVAIG Network.',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: ListView.builder(
                itemCount: agencies.length,
                itemBuilder: (context, index) {
                  final agency = agencies[index];
                  return Card(
                    elevation: 2,
                    margin: const EdgeInsets.only(bottom: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    child: InkWell(
                      onTap: () => onSelectAgency(agency),
                      borderRadius: BorderRadius.circular(16),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  agency['name'],
                                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                                ),
                                const Icon(Icons.chevron_right, color: Colors.grey),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text('Registered as: ${agency['registeredAs']} • ${agency['location']}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                            const Divider(height: 20),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Harvest: ${agency['totalHarvest']}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                Text('Due: ${agency['dueAmount']}', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: agency['dueAmount'].contains('Clear') ? Colors.green : Colors.orange)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// 3. Farmer Passbook Screen (Passbook, Receipts & 1-Tap Switcher)
class FarmerPassbookScreen extends StatelessWidget {
  final String phone;
  final Map<String, dynamic> agency;
  final List<Map<String, dynamic>> agencies;
  final VoidCallback onSwitchAgency;
  final VoidCallback onLogout;

  const FarmerPassbookScreen({
    super.key,
    required this.phone,
    required this.agency,
    required this.agencies,
    required this.onSwitchAgency,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(agency['name'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        actions: [
          TextButton.icon(
            onPressed: onSwitchAgency,
            icon: const Icon(Icons.swap_horiz, color: Colors.amber, size: 18),
            label: const Text('Switch Agency', style: TextStyle(color: Colors.amber, fontSize: 11, fontWeight: FontWeight.bold)),
          ),
          IconButton(icon: const Icon(Icons.logout), onPressed: onLogout, tooltip: 'Logout'),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Passbook Header Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF16A34A), Color(0xFF15803D)]),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(agency['registeredAs'], style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white)),
                Text('Mobile: $phone • Village: ${agency['location']}', style: const TextStyle(fontSize: 12, color: Colors.white70)),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Total Crop Harvest', style: TextStyle(fontSize: 10, color: Colors.white70)),
                        Text(agency['totalHarvest'], style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white)),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text('Outstanding Dues', style: TextStyle(fontSize: 10, color: Colors.white70)),
                        Text(agency['dueAmount'], style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.amberAccent)),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          const Text('Harvest Crop Purchases & Receipts', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: const ListTile(
              leading: Icon(Icons.receipt_long, color: Colors.green),
              title: Text('PUR-2026-1052 • Strawberry A (120 KG)'),
              subtitle: Text('Rate: ₹280/KG • Pre-Cultivation Advance Offset: ₹10,000'),
              trailing: Text('₹23,600 Due', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.orange)),
            ),
          ),
        ],
      ),
    );
  }
}
